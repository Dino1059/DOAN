from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.repository import OwnedRepository
from app.db.session import get_session
from app.modules.evidence.repository import EvidenceRepository
from app.modules.evidence.router import storage as evidence_storage
from app.modules.reports.models import Report
from app.modules.reports.repository import ReportsRepository
from app.modules.reports.schemas import (
    DateRange,
    ReportDetailOut,
    ReportFormat,
    ReportGenerateIn,
    ReportListQuery,
    ReportOut,
    ShareOut,
)
from app.modules.reports.service import ReportService
from app.modules.test_runs.repository import TestRunsRepository
from app.modules.test_runs.service import TestRunsService

router = APIRouter(prefix="/reports", tags=["reports"])
public_router = APIRouter(tags=["reports"])

_CONTENT_TYPES = {"markdown": "text/markdown; charset=utf-8", "pdf": "application/pdf"}


def get_report_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ReportService:
    return ReportService(
        OwnedRepository(Report, session), ReportsRepository(session),
        TestRunsService(TestRunsRepository(session)), EvidenceRepository(session), evidence_storage,
    )


Svc = Annotated[ReportService, Depends(get_report_service)]


def _file_response(report: Report, body: bytes) -> Response:
    ext = "pdf" if report.format == "pdf" else "md"
    return Response(
        content=body, media_type=_CONTENT_TYPES[report.format],
        headers={"Content-Disposition": f'attachment; filename="{report.id}.{ext}"'},
    )


@router.get("", response_model=Envelope[list[ReportOut]])
async def list_reports(
    user: CurrentUser, svc: Svc,
    q: str | None = Query(default=None, max_length=200),
    format: ReportFormat | None = None,  # noqa: A002
    suite: str | None = Query(default=None, max_length=120),
    date_range: DateRange | None = None,
):
    return ok(await svc.list(user, ReportListQuery(q=q, format=format, suite=suite, date_range=date_range)))


@router.post("", status_code=201, response_model=Envelope[ReportDetailOut])
async def create_report(payload: ReportGenerateIn, user: CurrentUser, svc: Svc):
    return ok(await svc.generate(user, payload))


@router.get("/{report_id}", response_model=Envelope[ReportDetailOut])
async def get_report(report_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.detail(user, report_id))


@router.get("/{report_id}/download")
async def download_report(report_id: str, user: CurrentUser, svc: Svc):
    report, body = await svc.download(user, report_id)
    return _file_response(report, body)


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: str, user: CurrentUser, svc: Svc) -> None:
    await svc.delete(user, report_id)


@router.post("/{report_id}/share", response_model=Envelope[ShareOut])
async def share_report(report_id: str, user: CurrentUser, svc: Svc):
    token = await svc.share(user, report_id)
    return ok(ShareOut(share_token=token, share_path=f"/shared/reports/{token}"))


@router.delete("/{report_id}/share", status_code=204)
async def unshare_report(report_id: str, user: CurrentUser, svc: Svc) -> None:
    await svc.unshare(user, report_id)


@public_router.get("/shared/reports/{token}")
async def get_shared_report(token: str, session: Annotated[AsyncSession, Depends(get_session)]):
    """Xem báo cáo qua link chia sẻ — không cần đăng nhập."""
    svc = ReportService(
        OwnedRepository(Report, session), ReportsRepository(session),
        TestRunsService(TestRunsRepository(session)), EvidenceRepository(session), evidence_storage,
    )
    report, body = await svc.get_shared(token)
    return _file_response(report, body)
