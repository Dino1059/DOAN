from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.db.session import engine

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> JSONResponse:
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "error"
    status_code = 200 if database == "ok" else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": "ok" if database == "ok" else "error", "service": "ai-agent-tester-api", "database": database},
    )
