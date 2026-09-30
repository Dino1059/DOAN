import asyncio
import os
import shutil
from pathlib import Path

# Phải đặt trước khi import app: settings đọc biến môi trường lúc import.
os.environ["APP_ENV"] = "test"
os.environ["AUTH_REQUIRED"] = "false"  # test cũ chạy như user demo; test_auth.py tự bật lại
os.environ["AGENT_MODE"] = "fake"  # test không gọi OpenAI thật (xem test_planner_live.py để test thật)
os.environ["SIMULATED_STEP_SECONDS"] = "0.05"  # runner giả lập chạy nhanh trong test
os.environ["ARTIFACTS_DIR"] = str(  # file evidence của test không lẫn với dữ liệu dev
    Path(__file__).resolve().parent.parent / "data" / "test-artifacts"
)
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://localhost/ai_agent_tester_test"
)

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

from app.core.config import get_settings  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DB_URL = get_settings().async_database_url


def run_sql(sql: str, params: dict | None = None) -> list:
    """Chạy 1 câu SQL trên DB test, trả về các dòng (dùng để kiểm tra dữ liệu đã lưu)."""

    async def _run():
        engine = create_async_engine(TEST_DB_URL, poolclass=NullPool)
        async with engine.begin() as conn:
            result = await conn.execute(text(sql), params or {})
            rows = result.mappings().all() if result.returns_rows else []
        await engine.dispose()
        return [dict(r) for r in rows]

    return asyncio.run(_run())


def ensure_user(user_id: str, *, username: str | None = None) -> None:
    """Tạo user (không mật khẩu) nếu chưa có — owner_id có khoá ngoại tới users từ M7."""
    name = (username or user_id).lower()
    run_sql(
        "INSERT INTO users (id, username, email, display_name) VALUES (:id, :u, :e, :d) ON CONFLICT (id) DO NOTHING",
        {"id": user_id, "u": name, "e": f"{name}@example.test", "d": name},
    )


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    """Dựng schema bằng chính migration Alembic: kiểm tra luôn migration chạy được."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.attributes["url"] = TEST_DB_URL
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture
def client():
    with TestClient(app_instance()) as c:
        yield c


@pytest.fixture
def clean_db():
    """Xoá dữ liệu mọi bảng (giữ cấu trúc) trước mỗi test cần DB sạch."""
    from app.db.all_models import Base

    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    run_sql(f"TRUNCATE {tables} CASCADE")
    ensure_user(get_settings().demo_user_id, username="admin123")  # chủ mặc định của dữ liệu test (M7)
    shutil.rmtree(get_settings().artifacts_dir, ignore_errors=True)  # file evidence (M6) của test trước
    yield


@pytest.fixture
def clean_feedback(clean_db):
    yield


def app_instance():
    from app.main import app

    return app
