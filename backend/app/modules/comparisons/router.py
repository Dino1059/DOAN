from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.repository import OwnedRepository
from app.db.session import get_session
from app.modules.comparisons.models import Comparison
from app.modules.comparisons.repository import ComparisonsRepository
from app.modules.comparisons.schemas import ComparisonDetailOut, ComparisonIn, ComparisonOut, ComparisonResult, ShareOut
from app.modules.comparisons.service import ComparisonService
from app.modules.evidence.repository import EvidenceRepository
from app.modules.test_runs.repository import TestRunsRepository

router = APIRouter(prefix="/comparisons", tags=["comparisons"])
public_router = APIRouter(tags=["comparisons"])


def get_comparison_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ComparisonService:
    return ComparisonService(
        OwnedRepository(Comparison, session), ComparisonsRepository(session),
        TestRunsRepository(session), EvidenceRepository(session),
    )


Svc = Annotated[ComparisonService, Depends(get_comparison_service)]


@router.get("/diff", response_model=Envelope[ComparisonResult])
async def diff_runs(user: CurrentUser, svc: Svc, run_a: str = Query(...), run_b: str = Query(...)):
    return ok(await svc.diff(user, run_a, run_b))


@router.get("", response_model=Envelope[list[ComparisonOut]])
async def list_comparisons(user: CurrentUser, svc: Svc):
    return ok([ComparisonOut.model_validate(c) for c in await svc.list(user)])


@router.post("", status_code=201, response_model=Envelope[ComparisonOut])
async def save_comparison(payload: ComparisonIn, user: CurrentUser, svc: Svc):
    return ok(ComparisonOut.model_validate(await svc.create(user, payload)))


@router.get("/{comparison_id}", response_model=Envelope[ComparisonDetailOut])
async def get_comparison(comparison_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.get_detail(user, comparison_id))


@router.delete("/{comparison_id}", status_code=204)
async def delete_comparison(comparison_id: str, user: CurrentUser, svc: Svc) -> None:
    await svc.delete(user, comparison_id)


@router.post("/{comparison_id}/share", response_model=Envelope[ShareOut])
async def share_comparison(comparison_id: str, user: CurrentUser, svc: Svc):
    token = await svc.share(user, comparison_id)
    return ok(ShareOut(share_token=token, share_path=f"/shared/comparisons/{token}"))


@router.delete("/{comparison_id}/share", status_code=204)
async def unshare_comparison(comparison_id: str, user: CurrentUser, svc: Svc) -> None:
    await svc.unshare(user, comparison_id)


@public_router.get("/shared/comparisons/{token}", response_model=Envelope[ComparisonResult])
async def get_shared_comparison(token: str, session: Annotated[AsyncSession, Depends(get_session)]):
    """Xem so sánh qua link chia sẻ — không cần đăng nhập."""
    svc = ComparisonService(
        OwnedRepository(Comparison, session), ComparisonsRepository(session),
        TestRunsRepository(session), EvidenceRepository(session),
    )
    return ok(await svc.get_shared(token))
