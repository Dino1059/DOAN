from dataclasses import dataclass
from typing import Any, Protocol

from app.agents.protocol import LLMUsage


class LLMError(Exception):
    """LLM lỗi (mạng, quota, key sai) hoặc trả về dữ liệu không đúng định dạng."""


@dataclass(frozen=True)
class LLMJsonResult:
    data: dict[str, Any]
    usage: LLMUsage


class LLMProvider(Protocol):
    async def complete_json(
        self, messages: list[dict[str, str]], *, schema_name: str, schema: dict[str, Any]
    ) -> LLMJsonResult: ...
