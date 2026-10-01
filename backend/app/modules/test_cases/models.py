"""M10: kho test case ("Save as Test Case"). DDL: BACKEND_STRUCTURE_PLAN.md mục 10.4."""
from typing import Any

from sqlalchemy import ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin


class TestCase(TimestampMixin, Base):
    __tablename__ = "test_cases"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    owner_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Plan nguồn (tuỳ chọn): xoá plan thì test case vẫn còn, vì `steps` đã là bản chụp độc lập.
    source_plan_id: Mapped[str | None] = mapped_column(Text, ForeignKey("test_plans.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    suite: Mapped[str] = mapped_column(Text, nullable=False, default="Default")
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    # Bản chụp các bước lúc lưu: [{"action", "selector", "expected"}, ...]. Sửa plan gốc không ảnh hưởng.
    steps: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
