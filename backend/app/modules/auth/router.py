from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.response import Envelope, ok
from app.db.session import get_session
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import LoginIn, RegisterIn, UserOut
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(session: Annotated[AsyncSession, Depends(get_session)]) -> AuthService:
    return AuthService(AuthRepository(session))


Svc = Annotated[AuthService, Depends(get_auth_service)]


def _set_cookie(response: Response, token: str) -> None:
    # HttpOnly: JavaScript không đọc được token (chống XSS lấy trộm phiên).
    # SameSite=Lax: trang web khác không gửi kèm cookie khi POST sang đây (chống CSRF).
    response.set_cookie(
        settings.session_cookie_name, token, max_age=settings.session_days * 86400,
        httponly=True, samesite="lax", secure=settings.cookie_secure, path="/",
    )


@router.post("/register", status_code=201, response_model=Envelope[UserOut])
async def register(data: RegisterIn, request: Request, response: Response, svc: Svc):
    user, token = await svc.register(data, request.headers.get("user-agent"))
    _set_cookie(response, token)
    return ok(user)


@router.post("/login", response_model=Envelope[UserOut])
async def login(data: LoginIn, request: Request, response: Response, svc: Svc):
    user, token = await svc.login(data, request.headers.get("user-agent"))
    _set_cookie(response, token)
    return ok(user)


@router.post("/logout", status_code=204)
async def logout(request: Request, response: Response, svc: Svc) -> Response:
    await svc.logout(request.cookies.get(settings.session_cookie_name))
    response.status_code = 204
    response.delete_cookie(settings.session_cookie_name, path="/", httponly=True, samesite="lax", secure=settings.cookie_secure)
    return response


@router.get("/me", response_model=Envelope[UserOut])
async def me(request: Request, svc: Svc):
    """Frontend gọi khi mở trang: còn phiên thì vào thẳng Dashboard, không thì 401."""
    return ok(await svc.me(request.cookies.get(settings.session_cookie_name)))
