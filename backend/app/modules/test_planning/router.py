from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.llm.factory import get_planner
from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.session import get_session
from app.modules.test_planning.repository import PlanningRepository
from app.modules.test_planning.schemas import (
    ConversationDetailOut,
    ConversationOut,
    ConversationPatchIn,
    GeneratePlanIn,
    GeneratePlanOut,
    PlanOut,
    UpdateStepsIn,
)
from app.modules.test_planning.service import PlanningService

router = APIRouter(tags=["test_planning"])


def get_planning_service(session: Annotated[AsyncSession, Depends(get_session)]) -> PlanningService:
    # Không cần gọi LLM (đọc/sửa) → không tạo Planner, để các endpoint này vẫn chạy khi thiếu OPENAI_API_KEY.
    return PlanningService(PlanningRepository(session), planner=None)


def get_generating_service(
    session: Annotated[AsyncSession, Depends(get_session)], planner=Depends(get_planner)
) -> PlanningService:
    return PlanningService(PlanningRepository(session), planner=planner)


Svc = Annotated[PlanningService, Depends(get_planning_service)]


@router.post("/tasks/generate-plan", response_model=Envelope[GeneratePlanOut])
async def generate_plan(
    payload: GeneratePlanIn, user: CurrentUser, svc: Annotated[PlanningService, Depends(get_generating_service)]
):
    return ok(await svc.generate_plan(user, payload))


@router.get("/plans/{plan_id}", response_model=Envelope[PlanOut])
async def get_plan(plan_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.get_plan(user, plan_id))


@router.put("/plans/{plan_id}/steps", response_model=Envelope[PlanOut])
async def update_steps(plan_id: str, payload: UpdateStepsIn, user: CurrentUser, svc: Svc):
    return ok(await svc.update_steps(user, plan_id, payload.steps))


@router.get("/conversations", response_model=Envelope[list[ConversationOut]])
async def list_conversations(
    user: CurrentUser, svc: Svc, q: str | None = None, limit: Annotated[int, Query(ge=1, le=100)] = 50
):
    return ok(await svc.list_conversations(user, q, limit))


@router.get("/conversations/{conversation_id}", response_model=Envelope[ConversationDetailOut])
async def get_conversation(conversation_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.get_conversation(user, conversation_id))


@router.patch("/conversations/{conversation_id}", response_model=Envelope[ConversationOut])
async def update_conversation(conversation_id: str, payload: ConversationPatchIn, user: CurrentUser, svc: Svc):
    return ok(await svc.update_conversation(user, conversation_id, payload))
