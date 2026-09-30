from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

LlmProvider = Literal["google", "openai", "anthropic", "openrouter", "deepseek", "azure", "hub1"]
Theme = Literal["light", "dark"]


class ProfileOut(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    created_at: datetime


class ProfileUpdateIn(BaseModel):
    display_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)] | None = None
    email: Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, max_length=254)] | None = None
    model_config = ConfigDict(extra="ignore")


class ChangePasswordIn(BaseModel):
    current_password: Annotated[str, StringConstraints(min_length=1, max_length=128)]
    new_password: Annotated[str, StringConstraints(min_length=8, max_length=128)]


class ApiKeyOut(BaseModel):
    provider: LlmProvider
    configured: bool
    last4: str | None
    updated_at: datetime | None
    model_config = ConfigDict(from_attributes=True)


class ApiKeySetIn(BaseModel):
    api_key: Annotated[str, StringConstraints(strip_whitespace=True, min_length=8, max_length=4000)]
    config: dict[str, Any] = Field(default_factory=dict)


class PreferencesOut(BaseModel):
    theme: Theme
    notifications: dict[str, Any]
    model_config = ConfigDict(from_attributes=True)


class PreferencesUpdateIn(BaseModel):
    theme: Theme | None = None
    notifications: dict[str, Any] | None = None
    model_config = ConfigDict(extra="ignore")
