"""User Simulator Agent (M4): chọn giá trị để điền vào 1 bước Fill/Select.

Không có dữ liệu cho ô cần điền:
- Là bí mật (OTP, mật khẩu, captcha...) → NeedHumanInput, orchestrator dừng lại hỏi người.
- Còn lại → dùng giá trị mặc định hợp lý (không chặn luồng vì những việc AI tự bịa được).
"""
import re

from app.agents.protocol import NeedHumanInput

_SECRET_RE = re.compile(r"\b(otp|verification code|2fa|captcha|one[- ]time code)\b", re.I)
_FIELD_DEFAULTS = (
    (re.compile(r"e[-\s]?mail", re.I), "user@example.test"),
    (re.compile(r"pass(word)?", re.I), "Test-Pass123!"),
    (re.compile(r"phone|mobile", re.I), "+1 555 0100"),
    (re.compile(r"name", re.I), "Test User"),
    (re.compile(r"search|query|keyword", re.I), "test"),
)


_PASSWORD_RE = re.compile(r"pass(word|code)?|pin\b", re.I)


def is_secret_field(selector: str, expected: str) -> bool:
    """Ô chứa bí mật (mật khẩu, OTP...) → giá trị điền vào phải che trong observation, log, evidence."""
    haystack = f"{selector} {expected}"
    return bool(_SECRET_RE.search(haystack) or _PASSWORD_RE.search(haystack))


def fill_value(action: str, selector: str, expected: str, test_data: dict[str, str]) -> str | NeedHumanInput:
    if "fill" not in action.lower() and "type" not in action.lower() and "select" not in action.lower():
        return ""

    haystack = f"{selector} {expected}"
    match = _find_in_test_data(haystack, test_data)
    if match is not None:
        return match

    if _SECRET_RE.search(haystack):
        return NeedHumanInput(f"This step needs a value the planner doesn't have (OTP/code) for '{selector}'. Please provide it.")

    for pattern, default in _FIELD_DEFAULTS:
        if pattern.search(haystack):
            return default
    return "Test value"


def _find_in_test_data(haystack: str, test_data: dict[str, str]) -> str | None:
    haystack = haystack.lower()
    for key, value in test_data.items():
        key_words = re.sub(r"[_\-]", " ", key).lower()
        if key_words in haystack or any(w in haystack for w in key_words.split() if len(w) > 2):
            return str(value)
    return None
