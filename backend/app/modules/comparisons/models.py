"""M12: cặp run được lưu để so sánh (chỉ lưu khi user bấm Save/Share — xem diff không ghi gì).
DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4.
"""
from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin


class Comparison(CreatedAtMixin, Base):
    __tablename__ = "comparisons"
    __table_args__ = (
        CheckConstraint("run_a_id <> run_b_id", name="different_runs"),
        UniqueConstraint("owner_id", "run_a_id", "run_b_id", name="owner_run_pair"),
        UniqueConstraint("share_token", name="comparisons_share_token"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    run_a_id: Mapped[str] = mapped_column(Text, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    run_b_id: Mapped[str] = mapped_column(Text, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str | None] = mapped_column(Text)
    share_token: Mapped[str | None] = mapped_column(Text)

    @property
    def shared(self) -> bool:
        return self.share_token is not None
