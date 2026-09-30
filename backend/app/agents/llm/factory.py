from functools import lru_cache

from app.agents.fakes import FakePlanner
from app.agents.llm.openai_provider import OpenAIProvider
from app.agents.planner_agent import PlannerAgent
from app.core.config import settings
from app.core.exceptions import ServiceUnavailable


@lru_cache
def _openai_provider(api_key: str, model: str, timeout: float) -> OpenAIProvider:
    # Dùng lại 1 client cho mọi request (giữ kết nối HTTP).
    return OpenAIProvider(api_key=api_key, model=model, timeout=timeout)


def get_planner() -> PlannerAgent | FakePlanner:
    """Dependency: chọn Planner thật (OpenAI) hay giả theo AGENT_MODE."""
    if settings.agent_mode == "fake":
        return FakePlanner()
    if not settings.openai_api_key or not settings.openai_api_key.get_secret_value():
        raise ServiceUnavailable("OPENAI_API_KEY is not configured in backend/.env", code="LLM_NOT_CONFIGURED")
    provider = _openai_provider(
        settings.openai_api_key.get_secret_value(), settings.openai_model, settings.llm_timeout_seconds
    )
    return PlannerAgent(provider)
