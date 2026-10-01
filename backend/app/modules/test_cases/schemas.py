from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.modules.test_planning.schemas import StepIn

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Suite = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class TestCaseIn(BaseModel):
    """Tạo thủ công (hiếm dùng — nguồn chính là Save as Test Case từ plan)."""

    name: Name
    suite: Suite = "Default"
    tags: list[Tag] = Field(default_factory=list, max_length=20)
    steps: list[StepIn] = Field(min_length=1, max_length=50)
    model_config = ConfigDict(extra="ignore")


class TestCaseUpdate(BaseModel):
    name: Name | None = None
    suite: Suite | None = None
    tags: list[Tag] | None = Field(default=None, max_length=20)
    steps: list[StepIn] | None = Field(default=None, min_length=1, max_length=50)
    model_config = ConfigDict(extra="ignore")


class SaveFromPlanIn(BaseModel):
    """POST /test-cases/from-plan/{plan_id} — mặc định lấy tên/plan hiện tại nếu không gửi."""

    name: Name | None = None
    suite: Suite = "Default"
    tags: list[Tag] = Field(default_factory=list, max_length=20)
    model_config = ConfigDict(extra="ignore")


class RunTestCaseIn(BaseModel):
    environment_id: str | None = None


class TestCaseStepOut(BaseModel):
    action: str
    selector: str
    expected: str


class TestCaseOut(BaseModel):
    id: str
    source_plan_id: str | None
    name: str
    suite: str
    tags: list[str]
    steps: list[TestCaseStepOut]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
