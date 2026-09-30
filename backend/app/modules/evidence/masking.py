"""Che bí mật (mật khẩu, token, OTP...) trong log / network / console TRƯỚC khi lưu vào DB.

Bằng chứng được xem lại, xuất báo cáo và chia sẻ (M11) — nên không bao giờ được chứa bí mật gốc.
"""
import json
import re
from typing import Any

MASK = "••••"

# Tên khoá coi là bí mật (so khớp sau khi bỏ '-', '_' và viết thường)
_SECRET_KEY_PARTS = ("password", "passwd", "pwd", "token", "secret", "otp", "authorization", "apikey", "cookie", "session")
_SECRET_KEYS_EXACT = {"code", "pin", "cvv"}

# Trong văn bản tự do: "password": "123", password=123, token: abc, Bearer xxx
_KV_RE = re.compile(
    r"""(?ix)
    (["']?(?:password|passwd|pwd|token|access_token|refresh_token|secret|otp|api[_-]?key|authorization|pin)["']?
      \s*[:=]\s*["']?)
    ([^"'&\s,;}]+)
    """
)
_BEARER_RE = re.compile(r"(?i)\b(bearer\s+)[A-Za-z0-9._~+/=-]+")


def is_secret_key(key: str) -> bool:
    k = re.sub(r"[-_\s]", "", key.lower())
    return k in _SECRET_KEYS_EXACT or any(part in k for part in _SECRET_KEY_PARTS)


def mask_text(text: str) -> str:
    # Bearer trước: "Authorization: Bearer xyz" — nếu che key=value trước thì chữ "Bearer" bị che, token lộ ra
    text = _BEARER_RE.sub(lambda m: m.group(1) + MASK, text)
    return _KV_RE.sub(lambda m: m.group(1) + MASK, text)


def mask_secrets(value: Any) -> Any:
    """Che đệ quy: khoá bí mật → MASK; chuỗi → che các cặp key=value bí mật bên trong."""
    if isinstance(value, dict):
        return {k: (MASK if is_secret_key(str(k)) and v not in (None, "") else mask_secrets(v)) for k, v in value.items()}
    if isinstance(value, list):
        return [mask_secrets(v) for v in value]
    if isinstance(value, str):
        return mask_text(value)
    return value


def mask_body(body: str) -> str:
    """Body response: là JSON thì che theo khoá, không thì che theo văn bản."""
    try:
        return json.dumps(mask_secrets(json.loads(body)), ensure_ascii=False, indent=2)
    except (ValueError, TypeError):
        return mask_text(body)
