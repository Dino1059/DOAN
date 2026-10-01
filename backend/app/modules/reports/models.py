"""M11: báo cáo xuất từ 1 run. DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4."""
from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin

REPORT_FORMATS = ("markdown", "pdf")


class Report(CreatedAtMixin, Base):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint("format IN (" + ", ".join(f"'{f}'" for f in REPORT_FORMATS) + ")", name="format_allowed"),
        UniqueConstraint("share_token", name="share_token"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    run_id: Mapped[str] = mapped_column(Text, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    format: Mapped[str] = mapped_column(Text, nullable=False)
    storage_key: Mapped[str] = mapped_column(Text, nullable=False)
    share_token: Mapped[str | None] = mapped_column(Text)
