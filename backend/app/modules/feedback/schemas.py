from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.modules.feedback.models import MESSAGE_MAX_LENGTH

Category = Literal["Product experience", "Bug report", "Feature request", "Other"]


class FeedbackIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    category: Category
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MESSAGE_MAX_LENGTH)]
    # api.ts vẫn gửi "username"; bỏ qua cho tới khi có auth (M7), lúc đó lấy user từ phiên đăng nhập.
    model_config = ConfigDict(extra="ignore")


class FeedbackOut(BaseModel):
    id: str
    rating: int
    category: Category
    message: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class FeedbackReceived(BaseModel):
    # "status" giữ để tương thích api.ts hiện tại; "data" theo envelope chung.
    status: Literal["received"] = "received"
    data: FeedbackOut
