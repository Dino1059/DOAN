from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.test_planning.schemas import StepIn

RunStatus = Literal[
    "queued", "running", "paused", "waiting_human_input", "waiting_human_approval", "completed", "failed", "cancelled"
]
StepStatus = Literal["pending", "running", "passed", "failed", "skipped"]


class RunRequest(BaseModel):
    """POST /tasks/run. Chạy theo thứ tự ưu tiên: plan_id / task_id "PLN-…" > steps gửi kèm.

    Các trường frontend cũ gửi (tasks[], simulator_*, browser_config…) vẫn được nhận:
    phần cấu hình được chép vào test_runs.config, phần còn lại bỏ qua.
    """

    plan_id: str | None = None
    task_id: str | None = None  # frontend gửi plan_id trong trường này (task_id của generate-plan)
    test_case_id: str | None = None  # M10: chạy 1 test case đã lưu (TestCaseService.run gọi vào đây)
    steps: list[StepIn] | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, max_length=200)
    environment_id: str | None = None
    prompt: str | None = None
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    browser_config: dict[str, Any] = Field(default_factory=dict)
    model_config = ConfigDict(extra="ignore")

    @property
    def resolved_plan_id(self) -> str | None:
        if self.plan_id:
            return self.plan_id
        if self.task_id and self.task_id.startswith("PLN-"):
            return self.task_id
        return None

    @property
    def prompt_text(self) -> str | None:
        return self.prompt or (self.tasks[0].get("prompt") if self.tasks else None)

    def run_config(self) -> dict[str, Any]:
        task = self.tasks[0] if self.tasks else {}
        config = {k: task[k] for k in ("max_steps", "llm_provider", "llm_model") if k in task}
        config.update({k: v for k, v in self.browser_config.items() if k in ("headless", "keep_alive")})
        return config


class RunStarted(BaseModel):
    task_id: str
    run_id: str
    status: RunStatus
    message: str


class RunStepOut(BaseModel):
    id: int  # = step_no: frontend dùng id của bước để chọn Evidence
    step_no: int
    action: str
    selector: str
    expected: str
    status: StepStatus
    observation: str | None = None
    started_at: datetime | None = None
    duration_ms: int | None = None


class RunOut(BaseModel):
    id: str
    task_id: str
    status: RunStatus
    name: str
    runner: str  # "simulated" (M3a) | "playwright" (M4) — UI hiện nhãn Demo mode khi simulated
    plan_id: str | None
    test_case_id: str | None
    rerun_of: str | None
    current_step: int
    total_steps: int
    human_prompt: str | None = None  # câu hỏi đang chờ, hiện trong khung vàng Human Intervention
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
    steps: list[RunStepOut]


class HumanInputIn(BaseModel):
    action: Literal["provide_input", "approve", "reject"] = "provide_input"
    input_text: str = Field(default="", max_length=2000)

    @field_validator("input_text")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()
