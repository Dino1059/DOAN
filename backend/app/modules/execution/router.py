import json
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.fakes import SimulatedRunner
from app.agents.orchestrator import Orchestrator
from app.core.config import settings
from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.session import SessionLocal, get_session
from app.modules.evidence.router import storage as evidence_storage
from app.modules.evidence.service import EvidenceRecorder
from app.modules.execution.control import run_control
from app.modules.execution.events import run_events
from app.modules.execution.repository import RunStore
from app.modules.execution.runner import RunLauncher
from app.modules.execution.schemas import HumanInputIn, RunOut, RunRequest, RunStarted
from app.modules.execution.service import ExecutionService, note_run_finished
from app.modules.execution.state_machine import TERMINAL
from app.modules.test_planning.repository import PlanningRepository
from app.modules.test_planning.service import PlanningService

# AGENT_MODE=real (mặc định) → Orchestrator mở Playwright thật. AGENT_MODE=fake (test, demo khi
# không có Chromium) → SimulatedRunner (M3a). Cùng chữ ký run(), router/service không cần biết khác nhau.
_runner = (
    SimulatedRunner(settings.simulated_step_seconds, settings.human_input_timeout_seconds)
    if settings.agent_mode == "fake"
    else Orchestrator(settings.human_input_timeout_seconds)
)
run_launcher = RunLauncher(
    runner=_runner,
    store=RunStore(SessionLocal, on_finished=note_run_finished, evidence=EvidenceRecorder(SessionLocal, evidence_storage)),
    control=run_control,
    events=run_events,
)

router = APIRouter(tags=["execution"])
SSE_PING_SECONDS = 15


def get_execution_service(session: Annotated[AsyncSession, Depends(get_session)]) -> ExecutionService:
    planning = PlanningService(PlanningRepository(session), planner=None)
    return ExecutionService(session, planning, run_launcher, run_control, run_events)


Svc = Annotated[ExecutionService, Depends(get_execution_service)]


@router.post("/tasks/run", status_code=202, response_model=Envelope[RunStarted])
async def start_run(payload: RunRequest, user: CurrentUser, svc: Svc):
    return ok(await svc.start(user, payload))


# GET /tasks/history/runs chuyển sang modules/test_runs (M5).


@router.get("/tasks/{run_id}", response_model=Envelope[RunOut])
async def get_run(run_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.get(user, run_id))


@router.post("/tasks/{run_id}/pause", response_model=Envelope[RunOut])
async def pause_run(run_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.pause(user, run_id))


@router.post("/tasks/{run_id}/resume", response_model=Envelope[RunOut])
async def resume_run(run_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.resume(user, run_id))


@router.post("/tasks/{run_id}/cancel", response_model=Envelope[RunOut])
async def cancel_run(run_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.cancel(user, run_id))


@router.post("/tasks/{run_id}/human-input", response_model=Envelope[RunOut])
async def human_input(run_id: str, payload: HumanInputIn, user: CurrentUser, svc: Svc):
    return ok(await svc.provide_human_input(user, run_id, payload))


@router.post("/test-runs/{run_id}/rerun", status_code=202, response_model=Envelope[RunStarted])
async def rerun(run_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.rerun(user, run_id))


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event, default=str)}\n\n"


@router.get("/tasks/stream/{run_id}")
async def stream_run(run_id: str, user: CurrentUser, svc: Svc) -> StreamingResponse:
    # Đăng ký nhận sự kiện TRƯỚC khi đọc snapshot, để không lỡ sự kiện xảy ra giữa 2 việc.
    sub = run_events.subscribe(run_id)
    try:
        run = await svc.get(user, run_id)  # không phải của mình / không có → 404
    except Exception:
        sub.close()
        raise

    async def gen():
        try:
            yield _sse({"type": "snapshot", **run.model_dump(mode="json")})
            if run.status in TERMINAL:
                return
            while True:
                event = await sub.get(timeout=SSE_PING_SECONDS)
                if event is None:
                    yield ": ping\n\n"  # giữ kết nối qua proxy
                    continue
                yield _sse(event)
                if event.get("type") == "status" and event.get("status") in TERMINAL:
                    return
        finally:
            sub.close()

    return StreamingResponse(
        gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
