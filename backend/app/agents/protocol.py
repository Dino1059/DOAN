"""Kiểu dữ liệu trao đổi giữa các agent và phần còn lại của backend."""
from dataclasses import dataclass, field


@dataclass(frozen=True)
class LLMUsage:
    provider: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    latency_ms: int = 0


@dataclass(frozen=True)
class StepDraft:
    action: str
    selector: str
    expected: str


@dataclass(frozen=True)
class PlanDraft:
    title: str          # tên phiên chat (Session History)
    reply: str          # câu trả lời ngắn của Planner Agent hiện trong khung chat
    objective: str
    target_url: str
    preconditions: list[str]
    test_data: dict[str, str]
    steps: list[StepDraft]
    usage: LLMUsage = field(default_factory=lambda: LLMUsage(provider="none", model="none"))


@dataclass(frozen=True)
class ChatTurn:
    role: str  # "user" | "assistant"
    content: str


@dataclass(frozen=True)
class RawObservation:
    """Browser Executor Agent thực hiện xong 1 bước, CHƯA quyết định passed/failed (việc của Evaluator)."""

    ok: bool  # executor làm được hành động (goto/click/fill/tìm thấy phần tử) hay không
    detail: str  # bước Verify: giá trị/trạng thái quan sát được; bước hành động: mô tả đã làm gì
    extra: dict | None = None  # dữ liệu phụ cho evidence (vd: bước Verify API → method, status, body)


@dataclass(frozen=True)
class NeedHumanInput:
    """User Simulator Agent không có dữ liệu để điền (OTP, captcha...) → runner phải dừng lại hỏi."""

    question: str


@dataclass(frozen=True)
class StepResult:
    """Kết quả 1 bước, trả về từ Browser Executor Agent (M4) hoặc SimulatedRunner (M3a)."""

    status: str  # "passed" | "failed"
    observation: str
    duration_ms: int = 0


@dataclass(frozen=True)
class Artifact:
    """1 bằng chứng của 1 bước (M6). `data` là file lớn (PNG), `payload` là dữ liệu nhỏ lưu JSONB."""

    kind: str  # network | screenshot | agent_log | console | visual_diff
    payload: dict | None = None
    data: bytes | None = None
