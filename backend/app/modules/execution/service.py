import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import InvalidInput, NotFound
from app.core.ids import new_id
from app.db.repository import OwnedRepository
from app.modules.environments.models import Environment
from app.modules.execution.control import RunControl
from app.modules.execution.events import RunEvents
from app.modules.execution.models import TestRun
from app.modules.execution.repository import RunRepository, StepSnapshot
from app.modules.execution.runner import RunLauncher
from app.modules.execution.schemas import (
    HumanInputIn,
    RunOut,
    RunRequest,
    RunStarted,
    RunStepOut,
)
from app.modules.execution.state_machine import InvalidTransition, ensure_transition
from app.modules.test_cases.models import TestCase
from app.modules.test_planning.repository import PlanningRepository
from app.modules.test_planning.service import PlanningService

_SECRET_RE = re.compile(r"\b(otp|code|password|passcode|pin|token|secret)\b", re.I)
DEFAULT_SUITE = "E2E Test Suite"
_BROWSER_LABELS = {"chromium": "Chromium", "firefox": "Firefox", "webkit": "WebKit", "headless_node": "Headless Node"}


class ExecutionService:
    def __init__(
        self,
        session: AsyncSession,
        planning: PlanningService,
        launcher: RunLauncher,
        control: RunControl,
        events: RunEvents,
    ) -> None:
        self.session = session
        self.repo = RunRepository(session)
        self.planning = planning
        self.launcher = launcher
        self.control = control
        self.events = events

    # ---------- Bắt đầu chạy (Confirm & Run, Re-run) ----------

    async def start(self, user: CurrentUserInfo, req: RunRequest) -> RunStarted:
        plan_id = req.resolved_plan_id
        test_case_id = None
        config = req.run_config()
        if plan_id:
            plan = await self.planning.approve(user, plan_id)  # khoá plan; không phải của mình → 404
            steps = [(s.action, s.selector, s.expected) for s in plan.steps]
            name = plan.objective
            if plan.test_data:
                # Runner thật (M4) cần test_data để User Simulator điền form; giữ trong config
                # để Re-run dùng lại ĐÚNG dữ liệu này, không phụ thuộc plan lúc rerun có còn hay đã đổi.
                config = {**config, "test_data": plan.test_data}
        elif req.test_case_id:
            test_case = await self._resolve_test_case(user.id, req.test_case_id)
            steps = [(s["action"], s["selector"], s.get("expected", "")) for s in test_case.steps]
            name = test_case.name
            test_case_id = test_case.id
        elif req.steps:
            steps = [(s.action, s.selector, s.expected) for s in req.steps]
            name = req.name or req.prompt_text or "Ad-hoc test run"
        elif req.task_id:
            raise NotFound("Test plan not found", code="PLAN_NOT_FOUND")
        else:
            raise InvalidInput("Generate a test plan first: plan_id or steps is required", code="PLAN_REQUIRED")
        if not steps:
            raise InvalidInput("The test plan has no steps", code="PLAN_EMPTY")

        return await self._create_and_launch(
            user, name=name, steps=steps, plan_id=plan_id, test_case_id=test_case_id, rerun_of=None,
            environment_id=req.environment_id, config=config,
        )

    async def rerun(self, user: CurrentUserInfo, run_id: str) -> RunStarted:
        """Chạy lại ĐÚNG các bước của run cũ (không phải plan hiện tại, có thể đã có phiên bản mới)."""
        old = await self._get(user, run_id)
        return await self._create_and_launch(
            user, name=old.name, steps=[(s.action, s.selector, s.expected) for s in old.steps],
            plan_id=old.plan_id, test_case_id=old.test_case_id, rerun_of=old.id, environment_id=old.environment_id,
            config={k: v for k, v in old.config.items() if k != "runner"},
        )

    async def _create_and_launch(
        self, user, *, name, steps, plan_id, test_case_id, rerun_of, environment_id, config
    ) -> RunStarted:
        env = await self._resolve_environment(user.id, environment_id)
        label = _BROWSER_LABELS.get(env.browser, "Chromium") if env else "Chromium"
        browser = f"Simulated {label}" if self.launcher.runner_name == "simulated" else label
        run = await self.repo.create_run(
            TestRun(
                id=new_id("RUN"), owner_id=user.id, plan_id=plan_id, test_case_id=test_case_id, rerun_of=rerun_of,
                environment_id=environment_id, name=name[:200], suite=DEFAULT_SUITE,
                environment_name=env.name if env else None,
                browser=browser,
                config={**config, "runner": self.launcher.runner_name}, status="queued",
            ),
            steps,
        )
        if plan_id:
            label = f"Re-run of {rerun_of}" if rerun_of else "Test run"
            await self.planning.note_run(
                user.id, plan_id, run.id, "run_started", f"{label} {run.id} started ({len(steps)} steps)."
            )
        # Commit TRƯỚC khi giao cho runner: runner dùng session riêng, phải thấy được run này.
        await self.session.commit()
        run_env = {
            "headless": config.get("headless", env.headless if env else True),
            "viewport": {"width": env.viewport_width, "height": env.viewport_height} if env else None,
            "test_data": config.get("test_data", {}),
        }
        self.launcher.launch(
            run.id, [StepSnapshot(s.id, s.step_no, s.action, s.selector, s.expected) for s in run.steps], run_env
        )
        return RunStarted(task_id=run.id, run_id=run.id, status="queued", message=f"Task started. ID: {run.id}")

    # ---------- Đọc ----------

    async def get(self, user: CurrentUserInfo, run_id: str) -> RunOut:
        run = await self._get(user, run_id)
        pending = await self.repo.pending_intervention(run.id)
        return _run_out(run, pending.question if pending else None)

    # ---------- Điều khiển ----------

    async def pause(self, user: CurrentUserInfo, run_id: str) -> RunOut:
        return await self._command(user, run_id, "pause", "paused")

    async def resume(self, user: CurrentUserInfo, run_id: str) -> RunOut:
        return await self._command(user, run_id, "resume", "running", require="paused")

    async def cancel(self, user: CurrentUserInfo, run_id: str) -> RunOut:
        return await self._command(user, run_id, "cancel", "cancelled")

    async def _command(self, user, run_id: str, command, target: str, require: str | None = None) -> RunOut:
        run = await self._get(user, run_id, lock=True)
        if require and run.status != require:
            # vd: Resume khi đang chờ OTP → phải trả lời, không phải resume
            raise InvalidTransition(f"Cannot {command} a run that is '{run.status}'")
        ensure_transition(run.status, target)  # sai luật → 409
        run = await self.repo.set_status(run, target)
        if target == "cancelled" and run.plan_id:
            await self.planning.note_run(user.id, run.plan_id, run.id, "run_status", f"Test run {run.id} was stopped.")
        await self.session.commit()  # DB trước, rồi mới báo runner (runner đọc DB ngay sau đó)
        await self.control.send(run_id, command)
        await self.events.publish(run_id, {"type": "status", "status": target})
        return _run_out(run, None)

    async def provide_human_input(self, user: CurrentUserInfo, run_id: str, body: HumanInputIn) -> RunOut:
        run = await self._get(user, run_id, lock=True)
        pending = await self.repo.pending_intervention(run.id)
        if run.status not in ("waiting_human_input", "waiting_human_approval") or pending is None:
            raise InvalidTransition(f"Run is not waiting for human input (status: {run.status})", code="NOT_WAITING_FOR_INPUT")

        if run.status == "waiting_human_input":
            if body.action != "provide_input" or not body.input_text:
                raise InvalidInput("input_text is required", code="INPUT_REQUIRED")
            answer, decision, target, command = _mask(pending.question, body.input_text), None, "running", "human_input"
        else:
            if body.action not in ("approve", "reject"):
                raise InvalidInput("action must be 'approve' or 'reject'", code="DECISION_REQUIRED")
            approved = body.action == "approve"
            answer = body.input_text or None
            decision = "approved" if approved else "rejected"
            target, command = ("running", "human_input") if approved else ("cancelled", "cancel")

        await self.repo.answer_intervention(pending, answer=answer, decision=decision, user_id=user.id)
        run = await self.repo.set_status(run, target)
        await self.session.commit()
        # Câu trả lời THẬT chỉ đi qua bộ nhớ tới runner, DB chỉ giữ bản đã che.
        await self.control.send(run_id, command, body.input_text or decision)
        await self.events.publish(run_id, {"type": "status", "status": target})
        return _run_out(run, None)

    # ---------- helpers ----------

    async def _resolve_environment(self, owner_id: str, environment_id: str | None) -> Environment | None:
        if environment_id is None:
            return None
        return await OwnedRepository(Environment, self.session).get(environment_id, owner_id)

    async def _resolve_test_case(self, owner_id: str, test_case_id: str) -> TestCase:
        test_case = await OwnedRepository(TestCase, self.session).get(test_case_id, owner_id)
        if test_case is None:
            raise NotFound("Test case not found", code="TEST_CASE_NOT_FOUND")
        return test_case

    async def _get(self, user: CurrentUserInfo, run_id: str, *, lock: bool = False) -> TestRun:
        run = await self.repo.get_owned(run_id, user.id, lock=lock)
        if run is None:
            raise NotFound("Test run not found", code="RUN_NOT_FOUND")
        return run


