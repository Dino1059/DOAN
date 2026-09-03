from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, ConfigDict, model_validator


class PlanRequest(BaseModel):
    prompt_text: str = Field(min_length=3, validation_alias="prompt")
    model_config = ConfigDict(populate_by_name=True, extra="allow")


class RunRequest(BaseModel):
    prompt_text: str | None = Field(default=None, validation_alias="prompt")
    tasks: list[dict] = Field(default_factory=list)
    simulator_task: str | None = None
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    @model_validator(mode="after")
    def resolve_prompt(self):
        if not self.prompt_text and self.tasks:
            self.prompt_text = self.tasks[0].get("prompt")
        if not self.prompt_text:
            self.prompt_text = self.simulator_task
        if not self.prompt_text or len(self.prompt_text.strip()) < 3:
            raise ValueError("prompt or tasks[0].prompt is required")
        return self


class HumanInput(BaseModel):
    text: str = Field(min_length=1, validation_alias="input_text")
    model_config = ConfigDict(populate_by_name=True, extra="allow")


class TaskResponse(BaseModel):
    id: str
    status: str
    prompt_text: str
    plan: dict[str, Any] | None = None
    created_at: datetime
