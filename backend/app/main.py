import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.health import router as health_router
from app.db.session import SessionLocal, engine
from app.modules.execution.repository import RunRepository
from app.modules.auth.router import router as auth_router
from app.modules.environments.router import router as environments_router
from app.modules.evidence.router import router as evidence_router
from app.modules.execution.router import router as execution_router
from app.modules.execution.router import run_launcher
from app.modules.feedback.router import router as feedback_router
from app.modules.test_planning.router import router as test_planning_router
from app.modules.test_runs.router import router as test_runs_router
from app.modules.user_settings.router import router as user_settings_router

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Runner chạy trong RAM (M3a): run dở dang của lần chạy server trước không thể tiếp tục.
    try:
        async with SessionLocal() as session:
            await RunRepository(session).fail_orphaned_runs()
            await session.commit()
    except Exception:  # DB chưa bật: vẫn khởi động, /health sẽ báo lỗi DB
        log.warning("Could not clean up unfinished runs (database unavailable?)", exc_info=True)
    yield
    await run_launcher.shutdown()
    await engine.dispose()


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_exception_handlers(app)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(test_planning_router)
# test_runs TRƯỚC execution: GET /tasks/history/runs phải khớp trước GET /tasks/{run_id}
app.include_router(test_runs_router)
app.include_router(execution_router)
app.include_router(evidence_router)
app.include_router(feedback_router)
app.include_router(environments_router)
app.include_router(user_settings_router)
