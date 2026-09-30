from datetime import datetime
from typing import Any

from pydantic import BaseModel


class EvidenceOut(BaseModel):
    id: str
    kind: str  # network | screenshot | agent_log | console | visual_diff
    payload: dict[str, Any] | None
    file_url: str | None  # ảnh: GET /evidence/files/{id}
    created_at: datetime


class StepEvidenceOut(BaseModel):
    """GET /evidence/{run_id}/steps/{step_no} — đủ dữ liệu cho 5 tab Evidence Inspector."""

    run_id: str
    step_no: int
    items: list[EvidenceOut]
