from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Agent Tester API"
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 8081
    cors_origins: list[str] = ["http://localhost:5173"]
    database_url: str = "sqlite:///./data/app.db"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

