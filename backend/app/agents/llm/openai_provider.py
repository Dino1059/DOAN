import json
import time
from typing import Any

import openai
from openai import AsyncOpenAI

from app.agents.llm.base import LLMError, LLMJsonResult
from app.agents.protocol import LLMUsage


class OpenAIProvider:
    """Gọi OpenAI Chat Completions với Structured Outputs (JSON đúng schema)."""

    provider = "openai"

    def __init__(self, api_key: str, model: str, timeout: float) -> None:
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key, timeout=timeout, max_retries=1)

    async def complete_json(
        self, messages: list[dict[str, str]], *, schema_name: str, schema: dict[str, Any]
    ) -> LLMJsonResult:
        started = time.perf_counter()
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.2,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": schema_name, "strict": True, "schema": schema},
                },
            )
        except openai.AuthenticationError as exc:
            raise LLMError("OpenAI rejected the API key") from exc
        except openai.RateLimitError as exc:
            raise LLMError("OpenAI rate limit or quota exceeded") from exc
        except openai.APITimeoutError as exc:
            raise LLMError("OpenAI request timed out") from exc
        except openai.APIError as exc:
            raise LLMError(f"OpenAI request failed: {type(exc).__name__}") from exc

        latency_ms = int((time.perf_counter() - started) * 1000)
        choice = response.choices[0]
        if getattr(choice.message, "refusal", None):
            raise LLMError("The model refused to produce a test plan for this request")
        try:
            data = json.loads(choice.message.content or "")
        except json.JSONDecodeError as exc:
            raise LLMError("OpenAI returned invalid JSON") from exc

        usage = response.usage
        return LLMJsonResult(
            data=data,
            usage=LLMUsage(
                provider=self.provider,
                model=response.model or self.model,
                prompt_tokens=getattr(usage, "prompt_tokens", 0) or 0,
                completion_tokens=getattr(usage, "completion_tokens", 0) or 0,
                latency_ms=latency_ms,
            ),
        )
