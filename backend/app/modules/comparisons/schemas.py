from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ComparisonIn(BaseModel):
    run_a_id: str
    run_b_id: str
    name: str | None = Field(default=None, max_length=200)
    model_config = ConfigDict(extra="ignore")


class ComparisonOut(BaseModel):
    id: str
    run_a_id: str
    run_b_id: str
    name: str | None
    shared: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class RunSummary(BaseModel):
    id: str
    name: str
    status: str
    duration: str


class StepDiffOut(BaseModel):
    step_no: int
    action: str | None
    a_status: str | None
    b_status: str | None
    a_observation: str | None
    b_observation: str | None
    changed: bool


class ApiCheck(BaseModel):
    status_code: int | None
    response_body: Any | None


class ApiDiffOut(BaseModel):
    step_no: int
    changed: bool
    a: ApiCheck | None
    b: ApiCheck | None


class ComparisonResult(BaseModel):
    run_a: RunSummary
    run_b: RunSummary
    result: str  # vd "Passed -> Failed"
    time_difference: str  # vd "+3.2s"
    changed_steps: str  # vd "2 / 8"
    visual_difference: str  # vd "1 region" | "No visual diff data"
    steps: list[StepDiffOut]
    api_diff: list[ApiDiffOut]


class ComparisonDetailOut(ComparisonOut):
    result: ComparisonResult


class ShareOut(BaseModel):
    share_token: str
    share_path: str
