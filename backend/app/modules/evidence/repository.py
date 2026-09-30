from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ids import new_id
from app.modules.evidence.models import EvidenceArtifact
from app.modules.execution.models import TestRun, TestRunStep


class EvidenceRepository:
    """Quyền sở hữu kiểm tra qua run: evidence → bước → run.owner_id."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, step_id: str, kind: str, *, payload: dict | None = None, storage_key: str | None = None,
                  artifact_id: str | None = None) -> EvidenceArtifact:
        item = EvidenceArtifact(
            id=artifact_id or new_id("EVD"), step_id=step_id, kind=kind, payload=payload, storage_key=storage_key
        )
        self.session.add(item)
        await self.session.flush()
        return item

    async def run_owned(self, run_id: str, owner_id: str) -> TestRun | None:
        stmt = select(TestRun).where(TestRun.id == run_id, TestRun.owner_id == owner_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list_for_step(self, run_id: str, step_no: int) -> list[EvidenceArtifact]:
        stmt = (
            select(EvidenceArtifact)
            .join(TestRunStep, TestRunStep.id == EvidenceArtifact.step_id)
            .where(TestRunStep.run_id == run_id, TestRunStep.step_no == step_no)
            .order_by(EvidenceArtifact.created_at, EvidenceArtifact.id)
        )
        return list((await self.session.execute(stmt)).scalars())

    async def get_owned(self, artifact_id: str, owner_id: str) -> EvidenceArtifact | None:
        stmt = (
            select(EvidenceArtifact)
            .join(TestRunStep, TestRunStep.id == EvidenceArtifact.step_id)
            .join(TestRun, TestRun.id == TestRunStep.run_id)
            .where(EvidenceArtifact.id == artifact_id, TestRun.owner_id == owner_id)
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def rerun_of(self, run_id: str) -> str | None:
        return await self.session.scalar(select(TestRun.rerun_of).where(TestRun.id == run_id))

    async def screenshot_key(self, run_id: str, step_no: int) -> tuple[str, str] | None:
        """(artifact_id, storage_key) ảnh chụp của 1 bước — làm baseline cho Visual Diff."""
        stmt = (
            select(EvidenceArtifact.id, EvidenceArtifact.storage_key)
            .join(TestRunStep, TestRunStep.id == EvidenceArtifact.step_id)
            .where(TestRunStep.run_id == run_id, TestRunStep.step_no == step_no,
                   EvidenceArtifact.kind == "screenshot", EvidenceArtifact.storage_key.is_not(None))
            .order_by(EvidenceArtifact.created_at.desc())
            .limit(1)
        )
        row = (await self.session.execute(stmt)).first()
        return (row[0], row[1]) if row else None
