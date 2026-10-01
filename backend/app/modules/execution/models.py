"""Nhóm D — thực thi. DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4, giải thích: DATABASE_TABLES.md bảng 11–13."""
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, CreatedAtMixin
from app.modules.execution.state_machine import RUN_STATUSES

STEP_STATUSES = ("pending", "running", "passed", "failed", "skipped")
INTERVENTION_KINDS = ("input", "approval")
DECISIONS = ("approved", "rejected")


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN (" + ", ".join(f"'{v}'" for v in values) + ")"


class TestRun(CreatedAtMixin, Base):
    """1 lần bấm Confirm & Run / Re-run. id chính là task_id frontend đang dùng."""

    __tablename__ = "test_runs"
    __test__ = False
    __table_args__ = (
        CheckConstraint(_in("status", RUN_STATUSES), name="status_allowed"),
        Index("ix_test_runs_owner_created", "owner_id", text("created_at DESC")),
        Index("ix_test_runs_owner_status", "owner_id", "status"),
        Index("ix_test_runs_plan", "plan_id"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # 3 nguồn gốc, đều tuỳ chọn
    plan_id: Mapped[str | None] = mapped_column(Text, ForeignKey("test_plans.id", ondelete="SET NULL"))
    test_case_id: Mapped[str | None] = mapped_column(Text, ForeignKey("test_cases.id", ondelete="SET NULL"))
    rerun_of: Mapped[str | None] = mapped_column(Text, ForeignKey("test_runs.id", ondelete="SET NULL"))
    environment_id: Mapped[str | None] = mapped_column(Text, ForeignKey("environments.id", ondelete="SET NULL"))
    # Bản chụp lúc chạy: đổi/xoá plan, môi trường sau này thì lịch sử vẫn đúng
    name: Mapped[str] = mapped_column(Text, nullable=False)
    suite: Mapped[str] = mapped_column(Text, nullable=False, server_default="Default")
    environment_name: Mapped[str | None] = mapped_column(Text)
    browser: Mapped[str] = mapped_column(Text, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="queued")
    current_step: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    steps: Mapped[list["TestRunStep"]] = relationship(
        order_by="TestRunStep.step_no", cascade="all, delete-orphan", lazy="selectin"
    )


class TestRunStep(Base):
    """Bước được CHÉP từ plan lúc bắt đầu chạy, rồi runner điền kết quả."""

    __tablename__ = "test_run_steps"
    __test__ = False
    __table_args__ = (
        UniqueConstraint("run_id", "step_no"),
        CheckConstraint(_in("status", STEP_STATUSES), name="status_allowed"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    step_no: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    selector: Mapped[str] = mapped_column(Text, nullable=False)
    expected: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="pending")
    observation: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_ms: Mapped[int | None] = mapped_column(Integer)


class RunIntervention(Base):
    """1 lần agent dừng lại hỏi người (OTP, xác nhận). answered_at trống = đang chờ."""

    __tablename__ = "run_interventions"
    __table_args__ = (
        CheckConstraint(_in("kind", INTERVENTION_KINDS), name="kind_allowed"),
        CheckConstraint(_in("decision", DECISIONS), name="decision_allowed"),
        # Mỗi run chỉ chờ 1 câu hỏi tại một thời điểm
        Index("ux_run_interventions_open", "run_id", unique=True, postgresql_where=text("answered_at IS NULL")),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    step_id: Mapped[str | None] = mapped_column(Text, ForeignKey("test_run_steps.id", ondelete="SET NULL"))
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text)
    decision: Mapped[str | None] = mapped_column(Text)
    answered_by: Mapped[str | None] = mapped_column(Text, ForeignKey("users.id", ondelete="SET NULL"))
    asked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
