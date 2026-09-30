from typing import Any, Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

ModelT = TypeVar("ModelT")


class OwnedRepository(Generic[ModelT]):
    """Truy vấn dùng chung cho bảng có cột owner_id (BUILD_PLAN mục 3.2).

    Mọi hàm đọc đều lọc theo owner_id ở đây — module không tự viết lại điều kiện này,
    nên không có chuyện quên lọc rồi lộ dữ liệu của người khác.
    """

    def __init__(self, model: type[ModelT], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def add(self, obj: ModelT) -> ModelT:
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def get(self, id: str, owner_id: str, *, options: tuple = ()) -> ModelT | None:
        stmt = select(self.model).where(self.model.id == id, self.model.owner_id == owner_id)  # type: ignore[attr-defined]
        if options:
            stmt = stmt.options(*options)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def list(
        self, owner_id: str, *, where: tuple = (), order_by: tuple = (), limit: int | None = None
    ) -> list[ModelT]:
        stmt = select(self.model).where(self.model.owner_id == owner_id, *where)  # type: ignore[attr-defined]
        if order_by:
            stmt = stmt.order_by(*order_by)
        if limit:
            stmt = stmt.limit(limit)
        return list((await self.session.execute(stmt)).scalars())

    async def update(self, obj: ModelT, data: dict[str, Any]) -> ModelT:
        for key, value in data.items():
            setattr(obj, key, value)
        await self.session.flush()
        await self.session.refresh(obj)  # UPDATE không tự trả cột do DB tính (vd updated_at = onupdate=now())
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.session.flush()
