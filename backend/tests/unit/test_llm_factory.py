"""M9: `get_planner` phải ưu tiên API key user tự lưu trong Settings, chỉ rơi về `.env` khi user chưa đặt."""
import asyncio

import pytest

from app.agents.fakes import FakePlanner
from app.agents.llm import factory
from app.core.config import settings
from app.core.dependencies import CurrentUserInfo
from app.core.exceptions import ServiceUnavailable
from app.db.session import SessionLocal
from app.modules.user_settings.repository import UserSettingsRepository
from app.modules.user_settings.schemas import ApiKeySetIn
from app.modules.user_settings.service import UserSettingsService
from tests.conftest import ensure_user

pytestmark = pytest.mark.usefixtures("clean_db")

OWNER = CurrentUserInfo(id="USR-LLM-FACTORY", username="factory-test")


def run(coro):
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def _owner(clean_db):
    ensure_user(OWNER.id)


@pytest.fixture(autouse=True)
def _capture_provider(monkeypatch):
    calls = []

    def fake_provider(api_key, model, timeout):
        calls.append(api_key)
        return object()

    monkeypatch.setattr(factory, "_openai_provider", fake_provider)
    return calls


@pytest.fixture(autouse=True)
def _agent_mode_real(monkeypatch):
    monkeypatch.setattr(settings, "agent_mode", "real")


async def _set_user_key(api_key: str) -> None:
    async with SessionLocal() as session:
        svc = UserSettingsService(UserSettingsRepository(session))
        await svc.set_api_key(OWNER, "openai", ApiKeySetIn(api_key=api_key))
        await session.commit()


def test_uses_users_own_key_when_configured(_capture_provider, monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", None)
    run(_set_user_key("sk-user-own-key-000"))

    async def _call():
        async with SessionLocal() as session:
            return await factory.get_planner(OWNER, session)

    result = run(_call())
    assert not isinstance(result, FakePlanner)
    assert _capture_provider == ["sk-user-own-key-000"]


def test_falls_back_to_env_key_when_user_has_none(_capture_provider, monkeypatch):
    from pydantic import SecretStr

    monkeypatch.setattr(settings, "openai_api_key", SecretStr("sk-env-fallback-000"))

    async def _call():
        async with SessionLocal() as session:
            return await factory.get_planner(OWNER, session)

    run(_call())
    assert _capture_provider == ["sk-env-fallback-000"]


def test_503_when_neither_user_nor_env_has_a_key(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", None)

    async def _call():
        async with SessionLocal() as session:
            return await factory.get_planner(OWNER, session)

    with pytest.raises(ServiceUnavailable):
        run(_call())
