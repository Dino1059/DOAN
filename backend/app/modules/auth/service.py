from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.core.exceptions import Conflict, DomainError
from app.core.ids import new_id
from app.core.security import hash_password, hash_token, needs_rehash, new_session_token, verify_password
from app.modules.auth.models import AuthSession, User
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import LoginIn, RegisterIn, UserOut


class Unauthorized(DomainError):
    status_code = 401
    code = "NOT_AUTHENTICATED"


class AuthService:
    def __init__(self, repo: AuthRepository) -> None:
        self.repo = repo

    async def register(self, data: RegisterIn, user_agent: str | None) -> tuple[UserOut, str]:
        """Tạo tài khoản rồi đăng nhập luôn. Tên đăng nhập = email."""
        if await self.repo.exists(username=data.email, email=data.email):
            raise Conflict("An account with this email already exists", code="EMAIL_TAKEN")
        user = await self.repo.add(User(
            id=new_id("USR"), username=data.email, email=data.email, display_name=data.display_name,
            password_hash=hash_password(data.password),
        ))
        token = await self._open_session(user, user_agent)
        return _out(user), token

    async def login(self, data: LoginIn, user_agent: str | None) -> tuple[UserOut, str]:
        user = await self.repo.get_by_login(data.login)
        # Cùng 1 thông báo cho "không có tài khoản" và "sai mật khẩu": không tiết lộ tài khoản nào tồn tại
        if not verify_password(data.password, user.password_hash if user else None):
            raise Unauthorized("Invalid username or password", code="INVALID_CREDENTIALS")
        if needs_rehash(user.password_hash):  # thư viện nâng tham số băm → cập nhật lúc có mật khẩu gốc
            user.password_hash = hash_password(data.password)
        user.last_login_at = datetime.now(timezone.utc)
        token = await self._open_session(user, user_agent)
        return _out(user), token

    async def logout(self, token: str | None) -> None:
        if token:
            await self.repo.revoke(hash_token(token))

    async def me(self, token: str | None) -> UserOut:
        user = await self.user_for_token(token)
        if user is None:
            raise Unauthorized("Please sign in")
        return _out(user)

    async def user_for_token(self, token: str | None) -> User | None:
        return await self.repo.user_for_token(hash_token(token)) if token else None

    async def _open_session(self, user: User, user_agent: str | None) -> str:
        token, token_hash = new_session_token()
        await self.repo.add(AuthSession(
            id=new_id("SES"), user_id=user.id, token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.session_days),
            user_agent=(user_agent or "")[:300] or None,
        ))
        return token


def _out(user: User) -> UserOut:
    return UserOut(
        id=user.id, username=user.username, email=user.email, display_name=user.display_name,
        created_at=user.created_at,
    )
