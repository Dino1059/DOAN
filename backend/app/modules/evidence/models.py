"""Nhóm D — bằng chứng của từng bước. DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4, giải thích: DATABASE_TABLES.md bảng 14.

Chỉ ghi thêm, không sửa. File lớn (ảnh) nằm ngoài DB — cột `storage_key` trỏ tới file trong storage.py.
"""
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin

EVIDENCE_KINDS = ("network", "screenshot", "agent_log", "console", "visual_diff")


class EvidenceArtifact(CreatedAtMixin, Base):
    __tablename__ = "evidence_artifacts"
    __table_args__ = (
        CheckConstraint("kind IN (" + ", ".join(f"'{k}'" for k in EVIDENCE_KINDS) + ")", name="kind_allowed"),
        CheckConstraint("storage_key IS NOT NULL OR payload IS NOT NULL", name="has_content"),
        Index("ix_evidence_step", "step_id"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    step_id: Mapped[str] = mapped_column(Text, ForeignKey("test_run_steps.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    storage_key: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
