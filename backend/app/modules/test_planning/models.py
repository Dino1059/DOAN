"""Nhóm C — hội thoại với LLM & thiết kế test. DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4."""
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin, TimestampMixin

MESSAGE_ROLES = ("user", "assistant", "system")
MESSAGE_AGENTS = ("planner", "browser_executor", "user_simulator", "evaluator")
MESSAGE_KINDS = ("text", "plan_created", "plan_updated", "run_started", "run_status")
PLAN_STATUSES = ("draft", "approved")
STEP_SOURCES = ("original", "chat_edit", "manual")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN (" + ", ".join(f"'{v}'" for v in values) + ")"


class Conversation(TimestampMixin, Base):
    """1 phiên chat = 1 mục trong Session History ("Session #482")."""

    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("owner_id", "seq_no"),
        Index(
            "ix_conversations_sidebar",
            "owner_id",
            text("last_message_at DESC"),
            postgresql_where=text("archived_at IS NULL"),
        ),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    seq_no: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    environment_id: Mapped[str | None] = mapped_column(Text, ForeignKey("environments.id", ondelete="SET NULL"))
    llm_provider: Mapped[str] = mapped_column(Text, nullable=False)
    llm_model: Mapped[str] = mapped_column(Text, nullable=False)
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ConversationMessage(CreatedAtMixin, Base):
    """Từng tin nhắn trong phiên. Chỉ ghi thêm, không sửa/xoá."""

    __tablename__ = "conversation_messages"
    __table_args__ = (
        UniqueConstraint("conversation_id", "seq"),
        CheckConstraint(_in("role", MESSAGE_ROLES), name="role_allowed"),
        CheckConstraint(_in("agent", MESSAGE_AGENTS), name="agent_allowed"),
        CheckConstraint(_in("kind", MESSAGE_KINDS), name="kind_allowed"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    conversation_id: Mapped[str] = mapped_column(
        Text, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    agent: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text, nullable=False, server_default="text")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # FK vòng với test_plans.source_message_id → use_alter: tạo sau khi cả 2 bảng đã có.
    plan_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("test_plans.id", ondelete="SET NULL", use_alter=True)
    )
    # FK vòng qua test_runs → test_plans → conversation_messages → use_alter giống plan_id.
    run_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("test_runs.id", ondelete="SET NULL", use_alter=True)
    )
    llm_provider: Mapped[str | None] = mapped_column(Text)
    llm_model: Mapped[str | None] = mapped_column(Text)
    prompt_tokens: Mapped[int | None] = mapped_column(Integer)
    completion_tokens: Mapped[int | None] = mapped_column(Integer)
    latency_ms: Mapped[int | None] = mapped_column(Integer)


class TestPlan(TimestampMixin, Base):
    """1 phiên bản kịch bản do LLM sinh trong 1 phiên chat."""

    __tablename__ = "test_plans"
    __test__ = False  # tên bắt đầu bằng "Test": báo pytest đây không phải class test
    __table_args__ = (
        UniqueConstraint("conversation_id", "version"),
        CheckConstraint(_in("status", PLAN_STATUSES), name="status_allowed"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id: Mapped[str] = mapped_column(
        Text, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    source_message_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("conversation_messages.id", ondelete="SET NULL")
    )
    environment_id: Mapped[str | None] = mapped_column(Text, ForeignKey("environments.id", ondelete="SET NULL"))
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    target_url: Mapped[str | None] = mapped_column(Text)
    preconditions: Mapped[list[str]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    test_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    llm_provider: Mapped[str] = mapped_column(Text, nullable=False)
    llm_model: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="draft")

    steps: Mapped[list["TestPlanStep"]] = relationship(
        order_by="TestPlanStep.step_no", cascade="all, delete-orphan", lazy="selectin"
    )


class TestPlanStep(Base):
    __tablename__ = "test_plan_steps"
    __test__ = False
    __table_args__ = (
        UniqueConstraint("plan_id", "step_no"),
        CheckConstraint(_in("source", STEP_SOURCES), name="source_allowed"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    plan_id: Mapped[str] = mapped_column(Text, ForeignKey("test_plans.id", ondelete="CASCADE"), nullable=False)
    step_no: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    selector: Mapped[str] = mapped_column(Text, nullable=False)
    expected: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, server_default="original")
    source_message_id: Mapped[str | None] = mapped_column(
        Text, ForeignKey("conversation_messages.id", ondelete="SET NULL")
    )
