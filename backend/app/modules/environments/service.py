from datetime import datetime, timezone

import httpx

from app.core.config import settings
from app.core.crud_service import CrudService
from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import Conflict
from app.core.url_guard import BlockedTarget, validate_target_url
from app.db.repository import OwnedRepository
from app.modules.environments.models import Environment
from app.modules.environments.schemas import EnvironmentIn, EnvironmentUpdate, TestConnectionOut

TEST_CONNECTION_TIMEOUT_SECONDS = 5.0


class EnvironmentService(CrudService[Environment]):
    model = Environment
    id_prefix = "ENV"
    not_found_message = "Environment not found"

    def __init__(self, repo: OwnedRepository[Environment]) -> None:
        super().__init__(repo)

    async def create(self, user: CurrentUserInfo, data: EnvironmentIn) -> Environment:
        validate_target_url(data.base_url)
        await self._ensure_name_free(user, data.name)
        return await super().create(user, data)

    async def update(self, user: CurrentUserInfo, id: str, data: EnvironmentUpdate) -> Environment:
        if data.base_url is not None:
            validate_target_url(data.base_url)
        if data.name is not None:
            await self._ensure_name_free(user, data.name, except_id=id)
        return await super().update(user, id, data)

    async def test_connection(self, user: CurrentUserInfo, id: str) -> TestConnectionOut:
        env = await self.get_or_404(user, id)
        try:
            validate_target_url(env.base_url)
            async with httpx.AsyncClient(follow_redirects=False, timeout=TEST_CONNECTION_TIMEOUT_SECONDS) as client:
                response = await client.get(env.base_url)
            status, detail = "connected", f"HTTP {response.status_code}"
        except BlockedTarget as exc:
            status, detail = "error", str(exc.detail)
        except httpx.HTTPError as exc:
            status, detail = "error", f"{type(exc).__name__}: {exc}"

        env.last_check_status = status
        env.last_checked_at = datetime.now(timezone.utc)
        await self.repo.session.flush()
        return TestConnectionOut(status=status, detail=detail)

    async def resolve_for_run(self, user_id: str, environment_id: str | None) -> Environment | None:
        """Được `execution.service` gọi lúc tạo run, để chép tên môi trường + browser vào run."""
        if environment_id is None:
            return None
        return await self.repo.get(environment_id, user_id)

    async def _ensure_name_free(self, user: CurrentUserInfo, name: str, *, except_id: str | None = None) -> None:
        existing = await self.repo.list(user.id, where=(Environment.name == name,))
        if any(e.id != except_id for e in existing):
            raise Conflict(f"An environment named '{name}' already exists", code="ENVIRONMENT_NAME_TAKEN")
