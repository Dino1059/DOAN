from datetime import datetime, timezone

from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import AuthSession, User


class AuthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add(self, obj):
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def get_user(self, user_id: str) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_login(self, login: str) -> User | None:
        """login = username hoặc email (đã viết thường)."""
        stmt = select(User).where(or_(User.username == login, User.email == login))
        return (await self.session.execute(stmt)).scalars().first()

    async def exists(self, *, username: str, email: str) -> bool:
        stmt = select(User.id).where(or_(User.username == username, User.email == email, User.username == email))
        return (await self.session.execute(stmt)).first() is not None

    async def user_for_token(self, token_hash: str) -> User | None:
        """User của phiên còn hiệu lực (chưa thu hồi, chưa hết hạn)."""
        stmt = (
            select(User)
            .join(AuthSession, AuthSession.user_id == User.id)
            .where(
                AuthSession.token_hash == token_hash,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > datetime.now(timezone.utc),
            )
        )
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def revoke(self, token_hash: str) -> None:
        await self.session.execute(
            update(AuthSession)
            .where(AuthSession.token_hash == token_hash, AuthSession.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
