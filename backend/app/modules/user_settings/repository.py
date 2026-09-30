from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthSession, User
from app.modules.user_settings.models import ApiKey, UserPreferences


class UserSettingsRepository:
    """`api_keys` (nhiều dòng/user, khoá duy nhất theo provider) và `user_preferences` (1 dòng/user,
    khoá chính = user_id) không khớp khuôn `OwnedRepository` (id + owner_id), nên viết riêng."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_user(self, user_id: str) -> User | None:
        return await self.session.get(User, user_id)

    async def email_taken_by_someone_else(self, email: str, user_id: str) -> bool:
        stmt = select(User.id).where(User.email == email, User.id != user_id)
        return (await self.session.execute(stmt)).first() is not None

    async def revoke_other_sessions(self, user_id: str, *, keep_token_hash: str | None) -> None:
        stmt = select(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        if keep_token_hash:
            stmt = stmt.where(AuthSession.token_hash != keep_token_hash)
        for session_row in (await self.session.execute(stmt)).scalars():
            session_row.revoked_at = datetime.now(timezone.utc)

    async def list_api_keys(self, owner_id: str) -> list[ApiKey]:
        stmt = select(ApiKey).where(ApiKey.owner_id == owner_id)
        return list((await self.session.execute(stmt)).scalars())

    async def get_api_key(self, owner_id: str, provider: str) -> ApiKey | None:
        stmt = select(ApiKey).where(ApiKey.owner_id == owner_id, ApiKey.provider == provider)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def upsert_api_key(self, key: ApiKey) -> ApiKey:
        self.session.add(key)
        await self.session.flush()
        await self.session.refresh(key)
        return key

    async def delete_api_key(self, key: ApiKey) -> None:
        await self.session.delete(key)
        await self.session.flush()

    async def get_preferences(self, user_id: str) -> UserPreferences | None:
        return await self.session.get(UserPreferences, user_id)

    async def upsert_preferences(self, prefs: UserPreferences) -> UserPreferences:
        self.session.add(prefs)
        await self.session.flush()
        await self.session.refresh(prefs)
        return prefs
