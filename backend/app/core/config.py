from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


# backend/.env — file cấu hình dùng chung (DB, OpenAI key...). Đường dẫn tuyệt đối
# để chạy uvicorn/alembic/pytest từ thư mục nào cũng đọc đúng file này.
ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_name: str = "AI Agent Tester API"
    app_env: str = "development"  # development | test | production
    host: str = "0.0.0.0"
    port: int = 8081
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"

    # PostgreSQL. Chấp nhận cả dạng ngắn "postgresql://..." hoặc "sqlite:///...";
    # async_database_url tự thêm driver async tương ứng.
    database_url: str = "postgresql+asyncpg://localhost/ai_agent_tester"

    # LLM — dự án dùng OpenAI (key đặt trong backend/.env, không commit).
    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-4o-mini"
    llm_timeout_seconds: float = 45.0
    # real = gọi OpenAI thật; fake = agents/fakes.py (test, demo khi mất mạng).
    agent_mode: Literal["real", "fake"] = "real"

    # M3a — chạy test giả lập (SimulatedRunner) cho tới khi M4 có Playwright thật.
    simulated_step_seconds: float = 2.0
    human_input_timeout_seconds: float = 600.0

    # M6 — file bằng chứng lớn (ảnh chụp, ảnh diff) lưu ngoài DB. Mặc định backend/data/artifacts/ (đã gitignore).
    artifacts_dir: Path = ENV_FILE.parent / "data" / "artifacts"

    # M7 — đăng nhập thật. auth_required=False (chỉ dùng cho test tự động): mọi request coi như
    # của user demo. Migration 0005 tạo user demo đúng id này để dữ liệu tạo trước M7 không mất chủ.
    auth_required: bool = True
    demo_user_id: str = "USR-DEMO0001"
    session_days: int = 7
    session_cookie_name: str = "session"
    # True khi chạy HTTPS (production): cookie chỉ gửi qua kết nối mã hoá
    cookie_secure: bool = False

    # M8 — chống SSRF khi tạo environment / điều hướng trong Playwright. Chỉ bật true khi
    # target thật sự là máy local (demo), KHÔNG bật ở production.
    allow_private_targets: bool = False

    # M9 — mã hoá API key của user trước khi lưu DB (Fernet, `core.security.encrypt_secret`).
    # Sinh 1 lần: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    secrets_key: SecretStr | None = None

    model_config = SettingsConfigDict(env_file=ENV_FILE, extra="ignore")

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            return "postgresql+asyncpg://" + url.split("://", 1)[1]
        if url.startswith("sqlite:///"):
            return "sqlite+aiosqlite:///" + url.removeprefix("sqlite:///")
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
