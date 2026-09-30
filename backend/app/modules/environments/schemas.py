from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Browser = Literal["chromium", "firefox", "webkit", "headless_node"]
LlmProvider = Literal["google", "openai", "anthropic", "openrouter", "deepseek", "azure", "hub1"]


class EnvironmentIn(BaseModel):
    """Dùng cho cả POST (tạo mới) lẫn PUT (sửa, `exclude_unset` nên chỉ trường gửi lên mới đổi)."""

    name: str = Field(min_length=1, max_length=200)
    base_url: str = Field(min_length=1, max_length=2000)
    browser: Browser = "chromium"
    headless: bool = True
    viewport_width: int = Field(default=1920, ge=320, le=7680)
    viewport_height: int = Field(default=1080, ge=240, le=4320)
    llm_provider: LlmProvider = "openai"
    llm_model: str = Field(default="gpt-4o-mini", min_length=1, max_length=200)
    model_config = ConfigDict(extra="ignore")


class EnvironmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    base_url: str | None = Field(default=None, min_length=1, max_length=2000)
    browser: Browser | None = None
    headless: bool | None = None
    viewport_width: int | None = Field(default=None, ge=320, le=7680)
    viewport_height: int | None = Field(default=None, ge=240, le=4320)
    llm_provider: LlmProvider | None = None
    llm_model: str | None = Field(default=None, min_length=1, max_length=200)
    model_config = ConfigDict(extra="ignore")


class EnvironmentOut(BaseModel):
    id: str
    name: str
    base_url: str
    browser: str
    headless: bool
    viewport_width: int
    viewport_height: int
    llm_provider: str
    llm_model: str
    last_check_status: str | None
    last_checked_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TestConnectionOut(BaseModel):
    status: Literal["connected", "error"]
    detail: str
