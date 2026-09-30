from datetime import datetime, timezone

from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import NotFound
from app.modules.execution.models import TestRun
from app.modules.test_runs.repository import DEFAULT_ENV, ENV_COLUMN, TestRunsRepository
from app.modules.test_runs.schemas import (
    FilterOptions,
    InterventionOut,
    RunDetail,
    RunDetailStep,
    RunHistoryItem,
    RunListQuery,
    RunPage,
)


class TestRunsService:
    __test__ = False

    def __init__(self, repo: TestRunsRepository) -> None:
        self.repo = repo

    async def list(self, user: CurrentUserInfo, query: RunListQuery) -> RunPage:
        rows, total = await self.repo.search(user.id, query)
        return RunPage(
            items=[_item(run, passed, failed) for run, passed, failed in rows],
            total=total,
            page=query.page,
            page_size=query.page_size,
        )

    async def filter_options(self, user: CurrentUserInfo) -> FilterOptions:
        return FilterOptions(
            statuses=await self.repo.distinct_values(user.id, TestRun.status),
            suites=await self.repo.distinct_values(user.id, TestRun.suite),
            envs=await self.repo.distinct_values(user.id, ENV_COLUMN),
            browsers=await self.repo.distinct_values(user.id, TestRun.browser),
        )

    async def detail(self, user: CurrentUserInfo, run_id: str) -> RunDetail:
        run = await self.repo.get_owned(run_id, user.id)
        if run is None:
            raise NotFound("Test run not found", code="RUN_NOT_FOUND")
        passed = sum(1 for s in run.steps if s.status == "passed")
        failed = sum(1 for s in run.steps if s.status == "failed")
        return RunDetail(
            **_item(run, passed, failed).model_dump(),
            runner=run.config.get("runner", "simulated"),
            plan_id=run.plan_id,
            rerun_of=run.rerun_of,
            error_message=run.error_message,
            started_at=run.started_at,
            finished_at=run.finished_at,
            steps=[
                RunDetailStep(
                    id=s.step_no, step_no=s.step_no, action=s.action, selector=s.selector, expected=s.expected,
                    status=s.status, observation=s.observation, started_at=s.started_at, duration_ms=s.duration_ms,
                )
                for s in run.steps
            ],
            interventions=[
                InterventionOut(
                    step_no=step_no, kind=i.kind, question=i.question, answer=i.answer, decision=i.decision,
                    asked_at=i.asked_at, answered_at=i.answered_at,
                )
                for i, step_no in await self.repo.interventions(run.id)
            ],
        )


def format_duration(run: TestRun) -> str:
    """'3.1s', '2m 05s'. Run đang chạy tính tới hiện tại; chưa bắt đầu → '0.0s'."""
    if not run.started_at:
        return "0.0s"
    seconds = ((run.finished_at or datetime.now(timezone.utc)) - run.started_at).total_seconds()
    if seconds < 60:
        return f"{seconds:.1f}s"
    minutes, rest = divmod(int(seconds), 60)
    return f"{minutes}m {rest:02d}s"


def _item(run: TestRun, passed: int, failed: int) -> RunHistoryItem:
    return RunHistoryItem(
        run_id=run.id,
        task_id=run.id,
        name=run.name,
        suite=run.suite,
        env=run.environment_name or DEFAULT_ENV,
        browser=run.browser,
        status=run.status,
        duration=format_duration(run),
        created_at=run.created_at,
        passed_steps=passed,
        failed_steps=failed,
    )
