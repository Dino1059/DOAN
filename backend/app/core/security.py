"""Mật khẩu (Argon2id) và token phiên đăng nhập (M7).

Token gốc chỉ nằm trong cookie của trình duyệt; DB chỉ lưu SHA-256 của nó, nên lộ DB
cũng không dùng lại được phiên nào.
"""
import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_hasher = PasswordHasher()  # argon2id, tham số mặc định của thư viện (64 MiB, t=3)
# Băm sẵn 1 mật khẩu giả: login với tài khoản không tồn tại vẫn tốn đúng thời gian như sai mật khẩu,
# để kẻ tấn công không đoán được tài khoản nào có thật qua thời gian phản hồi.
_DUMMY_HASH = _hasher.hash("not-a-real-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def new_session_token() -> tuple[str, str]:
    """(token gửi cho trình duyệt, hash lưu DB)."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
