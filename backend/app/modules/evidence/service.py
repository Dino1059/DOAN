import asyncio
import logging
import mimetypes
from collections.abc import Callable
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.protocol import Artifact
from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import NotFound
from app.core.ids import new_id
from app.modules.evidence import visual_diff
from app.modules.evidence.masking import mask_secrets
from app.modules.evidence.models import EvidenceArtifact
from app.modules.evidence.repository import EvidenceRepository
from app.modules.evidence.schemas import EvidenceOut, StepEvidenceOut
from app.modules.evidence.storage import LocalStorage

log = logging.getLogger(__name__)


class EvidenceRecorder:
    """Phía runner (orchestrator M4 / SimulatedRunner): lưu bằng chứng sau mỗi bước, session riêng, commit ngay."""

    def __init__(self, session_factory: Callable[[], AsyncSession], storage: LocalStorage) -> None:
        self._factory = session_factory
        self.storage = storage

    async def record(self, run_id: str, step_id: str, step_no: int, artifacts: list[Artifact]) -> None:
        async with self._factory() as session:
            repo = EvidenceRepository(session)
            for artifact in artifacts:
                artifact_id = new_id("EVD")
                key = None
                if artifact.data:
                    key = self.storage.save(f"runs/{run_id}/step-{step_no:02d}-{artifact.kind}-{artifact_id}.png", artifact.data)
                payload = mask_secrets(artifact.payload) if artifact.payload is not None else None
                await repo.add(step_id, artifact.kind, payload=payload, storage_key=key, artifact_id=artifact_id)

                if artifact.kind == "screenshot" and artifact.data:
                    await self._visual_diff(repo, run_id, step_id, step_no, artifact.data)
            await session.commit()

    async def _visual_diff(self, repo: EvidenceRepository, run_id: str, step_id: str, step_no: int, png: bytes) -> None:
        """Run là Re-run → so ảnh bước này với ảnh cùng bước của run gốc (baseline)."""
        baseline_run = await repo.rerun_of(run_id)
        if not baseline_run:
            return
        baseline = await repo.screenshot_key(baseline_run, step_no)
        if not baseline:
            return
        baseline_id, baseline_key = baseline
        try:
            baseline_png = self.storage.read(baseline_key)
            result = await asyncio.to_thread(visual_diff.compare, baseline_png, png)
        except (OSError, ValueError) as exc:  # file baseline mất / ảnh hỏng: bỏ qua diff, không làm hỏng run
            log.warning("Visual diff skipped for %s step %s: %s", run_id, step_no, exc)
            return
        diff_id = new_id("EVD")
        key = self.storage.save(f"runs/{run_id}/step-{step_no:02d}-visual_diff-{diff_id}.png", result.diff_png)
        await repo.add(
            step_id, "visual_diff", artifact_id=diff_id, storage_key=key,
            payload={
                "baseline_run_id": baseline_run,
                "baseline_artifact_id": baseline_id,
                "diff_percent": result.diff_percent,
                "size_changed": result.size_changed,
            },
        )


class EvidenceService:
    """Phía API: đọc bằng chứng của 1 bước, trả file ảnh. Chỉ chủ run mới xem được."""

    def __init__(self, repo: EvidenceRepository, storage: LocalStorage) -> None:
        self.repo = repo
        self.storage = storage

    async def for_step(self, user: CurrentUserInfo, run_id: str, step_no: int) -> StepEvidenceOut:
        if await self.repo.run_owned(run_id, user.id) is None:
            raise NotFound("Test run not found", code="RUN_NOT_FOUND")
        items = await self.repo.list_for_step(run_id, step_no)
        return StepEvidenceOut(run_id=run_id, step_no=step_no, items=[_out(i) for i in items])

    async def open_file(self, user: CurrentUserInfo, artifact_id: str) -> tuple[Path, str]:
        item = await self.repo.get_owned(artifact_id, user.id)
        if item is None or not item.storage_key:
            raise NotFound("Evidence file not found", code="EVIDENCE_NOT_FOUND")
        try:
            path = self.storage.path(item.storage_key)
        except (FileNotFoundError, ValueError) as exc:
            raise NotFound("Evidence file is missing from storage", code="EVIDENCE_NOT_FOUND") from exc
        return path, mimetypes.guess_type(path.name)[0] or "application/octet-stream"


def _out(item: EvidenceArtifact) -> EvidenceOut:
    return EvidenceOut(
        id=item.id,
        kind=item.kind,
        payload=item.payload,
        file_url=f"/evidence/files/{item.id}" if item.storage_key else None,
        created_at=item.created_at,
    )
