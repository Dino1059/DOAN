"""Evaluator Agent (M4): so kết quả thật (RawObservation) với `expected` của bước.

Kiểm tra đơn giản (chứa chuỗi, đúng mã trạng thái) làm trực tiếp bằng code — không cần gọi LLM
(đúng note rủi ro trong BUILD_PLAN). Bước không phải "verify" (click, fill, open url...) thì
executor làm được là coi như passed, không so sánh gì thêm.
"""
import re

from app.agents.protocol import RawObservation, StepResult

_STATUS_RE = re.compile(r"\b\d{3}\b")


def evaluate(action: str, expected: str, observation: RawObservation, duration_ms: int) -> StepResult:
    if not observation.ok:
        return StepResult("failed", observation.detail, duration_ms)

    if "verify" not in action.lower() and "check" not in action.lower():
        return StepResult("passed", observation.detail, duration_ms)

    passed, reason = _matches(expected, observation.detail)
    detail = f"Expected: {expected!r}. Observed: {observation.detail!r}."
    if not passed and reason:
        detail += f" {reason}"
    return StepResult("passed" if passed else "failed", detail, duration_ms)


def _matches(expected: str, actual: str) -> tuple[bool, str]:
    if not expected.strip():
        return True, ""  # không có kỳ vọng cụ thể → executor chạy được là đủ

    expected_status = _STATUS_RE.search(expected)
    if expected_status:
        return (expected_status.group(0) in actual), "Status code did not match."

    if expected.strip().lower() in actual.strip().lower():
        return True, ""
    return False, "Expected text was not found in what the page showed."
