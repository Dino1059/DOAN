from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReportFormat = Literal["markdown", "pdf"]
DateRange = Literal["24h", "7d", "30d"]


class ReportGenerateIn(BaseModel):
    run_id: str
    format: ReportFormat = "markdown"
    name: str | None = Field(default=None, max_length=200)
    model_config = ConfigDict(extra="ignore")


class ReportOut(BaseModel):
    id: str
    run_id: str
    name: str
    format: ReportFormat
    shared: bool
    created_at: datetime


class ReportDetailOut(ReportOut):
    """GET /reports/{id} — Result/Duration/Failed Step tính từ run liên kết, không lưu lại ở bảng reports."""

    result: str
    duration: str
    failed_step: str


class ReportListQuery(BaseModel):
    q: str | None = Field(default=None, max_length=200)
    format: ReportFormat | None = None
    suite: str | None = None
    date_range: DateRange | None = None


class ShareOut(BaseModel):
    share_token: str
    share_path: str  # "/shared/reports/{token}" — frontend ghép với API_BASE
