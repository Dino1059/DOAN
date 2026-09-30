"""Planner Agent: yêu cầu bằng ngôn ngữ tự nhiên → kịch bản test có cấu trúc (JSON)."""
import json
from typing import Any

from app.agents.llm.base import LLMError, LLMProvider
from app.agents.protocol import ChatTurn, PlanDraft, StepDraft

MAX_STEPS = 20
HISTORY_TURNS = 10  # số tin nhắn gần nhất gửi kèm làm ngữ cảnh

SYSTEM_PROMPT = """You are the Planner Agent of an automated web-testing platform.
Turn the user's request into an end-to-end browser test plan that a Playwright executor will run step by step.

Rules:
- 3 to 12 steps, in execution order. Each step is ONE browser action or ONE check.
- "action": short verb phrase, e.g. "Open URL", "Click Element", "Fill Input", "Select Option",
  "Press Key", "Verify Text", "Verify Element Visible", "Verify URL", "Verify API Response", "Wait For Element".
- "selector": for Open URL / Verify URL the full URL; for API checks "METHOD /path"; otherwise a CSS selector,
  preferring stable ones (#id, [name=...], [data-testid=...], button:has-text("...")).
- "expected": the concrete, observable result that proves the step passed.
- "target_url": the start URL. Use the URL or domain the user gave (add https:// if missing).
  If none was given, use an empty string. Never invent a real third-party domain.
- "test_data": key/value pairs the steps need (emails, search terms...). Use obviously fake test values.
- "preconditions": what must be true before running.
- "title": a short name for this test session (max 6 words).
- "reply": 1-2 sentences to the user summarising what you planned or changed.
- Write objective, steps, reply and title in the same language as the user's latest message.

If a current plan is provided, the user is asking to change it: keep the steps that should not change
exactly as they are, and only modify, add or remove what the request asks for."""

PLAN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "reply", "objective", "target_url", "preconditions", "test_data", "steps"],
    "properties": {
        "title": {"type": "string"},
        "reply": {"type": "string"},
        "objective": {"type": "string"},
        "target_url": {"type": "string"},
        "preconditions": {"type": "array", "items": {"type": "string"}},
        # Structured Outputs (strict) không cho object tuỳ ý → dùng mảng key/value rồi đổi sang dict.
        "test_data": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["key", "value"],
                "properties": {"key": {"type": "string"}, "value": {"type": "string"}},
            },
        },
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["action", "selector", "expected"],
                "properties": {
                    "action": {"type": "string"},
                    "selector": {"type": "string"},
                    "expected": {"type": "string"},
                },
            },
        },
    },
}


class PlannerAgent:
    def __init__(self, llm: LLMProvider) -> None:
        self.llm = llm

    async def generate(
        self, prompt: str, history: list[ChatTurn], current_plan: dict[str, Any] | None = None
    ) -> PlanDraft:
        messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        for turn in history[-HISTORY_TURNS:]:
            messages.append({"role": turn.role, "content": turn.content})
        if current_plan:
            messages.append(
                {"role": "system", "content": "Current plan (JSON):\n" + json.dumps(current_plan, ensure_ascii=False)}
            )
        messages.append({"role": "user", "content": prompt})

        result = await self.llm.complete_json(messages, schema_name="test_plan", schema=PLAN_SCHEMA)
        return parse_plan(result.data, usage=result.usage)


def parse_plan(data: dict[str, Any], *, usage) -> PlanDraft:
    """Kiểm tra JSON của LLM rồi đổi sang PlanDraft. Sai định dạng → LLMError."""
    try:
        steps = [
            StepDraft(action=s["action"].strip(), selector=s["selector"].strip(), expected=s["expected"].strip())
            for s in data["steps"]
        ]
        steps = [s for s in steps if s.action]
        if not steps:
            raise LLMError("The planner returned a plan without steps")
        return PlanDraft(
            title=(data["title"].strip() or "Untitled test")[:120],
            reply=data["reply"].strip(),
            objective=data["objective"].strip(),
            target_url=data["target_url"].strip(),
            preconditions=[p.strip() for p in data["preconditions"] if p.strip()],
            test_data={kv["key"]: kv["value"] for kv in data["test_data"] if kv["key"]},
            steps=steps[:MAX_STEPS],
            usage=usage,
        )
    except (KeyError, TypeError, AttributeError) as exc:
        raise LLMError("The planner returned JSON in an unexpected shape") from exc
