"""Unit test cho logic khó của Planner Agent: dựng ngữ cảnh gửi LLM và kiểm tra JSON trả về."""
import asyncio

import pytest

from app.agents.fakes import FakeLLMProvider
from app.agents.llm.base import LLMError
from app.agents.planner_agent import PLAN_SCHEMA, SYSTEM_PROMPT, PlannerAgent
from app.agents.protocol import ChatTurn

VALID = {
    "title": "Password reset",
    "reply": "I planned 2 steps.",
    "objective": "Verify password reset",
    "target_url": "https://test.com",
    "preconditions": ["Site is up", "  "],
    "test_data": [{"key": "email", "value": "user@example.test"}, {"key": "", "value": "ignored"}],
    "steps": [
        {"action": "Open URL", "selector": "https://test.com/login", "expected": "Login page shown"},
        {"action": " Click Element ", "selector": "#forgot", "expected": "Form shown"},
    ],
}


def run(coro):
    return asyncio.run(coro)


def test_parses_llm_json_into_plan_draft():
    llm = FakeLLMProvider(VALID)
    draft = run(PlannerAgent(llm).generate("Test password reset on test.com", history=[]))

    assert draft.test_data == {"email": "user@example.test"}        # mảng key/value → dict, bỏ key rỗng
    assert draft.preconditions == ["Site is up"]                     # bỏ dòng trống
    assert draft.steps[1].action == "Click Element"                  # cắt khoảng trắng
    assert draft.usage.prompt_tokens == 10


def test_sends_system_prompt_history_current_plan_and_prompt_in_order():
    llm = FakeLLMProvider(VALID)
    history = [ChatTurn("user", "old question"), ChatTurn("assistant", "old answer")]
    run(PlannerAgent(llm).generate("change step 2", history, current_plan={"steps": []}))

    messages = llm.calls[0]
    assert messages[0] == {"role": "system", "content": SYSTEM_PROMPT}
    assert [m["content"] for m in messages[1:3]] == ["old question", "old answer"]
    assert messages[3]["role"] == "system" and messages[3]["content"].startswith("Current plan (JSON)")
    assert messages[-1] == {"role": "user", "content": "change step 2"}


def test_plan_without_steps_is_rejected():
    with pytest.raises(LLMError, match="without steps"):
        run(PlannerAgent(FakeLLMProvider({**VALID, "steps": []})).generate("x", []))


def test_unexpected_json_shape_is_rejected():
    with pytest.raises(LLMError, match="unexpected shape"):
        run(PlannerAgent(FakeLLMProvider({"steps": "not a list"})).generate("x", []))


def test_schema_is_strict_compatible():
    # OpenAI Structured Outputs (strict) yêu cầu mọi object liệt kê đủ required và cấm thuộc tính lạ.
    def check(node):
        if node.get("type") == "object":
            assert node["additionalProperties"] is False
            assert set(node["required"]) == set(node["properties"])
            for child in node["properties"].values():
                check(child)
        if node.get("type") == "array":
            check(node["items"])

    check(PLAN_SCHEMA)
