from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Test: không giữ pool, vì TestClient có thể chạy mỗi request trên một event loop khác.
engine: AsyncEngine = create_async_engine(
    settings.async_database_url,
    poolclass=NullPool if settings.app_env == "test" else None,
    pool_pre_ping=settings.app_env != "test",
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Dependency: 1 request = 1 transaction. Lỗi thì rollback, xong thì commit."""
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
