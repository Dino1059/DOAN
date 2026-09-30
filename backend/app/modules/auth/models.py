"""Nhóm A — tài khoản. DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4, giải thích: DATABASE_TABLES.md bảng 1–2."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("username"), UniqueConstraint("email"))

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    username: Mapped[str] = mapped_column(Text, nullable=False)  # lưu chữ thường
    email: Mapped[str] = mapped_column(Text, nullable=False)  # lưu chữ thường
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    # NULL = chưa đặt mật khẩu, không đăng nhập được (vd: user demo trước khi chạy scripts/create_admin.py)
    password_hash: Mapped[str | None] = mapped_column(Text)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuthSession(CreatedAtMixin, Base):
    """1 lần đăng nhập. Cookie giữ token gốc, bảng chỉ giữ SHA-256 của token."""

    __tablename__ = "sessions"
    __table_args__ = (UniqueConstraint("token_hash"), Index("ix_sessions_user", "user_id"))

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(Text)
