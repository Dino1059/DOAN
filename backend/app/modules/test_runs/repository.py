"""Chỉ ĐỌC bảng của M3 (test_runs, test_run_steps, run_interventions) — không ghi gì."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from app.modules.execution.models import RunIntervention, TestRun, TestRunStep
from app.modules.test_runs.schemas import RunListQuery

DEFAULT_ENV = "Default"  # run chưa gắn môi trường (bảng environments có ở M8)
_RANGES = {"24h": timedelta(hours=24), "7d": timedelta(days=7), "30d": timedelta(days=30)}

# Cột ENV hiển thị: tên môi trường chép lúc chạy, hoặc "Default"
ENV_COLUMN = func.coalesce(TestRun.environment_name, DEFAULT_ENV)


class TestRunsRepository:
    __test__ = False

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _filters(self, owner_id: str, query: RunListQuery) -> list:
        where = [TestRun.owner_id == owner_id]
        if query.q and query.q.strip():
            pattern = f"%{query.q.strip()}%"
            where.append(or_(TestRun.id.ilike(pattern), TestRun.name.ilike(pattern)))
        if query.status:
            where.append(TestRun.status == query.status)
        if query.suite:
            where.append(TestRun.suite == query.suite)
        if query.env:
            where.append(ENV_COLUMN == query.env)
        if query.browser:
            where.append(TestRun.browser == query.browser)
        if query.date_range:
            where.append(TestRun.created_at >= datetime.now(timezone.utc) - _RANGES[query.date_range])
        return where

    async def search(self, owner_id: str, query: RunListQuery) -> tuple[list[tuple[TestRun, int, int]], int]:
        """1 trang kết quả + tổng số dòng khớp. Đếm P/F bằng COUNT … FILTER ngay trong SQL."""
        where = self._filters(owner_id, query)
        total = await self.session.scalar(select(func.count()).select_from(TestRun).where(*where))

        passed = func.count(TestRunStep.id).filter(TestRunStep.status == "passed")
        failed = func.count(TestRunStep.id).filter(TestRunStep.status == "failed")
        stmt = (
            select(TestRun, passed, failed)
            .options(noload(TestRun.steps))  # chỉ cần số đếm, không nạp từng bước
            .outerjoin(TestRunStep, TestRunStep.run_id == TestRun.id)
            .where(*where)
            .group_by(TestRun.id)
            .order_by(TestRun.created_at.desc(), TestRun.id)
            .limit(query.page_size)
            .offset((query.page - 1) * query.page_size)
        )
        rows = [(run, p, f) for run, p, f in (await self.session.execute(stmt)).all()]
        return rows, total or 0

    async def distinct_values(self, owner_id: str, column) -> list[str]:
        stmt = select(column).where(TestRun.owner_id == owner_id).distinct().order_by(column)
        return [v for v in (await self.session.execute(stmt)).scalars() if v]

    async def get_owned(self, run_id: str, owner_id: str) -> TestRun | None:
        stmt = select(TestRun).where(TestRun.id == run_id, TestRun.owner_id == owner_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def interventions(self, run_id: str) -> list[tuple[RunIntervention, int | None]]:
        stmt = (
            select(RunIntervention, TestRunStep.step_no)
            .outerjoin(TestRunStep, TestRunStep.id == RunIntervention.step_id)
            .where(RunIntervention.run_id == run_id)
            .order_by(RunIntervention.asked_at)
        )
        return [(i, no) for i, no in (await self.session.execute(stmt)).all()]
