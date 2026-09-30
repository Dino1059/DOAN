from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


# ---------- Vào ----------

class GeneratePlanIn(BaseModel):
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=4000)]
    # Có → tiếp tục phiên chat đó (sửa plan qua chat / Run Again). Không có → tạo phiên mới.
    conversation_id: str | None = None
    # api.ts vẫn gửi llm_provider/llm_model; backend dùng cấu hình server (OpenAI gpt-4o-mini) nên bỏ qua.
    model_config = ConfigDict(extra="ignore")


class StepIn(BaseModel):
    action: NonEmpty
    selector: Annotated[str, StringConstraints(strip_whitespace=True)] = ""
    expected: Annotated[str, StringConstraints(strip_whitespace=True)] = ""
    model_config = ConfigDict(extra="ignore")  # frontend gửi kèm id, source


class UpdateStepsIn(BaseModel):
    steps: list[StepIn] = Field(min_length=1, max_length=50)


class ConversationPatchIn(BaseModel):
    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)] | None = None
    archived: bool | None = None


# ---------- Ra ----------

class StepOut(BaseModel):
    id: int            # = step_no; frontend dùng làm key và để chọn bước trong Evidence Inspector
    step_no: int
    action: str
    selector: str
    expected: str
    source: Literal["original", "chat_edit", "manual"]


class PlanOut(BaseModel):
    plan_id: str
    task_id: str       # = plan_id; api.ts gửi lại trường này khi bấm Confirm & Run
    conversation_id: str
    version: int
    status: Literal["draft", "approved"]
    objective: str
    target_url: str
    preconditions: list[str]
    test_data: dict[str, Any]
    steps: list[StepOut]
    llm_provider: str
    llm_model: str
    created_at: datetime


class MessageOut(BaseModel):
    id: str
    seq: int
    role: str
    agent: str | None
    kind: str
    content: str
    plan_id: str | None
    run_id: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ConversationOut(BaseModel):
    id: str
    seq_no: int
    title: str
    last_message_at: datetime
    created_at: datetime
    archived: bool
    # Thông tin của plan mới nhất — dùng cho mục Session History ("N steps", URL để tìm kiếm).
    latest_plan_id: str | None = None
    latest_plan_status: str | None = None
    latest_plan_steps: int = 0
    target_url: str | None = None


class GeneratePlanOut(PlanOut):
    conversation: ConversationOut
    messages: list[MessageOut]  # tin nhắn vừa thêm: [user, planner]


class ConversationDetailOut(BaseModel):
    conversation: ConversationOut
    messages: list[MessageOut]
    latest_plan: PlanOut | None