async def note_run_finished(session: AsyncSession, run: TestRun) -> None:
    """Hook của RunStore: run kết thúc → ghi tin "Test status" vào phiên chat của plan."""
    if not run.plan_id:
        return
    passed = sum(1 for s in run.steps if s.status == "passed")
    text = f"Test run {run.id} {run.status}: {passed}/{len(run.steps)} steps passed."
    if run.error_message:
        text += f" {run.error_message}"
    await PlanningService(PlanningRepository(session), planner=None).note_run(
        run.owner_id, run.plan_id, run.id, "run_status", text
    )


def _mask(question: str, answer: str) -> str:
    """OTP, mật khẩu... không lưu nguyên văn: '123456' → '••••56'."""
    if not _SECRET_RE.search(question):
        return answer
    return "••••" + (answer[-2:] if len(answer) > 4 else "")


def _run_out(run: TestRun, human_prompt: str | None) -> RunOut:
    return RunOut(
        id=run.id,
        task_id=run.id,
        status=run.status,
        name=run.name,
        runner=run.config.get("runner", "simulated"),
        plan_id=run.plan_id,
        test_case_id=run.test_case_id,
        rerun_of=run.rerun_of,
        current_step=run.current_step,
        total_steps=len(run.steps),
        human_prompt=human_prompt,
        error_message=run.error_message,
        created_at=run.created_at,
        started_at=run.started_at,
        finished_at=run.finished_at,
        steps=[
            RunStepOut(
                id=s.step_no, step_no=s.step_no, action=s.action, selector=s.selector, expected=s.expected,
                status=s.status, observation=s.observation, started_at=s.started_at, duration_ms=s.duration_ms,
            )
            for s in run.steps
        ],
    )
