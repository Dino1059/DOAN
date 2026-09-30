"""Gọi OpenAI thật (gpt-4o-mini). Mặc định BỎ QUA để không tốn tiền.

Chạy:  RUN_LIVE_LLM=1 pytest tests/test_planner_live.py -s
"""
import asyncio
import os

import pytest

from app.agents.llm.openai_provider import OpenAIProvider
from app.agents.planner_agent import PlannerAgent
from app.core.config import settings

pytestmark = pytest.mark.skipif(os.environ.get("RUN_LIVE_LLM") != "1", reason="set RUN_LIVE_LLM=1 to call OpenAI")


def test_real_openai_generates_a_usable_plan():
    key = settings.openai_api_key.get_secret_value() if settings.openai_api_key else ""
    assert key, "OPENAI_API_KEY missing in backend/.env"
    planner = PlannerAgent(OpenAIProvider(key, settings.openai_model, settings.llm_timeout_seconds))

    draft = asyncio.run(planner.generate("Test the password reset feature on test.com", history=[]))

    print(f"\n{draft.usage.model}: {len(draft.steps)} steps, {draft.usage.prompt_tokens}+{draft.usage.completion_tokens} tokens, {draft.usage.latency_ms} ms")
    for i, s in enumerate(draft.steps, 1):
        print(f"  {i}. {s.action} | {s.selector} | {s.expected}")
    assert draft.usage.model.startswith("gpt-4o-mini")
    assert 3 <= len(draft.steps) <= 12
    assert "test.com" in draft.target_url
    assert all(s.action and s.selector and s.expected for s in draft.steps)
