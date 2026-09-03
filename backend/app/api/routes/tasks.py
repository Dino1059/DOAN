import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.tasks import HumanInput, PlanRequest, RunRequest, TaskResponse
from app.services.task_service import task_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/generate-plan")
def generate_plan(payload: PlanRequest) -> dict:
    task = task_service.generate_plan(payload)
    return {"data": task.plan}


@router.post("/run")
def run_task(payload: RunRequest) -> dict:
    task = task_service.run(payload)
    return {"data": {"message": f"Task started. ID: {task.id}"}}


@router.get("/history/runs")
def history() -> dict[str, list[dict]]:
    return {"data": task_service.history()}


@router.get("/{task_id}")
def get_task(task_id: str) -> dict:
    task = task_service.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"data": task.model_dump(mode="json")}


@router.post("/{task_id}/human-input")
def provide_human_input(task_id: str, payload: HumanInput) -> dict:
    task = task_service.human_input(task_id, payload)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"data": task.model_dump(mode="json")}


@router.post("/{task_id}/{action}")
def control_task(task_id: str, action: str) -> dict:
    if action not in {"pause", "resume", "cancel"}:
        raise HTTPException(status_code=400, detail="Unsupported task action")
    task = task_service.control(task_id, action)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"data": task.model_dump(mode="json")}


@router.get("/stream/{task_id}")
async def stream_task(task_id: str) -> StreamingResponse:
    if not task_service.get(task_id):
        raise HTTPException(status_code=404, detail="Task not found")

    async def events() -> AsyncGenerator[str, None]:
        for _ in range(30):
            task = task_service.get(task_id)
            if not task:
                break
            yield f"data: {json.dumps({'status': task.status, 'task_id': task.id})}\n\n"
            if task.status in {"completed", "failed", "cancelled"}:
                break
            await asyncio.sleep(1)

    return StreamingResponse(events(), media_type="text/event-stream")
