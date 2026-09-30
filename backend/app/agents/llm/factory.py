from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.fakes import FakePlanner
from app.agents.llm.openai_provider import OpenAIProvider
from app.agents.planner_agent import PlannerAgent
from app.core.config import settings
from app.core.dependencies import CurrentUser
from app.core.exceptions import ServiceUnavailable
from app.db.session import get_session
from app.modules.user_settings.repository import UserSettingsRepository
from app.modules.user_settings.service import get_decrypted_key


@lru_cache
def _openai_provider(api_key: str, model: str, timeout: float) -> OpenAIProvider:
    # Dùng lại 1 client cho mọi request (giữ kết nối HTTP theo từng key).
    return OpenAIProvider(api_key=api_key, model=model, timeout=timeout)


async def get_planner(
    user: CurrentUser, session: Annotated[AsyncSession, Depends(get_session)]
) -> PlannerAgent | FakePlanner:
    """Dependency: chọn Planner thật (OpenAI) hay giả theo AGENT_MODE.

    M9: ưu tiên API key user tự lưu ở Settings (`user_settings`), dùng key trong `.env` làm dự phòng.
    """
    if settings.agent_mode == "fake":
        return FakePlanner()
    api_key = await get_decrypted_key(UserSettingsRepository(session), user.id, "openai")
    if not api_key and settings.openai_api_key:
        api_key = settings.openai_api_key.get_secret_value()
    if not api_key:
        raise ServiceUnavailable(
            "No OpenAI API key configured: set one in Settings or OPENAI_API_KEY in backend/.env",
            code="LLM_NOT_CONFIGURED",
        )
    provider = _openai_provider(api_key, settings.openai_model, settings.llm_timeout_seconds)
    return PlannerAgent(provider)
