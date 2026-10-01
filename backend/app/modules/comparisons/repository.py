"""Truy vấn riêng ngoài CRUD chung (BUILD_PLAN mục 3.1). CRUD còn lại dùng thẳng `OwnedRepository(Comparison)`."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.comparisons.models import Comparison


class ComparisonsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def pair_exists(self, owner_id: str, run_a_id: str, run_b_id: str) -> bool:
        stmt = select(Comparison.id).where(
            Comparison.owner_id == owner_id, Comparison.run_a_id == run_a_id, Comparison.run_b_id == run_b_id
        )
        return (await self.session.execute(stmt)).first() is not None

    async def get_by_token(self, token: str) -> Comparison | None:
        """Xem so sánh qua link chia sẻ — không lọc theo owner_id (ai có link cũng xem được)."""
        stmt = select(Comparison).where(Comparison.share_token == token)
        return (await self.session.execute(stmt)).scalar_one_or_none()
