from typing import Any, Generic, TypeVar

from pydantic import BaseModel

from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import NotFound
from app.core.ids import new_id
from app.db.repository import OwnedRepository

ModelT = TypeVar("ModelT")


class CrudService(Generic[ModelT]):
    """CRUD dùng chung cho module chỉ có bảng đơn giản (BUILD_PLAN mục 3.2).

    Subclass đặt `model` và `id_prefix`, rồi ghi đè `create`/`update`/... khi cần thêm
    nghiệp vụ (vd `EnvironmentService.create` kiểm tra URL trước khi gọi `super().create`).
    """

    model: type[ModelT]
    id_prefix: str
    not_found_message = "Not found"

    def __init__(self, repo: OwnedRepository[ModelT]) -> None:
        self.repo = repo

    async def get_or_404(self, user: CurrentUserInfo, id: str) -> ModelT:
        obj = await self.repo.get(id, user.id)
        if obj is None:
            raise NotFound(self.not_found_message)
        return obj

    async def create(self, user: CurrentUserInfo, data: BaseModel) -> ModelT:
        obj = self.model(id=new_id(self.id_prefix), owner_id=user.id, **data.model_dump(exclude_unset=True))
        return await self.repo.add(obj)

    async def list(self, user: CurrentUserInfo, **filters: Any) -> list[ModelT]:
        return await self.repo.list(user.id, **filters)

    async def update(self, user: CurrentUserInfo, id: str, data: BaseModel) -> ModelT:
        obj = await self.get_or_404(user, id)
        return await self.repo.update(obj, data.model_dump(exclude_unset=True))

    async def delete(self, user: CurrentUserInfo, id: str) -> None:
        obj = await self.get_or_404(user, id)
        await self.repo.delete(obj)
