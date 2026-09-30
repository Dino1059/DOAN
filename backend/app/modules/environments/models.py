"""M8: môi trường chạy test (website, trình duyệt, LLM mặc định). DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4."""
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin

BROWSERS = ("chromium", "firefox", "webkit", "headless_node")
LLM_PROVIDERS = ("google", "openai", "anthropic", "openrouter", "deepseek", "azure", "hub1")
CHECK_STATUSES = ("connected", "error")


class Environment(TimestampMixin, Base):
    __tablename__ = "environments"
    __table_args__ = (
        CheckConstraint("browser IN (" + ", ".join(f"'{b}'" for b in BROWSERS) + ")", name="browser_allowed"),
        CheckConstraint(
            "llm_provider IN (" + ", ".join(f"'{p}'" for p in LLM_PROVIDERS) + ")", name="llm_provider_allowed"
        ),
        CheckConstraint(
            "last_check_status IS NULL OR last_check_status IN ("
            + ", ".join(f"'{s}'" for s in CHECK_STATUSES) + ")",
            name="last_check_status_allowed",
        ),
        UniqueConstraint("owner_id", "name", name="owner_name"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str] = mapped_column(Text, nullable=False)
    browser: Mapped[str] = mapped_column(Text, nullable=False, default="chromium")
    headless: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    viewport_width: Mapped[int] = mapped_column(Integer, nullable=False, default=1920)
    viewport_height: Mapped[int] = mapped_column(Integer, nullable=False, default=1080)
    llm_provider: Mapped[str] = mapped_column(Text, nullable=False, default="openai")
    llm_model: Mapped[str] = mapped_column(Text, nullable=False, default="gpt-4o-mini")
    last_check_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
