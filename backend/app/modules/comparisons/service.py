import secrets
from datetime import datetime, timezone

from app.core.crud_service import CrudService
from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import Conflict, InvalidInput, NotFound
from app.modules.comparisons.models import Comparison
from app.modules.comparisons.repository import ComparisonsRepository
from app.modules.comparisons.schemas import (
    ApiCheck,
    ApiDiffOut,
    ComparisonDetailOut,
    ComparisonIn,
    ComparisonOut,
    ComparisonResult,
    RunSummary,
    StepDiffOut,
)
from app.modules.evidence.repository import EvidenceRepository
from app.modules.execution.models import TestRun
from app.modules.test_runs.repository import TestRunsRepository
from app.modules.test_runs.service import format_duration

_RESULT_LABELS = {"completed": "Passed", "failed": "Failed", "cancelled": "Cancelled"}


class ComparisonService(CrudService[Comparison]):
    model = Comparison
    id_prefix = "CMP"
    not_found_message = "Comparison not found"

    def __init__(
        self, repo, extra_repo: ComparisonsRepository, runs: TestRunsRepository, evidence: EvidenceRepository
    ) -> None:
        super().__init__(repo)
        self.extra_repo = extra_repo
        self.runs = runs
        self.evidence = evidence

    async def diff(self, user: CurrentUserInfo, run_a_id: str, run_b_id: str) -> ComparisonResult:
        if run_a_id == run_b_id:
            raise InvalidInput("Cannot compare a run with itself", code="SAME_RUN")
        run_a = await self._get_run(user.id, run_a_id)
        run_b = await self._get_run(user.id, run_b_id)
        return await self._compute(run_a, run_b)

    async def create(self, user: CurrentUserInfo, data: ComparisonIn) -> Comparison:
        await self.diff(user, data.run_a_id, data.run_b_id)  # 422/404 trước khi lưu
        if await self.extra_repo.pair_exists(user.id, data.run_a_id, data.run_b_id):
            raise Conflict("This run pair is already saved", code="COMPARISON_EXISTS")
        return await super().create(user, data)

    async def get_detail(self, user: CurrentUserInfo, comparison_id: str) -> ComparisonDetailOut:
        comparison = await self.get_or_404(user, comparison_id)
        result = await self.diff(user, comparison.run_a_id, comparison.run_b_id)
        return ComparisonDetailOut(**ComparisonOut.model_validate(comparison).model_dump(), result=result)

    async def share(self, user: CurrentUserInfo, comparison_id: str) -> str:
        comparison = await self.get_or_404(user, comparison_id)
        if not comparison.share_token:
            comparison.share_token = secrets.token_urlsafe(16)
            await self.repo.session.flush()
        return comparison.share_token

    async def unshare(self, user: CurrentUserInfo, comparison_id: str) -> None:
        comparison = await self.get_or_404(user, comparison_id)
        comparison.share_token = None
        await self.repo.session.flush()

    async def get_shared(self, token: str) -> ComparisonResult:
        comparison = await self.extra_repo.get_by_token(token)
        if comparison is None:
            raise NotFound("Comparison not found", code="COMPARISON_NOT_FOUND")
        run_a = await self.runs.get_owned(comparison.run_a_id, comparison.owner_id)
        run_b = await self.runs.get_owned(comparison.run_b_id, comparison.owner_id)
        return await self._compute(run_a, run_b)

    # ---------- helpers ----------

    async def _get_run(self, owner_id: str, run_id: str) -> TestRun:
        run = await self.runs.get_owned(run_id, owner_id)
        if run is None:
            raise NotFound("Test run not found", code="RUN_NOT_FOUND")
        return run

    async def _compute(self, run_a: TestRun, run_b: TestRun) -> ComparisonResult:
        a_label = _RESULT_LABELS.get(run_a.status, run_a.status.title())
        b_label = _RESULT_LABELS.get(run_b.status, run_b.status.title())

        steps_a = {s.step_no: s for s in run_a.steps}
        steps_b = {s.step_no: s for s in run_b.steps}
        step_nos = sorted(set(steps_a) | set(steps_b))

        step_diffs: list[StepDiffOut] = []
        changed = 0
        for step_no in step_nos:
            sa, sb = steps_a.get(step_no), steps_b.get(step_no)
            is_changed = (
                sa is None or sb is None
                or sa.status != sb.status or (sa.observation or "") != (sb.observation or "")
            )
            changed += is_changed
            either = sa or sb
            step_diffs.append(StepDiffOut(
                step_no=step_no, action=either.action if either else None,
                a_status=sa.status if sa else None, b_status=sb.status if sb else None,
                a_observation=sa.observation if sa else None, b_observation=sb.observation if sb else None,
                changed=is_changed,
            ))

        api_diff: list[ApiDiffOut] = []
        for step_no in step_nos:
            a_check = await self._api_check(run_a.id, step_no) if step_no in steps_a else None
            b_check = await self._api_check(run_b.id, step_no) if step_no in steps_b else None
            if a_check is None and b_check is None:
                continue
            api_diff.append(ApiDiffOut(step_no=step_no, changed=a_check != b_check, a=a_check, b=b_check))

        return ComparisonResult(
            run_a=RunSummary(id=run_a.id, name=run_a.name, status=run_a.status, duration=format_duration(run_a)),
            run_b=RunSummary(id=run_b.id, name=run_b.name, status=run_b.status, duration=format_duration(run_b)),
            result=f"{a_label} -> {b_label}",
            time_difference=_format_time_diff(run_a, run_b),
            changed_steps=f"{changed} / {len(step_nos)}",
            visual_difference=await self._visual_difference(run_a, run_b),
            steps=step_diffs,
            api_diff=api_diff,
        )

    async def _api_check(self, run_id: str, step_no: int) -> ApiCheck | None:
        for item in await self.evidence.list_for_step(run_id, step_no):
            if item.kind == "network" and item.payload and item.payload.get("api_check"):
                check = item.payload["api_check"]
                return ApiCheck(status_code=check.get("status_code"), response_body=check.get("response_body"))
        return None

    async def _visual_difference(self, run_a: TestRun, run_b: TestRun) -> str:
        if run_b.rerun_of != run_a.id and run_a.rerun_of != run_b.id:
            return "No visual diff data (B is not a Re-run of A)"
        later_run = run_b if run_b.rerun_of == run_a.id else run_a
        regions = 0
        for step in later_run.steps:
            for item in await self.evidence.list_for_step(later_run.id, step.step_no):
                if item.kind == "visual_diff" and item.payload and item.payload.get("diff_percent", 0) > 0:
                    regions += 1
        return f"{regions} region(s)" if regions else "No visual difference"


def _format_time_diff(run_a: TestRun, run_b: TestRun) -> str:
    def seconds(run: TestRun) -> float:
        if not run.started_at:
            return 0.0
        end = run.finished_at or datetime.now(timezone.utc)
        return (end - run.started_at).total_seconds()

    diff = seconds(run_b) - seconds(run_a)
    sign = "+" if diff >= 0 else "-"
    return f"{sign}{abs(diff):.1f}s"
