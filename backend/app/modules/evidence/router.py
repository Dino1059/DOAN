from typing import Annotated

from fastapi import APIRouter, Depends, Path
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.session import get_session
from app.modules.evidence.repository import EvidenceRepository
from app.modules.evidence.schemas import StepEvidenceOut
from app.modules.evidence.service import EvidenceService
from app.modules.evidence.storage import LocalStorage

storage = LocalStorage(settings.artifacts_dir)
router = APIRouter(tags=["evidence"])


def get_evidence_service(session: Annotated[AsyncSession, Depends(get_session)]) -> EvidenceService:
    return EvidenceService(EvidenceRepository(session), storage)


Svc = Annotated[EvidenceService, Depends(get_evidence_service)]


@router.get("/evidence/{run_id}/steps/{step_no}", response_model=Envelope[StepEvidenceOut])
async def step_evidence(run_id: str, step_no: Annotated[int, Path(ge=1)], user: CurrentUser, svc: Svc):
    return ok(await svc.for_step(user, run_id, step_no))


@router.get("/evidence/files/{artifact_id}")
async def evidence_file(artifact_id: str, user: CurrentUser, svc: Svc) -> FileResponse:
    path, media_type = await svc.open_file(user, artifact_id)
    # Bằng chứng không bao giờ đổi sau khi lưu → cho trình duyệt cache (vẫn chỉ trong phiên của user)
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "private, max-age=86400"})
