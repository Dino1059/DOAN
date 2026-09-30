from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.modules.execution.schemas import RunStatus, StepStatus

DateRange = Literal["24h", "7d", "30d"]


class RunListQuery(BaseModel):
    """Tham số của GET /test-runs. Mọi bộ lọc kết hợp với nhau bằng AND."""

    q: str | None = Field(default=None, max_length=200)  # tìm theo Run ID hoặc tên
    status: str | None = None
    suite: str | None = None
    env: str | None = None
    browser: str | None = None
    date_range: DateRange | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=8, ge=1, le=100)


class RunHistoryItem(BaseModel):
    """1 dòng bảng Test Runs (khớp RunHistoryItem trong frontend/src/api/contract.ts)."""

    run_id: str
    task_id: str
    name: str
    suite: str
    env: str
    browser: str
    status: RunStatus
    duration: str
    created_at: datetime
    passed_steps: int
    failed_steps: int


class RunPage(BaseModel):
    items: list[RunHistoryItem]
    total: int
    page: int
    page_size: int


class FilterOptions(BaseModel):
    """Giá trị có thật trong DB của user, để đổ vào các dropdown lọc."""

    statuses: list[str]
    suites: list[str]
    envs: list[str]
    browsers: list[str]


class RunDetailStep(BaseModel):
    id: int  # = step_no, frontend chọn bước bằng id
    step_no: int
    action: str
    selector: str
    expected: str
    status: StepStatus
    observation: str | None
    started_at: datetime | None
    duration_ms: int | None


class InterventionOut(BaseModel):
    step_no: int | None
    kind: str
    question: str
    answer: str | None  # đã che nếu là bí mật (OTP → "••••56")
    decision: str | None
    asked_at: datetime
    answered_at: datetime | None


class RunDetail(RunHistoryItem):
    """GET /test-runs/{id} — RunDetailModal."""

    runner: str
    plan_id: str | None
    rerun_of: str | None
    error_message: str | None
    started_at: datetime | None
    finished_at: datetime | None
    steps: list[RunDetailStep]
    interventions: list[InterventionOut]
