from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import Conflict, DomainError, NotFound
from app.core.ids import new_id
from app.core.security import (
    decrypt_secret,
    encrypt_secret,
    hash_password,
    hash_token,
    verify_password,
)
from app.modules.user_settings.models import LLM_PROVIDERS, ApiKey, UserPreferences
from app.modules.user_settings.repository import UserSettingsRepository
from app.modules.user_settings.schemas import (
    ApiKeyOut,
    ApiKeySetIn,
    ChangePasswordIn,
    PreferencesOut,
    PreferencesUpdateIn,
    ProfileOut,
    ProfileUpdateIn,
)


class InvalidPassword(DomainError):
    status_code = 400
    code = "INVALID_PASSWORD"


class UserSettingsService:
    def __init__(self, repo: UserSettingsRepository) -> None:
        self.repo = repo

    # ---------- Hồ sơ ----------

    async def get_profile(self, user: CurrentUserInfo) -> ProfileOut:
        return _profile_out(await self._get_user(user.id))

    async def update_profile(self, user: CurrentUserInfo, data: ProfileUpdateIn) -> ProfileOut:
        row = await self._get_user(user.id)
        if data.email is not None and data.email != row.email:
            if await self.repo.email_taken_by_someone_else(data.email, user.id):
                raise Conflict("An account with this email already exists", code="EMAIL_TAKEN")
            row.email = data.email
        if data.display_name is not None:
            row.display_name = data.display_name
        await self.repo.session.flush()
        return _profile_out(row)

    async def change_password(self, user: CurrentUserInfo, data: ChangePasswordIn, *, current_token: str | None) -> None:
        row = await self._get_user(user.id)
        if not verify_password(data.current_password, row.password_hash):
            raise InvalidPassword("Current password is incorrect")
        row.password_hash = hash_password(data.new_password)
        # Đổi mật khẩu xong: thu hồi mọi phiên khác (thiết bị/trình duyệt khác), giữ phiên đang dùng để không tự đăng xuất.
        await self.repo.revoke_other_sessions(user.id, keep_token_hash=hash_token(current_token) if current_token else None)

    # ---------- API key ----------

    async def list_api_keys(self, user: CurrentUserInfo) -> list[ApiKeyOut]:
        rows = {k.provider: k for k in await self.repo.list_api_keys(user.id)}
        return [
            ApiKeyOut(
                provider=provider, configured=provider in rows,
                last4=rows[provider].last4 if provider in rows else None,
                updated_at=rows[provider].updated_at if provider in rows else None,
            )
            for provider in LLM_PROVIDERS
        ]

    async def set_api_key(self, user: CurrentUserInfo, provider: str, data: ApiKeySetIn) -> ApiKeyOut:
        existing = await self.repo.get_api_key(user.id, provider)
        encrypted = encrypt_secret(data.api_key)
        last4 = data.api_key[-4:]
        if existing:
            existing.encrypted_key, existing.last4, existing.config = encrypted, last4, data.config
            key = await self.repo.upsert_api_key(existing)
        else:
            key = await self.repo.upsert_api_key(ApiKey(
                id=new_id("APK"), owner_id=user.id, provider=provider,
                encrypted_key=encrypted, last4=last4, config=data.config,
            ))
        return ApiKeyOut(provider=provider, configured=True, last4=key.last4, updated_at=key.updated_at)

    async def delete_api_key(self, user: CurrentUserInfo, provider: str) -> None:
        existing = await self.repo.get_api_key(user.id, provider)
        if existing:
            await self.repo.delete_api_key(existing)

    # ---------- Tuỳ chọn ----------

    async def get_preferences(self, user: CurrentUserInfo) -> PreferencesOut:
        prefs = await self.repo.get_preferences(user.id)
        return PreferencesOut(theme=prefs.theme, notifications=prefs.notifications) if prefs else PreferencesOut(theme="light", notifications={})

    async def update_preferences(self, user: CurrentUserInfo, data: PreferencesUpdateIn) -> PreferencesOut:
        prefs = await self.repo.get_preferences(user.id)
        if prefs is None:
            prefs = UserPreferences(user_id=user.id, theme="light", notifications={})
        if data.theme is not None:
            prefs.theme = data.theme
        if data.notifications is not None:
            prefs.notifications = data.notifications
        prefs = await self.repo.upsert_preferences(prefs)
        return PreferencesOut(theme=prefs.theme, notifications=prefs.notifications)

    # ---------- helpers ----------

    async def _get_user(self, user_id: str):
        row = await self.repo.get_user(user_id)
        if row is None:  # không thể xảy ra bình thường: CurrentUser đến từ phiên hợp lệ
            raise NotFound("User not found")
        return row


async def get_decrypted_key(repo: UserSettingsRepository, owner_id: str, provider: str) -> str | None:
    """Agents (M4) gọi để dùng key của user thay cho key trong `.env`. Không có endpoint nào trả kết quả này."""
    key = await repo.get_api_key(owner_id, provider)
    if key is None or not key.is_active:
        return None
    return decrypt_secret(key.encrypted_key)


def _profile_out(user) -> ProfileOut:
    return ProfileOut(
        id=user.id, username=user.username, email=user.email,
        display_name=user.display_name, created_at=user.created_at,
    )
