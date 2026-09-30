"""M9: API key của user (mã hoá) + tuỳ chọn cá nhân. DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4."""
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

LLM_PROVIDERS = ("google", "openai", "anthropic", "openrouter", "deepseek", "azure", "hub1")
THEMES = ("light", "dark")


class ApiKey(TimestampMixin, Base):
    __tablename__ = "api_keys"
    __table_args__ = (
        CheckConstraint("provider IN (" + ", ".join(f"'{p}'" for p in LLM_PROVIDERS) + ")", name="provider_allowed"),
        UniqueConstraint("owner_id", "provider", name="owner_provider"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    last4: Mapped[str] = mapped_column(Text, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (CheckConstraint("theme IN (" + ", ".join(f"'{t}'" for t in THEMES) + ")", name="theme_allowed"),)

    user_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    theme: Mapped[str] = mapped_column(Text, nullable=False, default="light")
    notifications: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
