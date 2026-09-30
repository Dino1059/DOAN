import logging
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import new_id
from app.db.repository import OwnedRepository
from app.modules.execution.control import RunCancelled
from app.modules.execution.models import RunIntervention, TestRun, TestRunStep
from app.modules.execution.state_machine import TERMINAL, can_transition, ensure_transition

log = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class StepSnapshot:
    """Bước giao cho runner (không phải ORM object, để runner không phụ thuộc session nào)."""

    id: str
    step_no: int
    action: str
    selector: str
    expected: str


class RunRepository:
    """Truy cập test_runs / test_run_steps / run_interventions trong 1 session (1 request)."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.runs = OwnedRepository(TestRun, session)

    # ----- tạo & đọc -----

    async def create_run(self, run: TestRun, steps: list[tuple[str, str, str]]) -> TestRun:
        """Tạo run + CHÉP các bước trong cùng transaction."""
        run.steps = [
            TestRunStep(id=new_id("RST"), step_no=no, action=a, selector=s, expected=e)
            for no, (a, s, e) in enumerate(steps, start=1)
        ]
        await self.runs.add(run)
        await self.session.refresh(run)
        return run

    async def get_owned(self, run_id: str, owner_id: str, *, lock: bool = False) -> TestRun | None:
        stmt = select(TestRun).where(TestRun.id == run_id, TestRun.owner_id == owner_id)
        if lock:
            stmt = stmt.with_for_update()
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def _get_locked(self, run_id: str) -> TestRun:
        stmt = select(TestRun).where(TestRun.id == run_id).with_for_update()
        return (await self.session.execute(stmt)).scalar_one()

    async def pending_intervention(self, run_id: str) -> RunIntervention | None:
        stmt = select(RunIntervention).where(RunIntervention.run_id == run_id, RunIntervention.answered_at.is_(None))
        return (await self.session.execute(stmt)).scalar_one_or_none()

    # ----- đổi trạng thái -----

    async def set_status(self, run: TestRun, target: str, **fields: Any) -> TestRun:
        """Đổi status theo state machine. run phải được đọc kèm lock (FOR UPDATE)."""
        ensure_transition(run.status, target)
        values: dict[str, Any] = {"status": target, **fields}
        if target == "running" and run.started_at is None:
            values["started_at"] = utcnow()
        if target in TERMINAL:
            values["finished_at"] = utcnow()
            # Bước chưa chạy xong thì đánh dấu skipped (runner sẽ không ghi đè: xem finish_step)
            await self.session.execute(
                update(TestRunStep)
                .where(TestRunStep.run_id == run.id, TestRunStep.status.in_(("pending", "running")))
                .values(status="skipped")
            )
            # Câu hỏi đang chờ (nếu có) coi như đóng, không ai trả lời
            await self.session.execute(
                update(RunIntervention)
                .where(RunIntervention.run_id == run.id, RunIntervention.answered_at.is_(None))
                .values(answered_at=utcnow())
            )
        for key, value in values.items():
            setattr(run, key, value)
        await self.session.flush()
        await self.session.refresh(run)  # nạp lại steps vừa đổi bằng UPDATE
        return run

    async def open_intervention(self, run_id: str, step_id: str | None, kind: str, question: str) -> RunIntervention:
        item = RunIntervention(id=new_id("INT"), run_id=run_id, step_id=step_id, kind=kind, question=question)
        self.session.add(item)
        await self.session.flush()
        return item

    async def answer_intervention(
        self, item: RunIntervention, *, answer: str | None, decision: str | None, user_id: str
    ) -> None:
        item.answer = answer
        item.decision = decision
        item.answered_by = user_id
        item.answered_at = utcnow()
        await self.session.flush()

    async def fail_orphaned_runs(self) -> int:
        """Server tắt giữa lúc chạy → runner trong RAM đã mất. Đánh dấu failed để không kẹt mãi."""
        orphan_ids = select(TestRun.id).where(TestRun.status.not_in(TERMINAL))
        await self.session.execute(
            update(TestRunStep)
            .where(TestRunStep.run_id.in_(orphan_ids), TestRunStep.status.in_(("pending", "running")))
            .values(status="skipped")
        )
        await self.session.execute(
            update(RunIntervention)
            .where(RunIntervention.run_id.in_(orphan_ids), RunIntervention.answered_at.is_(None))
            .values(answered_at=func.now())
        )
        result = await self.session.execute(
            update(TestRun)
            .where(TestRun.status.not_in(TERMINAL))
            .values(status="failed", finished_at=func.now(), error_message="Server restarted while the run was in progress")
        )
        return result.rowcount or 0


class RunStore:
    """Phía runner: mỗi thao tác mở 1 session ngắn và commit ngay, để API/SSE thấy kết quả tức thì.

    Run đã kết thúc (vd: user bấm Stop) → ném RunCancelled để runner dừng, không ghi đè.
    """

    def __init__(self, session_factory: Callable[[], AsyncSession], on_finished=None, evidence=None) -> None:
        self._factory = session_factory
        self._on_finished = on_finished  # (session, run) -> None: ghi tin "Test status" vào phiên chat
        self._evidence = evidence  # EvidenceRecorder (M6) hoặc None

    async def save_evidence(self, run_id: str, step: StepSnapshot, artifacts: list) -> None:
        """Lưu bằng chứng của 1 bước. Lỗi lưu evidence KHÔNG được làm hỏng lần chạy test."""
        if not self._evidence or not artifacts:
            return
        try:
            await self._evidence.record(run_id, step.id, step.step_no, artifacts)
        except Exception:
            log.exception("Could not save evidence for %s step %s", run_id, step.step_no)

    async def advance(self, run_id: str, target: str, **fields: Any) -> bool:
        """Chuyển trạng thái nếu hợp lệ lúc này. False = đang bị pause, runner chờ rồi thử lại."""
        async with self._factory() as session:
            repo = RunRepository(session)
            run = await repo._get_locked(run_id)
            if run.status in TERMINAL:
                raise RunCancelled(run_id)
            if not can_transition(run.status, target):
                return False
            await repo.set_status(run, target, **fields)
            if target in TERMINAL and self._on_finished:
                await self._on_finished(session, run)
            await session.commit()
            return True

    async def start_step(self, run_id: str, step: StepSnapshot) -> None:
        async with self._factory() as session:
            run = await RunRepository(session)._get_locked(run_id)
            if run.status in TERMINAL:
                raise RunCancelled(run_id)
            run.current_step = step.step_no
            await session.execute(
                update(TestRunStep).where(TestRunStep.id == step.id).values(status="running", started_at=utcnow())
            )
            await session.commit()

    async def finish_step(self, step_id: str, status: str, observation: str, duration_ms: int) -> None:
        async with self._factory() as session:
            # Chỉ ghi khi bước còn 'running': Stop giữa chừng đã đổi nó thành skipped thì giữ nguyên.
            await session.execute(
                update(TestRunStep)
                .where(TestRunStep.id == step_id, TestRunStep.status == "running")
                .values(status=status, observation=observation, duration_ms=duration_ms)
            )
            await session.commit()

    async def ask_human(self, run_id: str, step_id: str, question: str) -> bool:
        async with self._factory() as session:
            repo = RunRepository(session)
            run = await repo._get_locked(run_id)
            if run.status in TERMINAL:
                raise RunCancelled(run_id)
            if not can_transition(run.status, "waiting_human_input"):
                return False
            await repo.open_intervention(run_id, step_id, "input", question)
            await repo.set_status(run, "waiting_human_input")
            await session.commit()
            return True

    async def fail(self, run_id: str, message: str) -> bool:
        async with self._factory() as session:
            repo = RunRepository(session)
            run = await repo._get_locked(run_id)
            if run.status in TERMINAL:
                return False
            await repo.set_status(run, "failed", error_message=message[:500])
            if self._on_finished:
                await self._on_finished(session, run)
            await session.commit()
            return True
