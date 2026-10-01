"""Chỉ truy vấn riêng ngoài CRUD chung (BUILD_PLAN mục 3.1): `search` cần JOIN `test_runs` để lọc theo suite.
CRUD còn lại dùng thẳng `OwnedRepository(Report)` (không lặp lại ở đây).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.execution.models import TestRun
from app.modules.reports.models import Report
from app.modules.reports.schemas import ReportListQuery

_RANGES = {"24h": timedelta(hours=24), "7d": timedelta(days=7), "30d": timedelta(days=30)}


class ReportsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def search(self, owner_id: str, query: ReportListQuery) -> list[tuple[Report, TestRun]]:
        where = [Report.owner_id == owner_id]
        if query.q and query.q.strip():
            pattern = f"%{query.q.strip()}%"
            where.append(or_(Report.id.ilike(pattern), Report.name.ilike(pattern)))
        if query.format:
            where.append(Report.format == query.format)
        if query.suite:
            where.append(TestRun.suite == query.suite)
        if query.date_range:
            where.append(Report.created_at >= datetime.now(timezone.utc) - _RANGES[query.date_range])

        stmt = (
            select(Report, TestRun)
            .join(TestRun, TestRun.id == Report.run_id)
            .where(*where)
            .order_by(Report.created_at.desc())
        )
        return list((await self.session.execute(stmt)).all())

    async def get_by_token(self, token: str) -> Report | None:
        """Xem báo cáo qua link chia sẻ — không lọc theo owner_id (ai có link cũng xem được)."""
        return (await self.session.execute(select(Report).where(Report.share_token == token))).scalar_one_or_none()
