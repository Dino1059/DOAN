from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session


@dataclass(frozen=True)
class CurrentUserInfo:
    id: str
    username: str
    display_name: str = ""


async def get_current_user(
    request: Request, session: Annotated[AsyncSession, Depends(get_session)]
) -> CurrentUserInfo:
    """Đọc cookie phiên (M7) → user. Không có / hết hạn / đã đăng xuất → 401.

    AUTH_REQUIRED=false (chỉ test tự động) → user demo, giống trước M7.
    """
    if not settings.auth_required:
        return CurrentUserInfo(id=settings.demo_user_id, username="admin123", display_name="Administrator")

    # Import tại chỗ: core không phụ thuộc module auth lúc import (tránh vòng import).
    from app.modules.auth.repository import AuthRepository
    from app.modules.auth.service import AuthService, Unauthorized

    user = await AuthService(AuthRepository(session)).user_for_token(request.cookies.get(settings.session_cookie_name))
    if user is None:
        raise Unauthorized("Please sign in to continue")
    return CurrentUserInfo(id=user.id, username=user.username, display_name=user.display_name)


CurrentUser = Annotated[CurrentUserInfo, Depends(get_current_user)]
