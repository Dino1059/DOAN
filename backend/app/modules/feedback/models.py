from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, CreatedAtMixin

FEEDBACK_CATEGORIES = ("Product experience", "Bug report", "Feature request", "Other")
MESSAGE_MAX_LENGTH = 500  # khớp textarea maxLength=500 ở DashboardPage.tsx


class Feedback(CreatedAtMixin, Base):
    """Góp ý từ form Feedback cuối Dashboard. DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4."""

    __tablename__ = "feedback"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),
        CheckConstraint(
            "category IN (" + ", ".join(f"'{c}'" for c in FEEDBACK_CATEGORIES) + ")",
            name="category_allowed",
        ),
        CheckConstraint(f"length(message) BETWEEN 1 AND {MESSAGE_MAX_LENGTH}", name="message_length"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    # Người gửi (M7). Xoá tài khoản thì góp ý vẫn giữ, chỉ mất liên kết.
    user_id: Mapped[str | None] = mapped_column(Text, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
