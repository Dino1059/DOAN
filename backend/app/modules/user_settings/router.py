from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.session import get_session
from app.modules.user_settings.repository import UserSettingsRepository
from app.modules.user_settings.schemas import (
    ApiKeyOut,
    ApiKeySetIn,
    ChangePasswordIn,
    LlmProvider,
    PreferencesOut,
    PreferencesUpdateIn,
    ProfileOut,
    ProfileUpdateIn,
)
from app.modules.user_settings.service import UserSettingsService

router = APIRouter(prefix="/settings", tags=["user_settings"])


def get_user_settings_service(session: Annotated[AsyncSession, Depends(get_session)]) -> UserSettingsService:
    return UserSettingsService(UserSettingsRepository(session))


Svc = Annotated[UserSettingsService, Depends(get_user_settings_service)]


@router.get("/profile", response_model=Envelope[ProfileOut])
async def get_profile(user: CurrentUser, svc: Svc):
    return ok(await svc.get_profile(user))


@router.put("/profile", response_model=Envelope[ProfileOut])
async def update_profile(payload: ProfileUpdateIn, user: CurrentUser, svc: Svc):
    return ok(await svc.update_profile(user, payload))


@router.put("/password", status_code=204)
async def change_password(payload: ChangePasswordIn, request: Request, user: CurrentUser, svc: Svc) -> None:
    current_token = request.cookies.get(settings.session_cookie_name)
    await svc.change_password(user, payload, current_token=current_token)


@router.get("/api-keys", response_model=Envelope[list[ApiKeyOut]])
async def list_api_keys(user: CurrentUser, svc: Svc):
    return ok(await svc.list_api_keys(user))


@router.put("/api-keys/{provider}", response_model=Envelope[ApiKeyOut])
async def set_api_key(provider: LlmProvider, payload: ApiKeySetIn, user: CurrentUser, svc: Svc):
    return ok(await svc.set_api_key(user, provider, payload))


@router.delete("/api-keys/{provider}", status_code=204)
async def delete_api_key(provider: LlmProvider, user: CurrentUser, svc: Svc) -> None:
    await svc.delete_api_key(user, provider)


@router.get("/preferences", response_model=Envelope[PreferencesOut])
async def get_preferences(user: CurrentUser, svc: Svc):
    return ok(await svc.get_preferences(user))


@router.put("/preferences", response_model=Envelope[PreferencesOut])
async def update_preferences(payload: PreferencesUpdateIn, user: CurrentUser, svc: Svc):
    return ok(await svc.update_preferences(user, payload))
