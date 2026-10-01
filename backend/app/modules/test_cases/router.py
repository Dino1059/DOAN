from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.repository import OwnedRepository
from app.db.session import get_session
from app.modules.execution.router import get_execution_service
from app.modules.execution.schemas import RunStarted
from app.modules.execution.service import ExecutionService
from app.modules.test_cases.models import TestCase
from app.modules.test_cases.schemas import RunTestCaseIn, SaveFromPlanIn, TestCaseIn, TestCaseOut, TestCaseUpdate
from app.modules.test_cases.service import TestCaseService
from app.modules.test_planning.repository import PlanningRepository
from app.modules.test_planning.service import PlanningService

router = APIRouter(prefix="/test-cases", tags=["test_cases"])


def get_test_case_service(
    session: Annotated[AsyncSession, Depends(get_session)],
    execution: Annotated[ExecutionService, Depends(get_execution_service)],
) -> TestCaseService:
    planning = PlanningService(PlanningRepository(session), planner=None)
    return TestCaseService(OwnedRepository(TestCase, session), planning, execution)


Svc = Annotated[TestCaseService, Depends(get_test_case_service)]


@router.get("", response_model=Envelope[list[TestCaseOut]])
async def list_test_cases(
    user: CurrentUser, svc: Svc,
    q: str | None = Query(default=None, max_length=200),
    suite: str | None = Query(default=None, max_length=120),
    tag: str | None = Query(default=None, max_length=40),
):
    cases = await svc.list(user, q=q, suite=suite, tag=tag)
    return ok([TestCaseOut.model_validate(c) for c in cases])


@router.post("", status_code=201, response_model=Envelope[TestCaseOut])
async def create_test_case(payload: TestCaseIn, user: CurrentUser, svc: Svc):
    return ok(TestCaseOut.model_validate(await svc.create(user, payload)))


@router.post("/from-plan/{plan_id}", status_code=201, response_model=Envelope[TestCaseOut])
async def save_test_case_from_plan(plan_id: str, payload: SaveFromPlanIn, user: CurrentUser, svc: Svc):
    return ok(TestCaseOut.model_validate(await svc.save_from_plan(user, plan_id, payload)))


@router.get("/{test_case_id}", response_model=Envelope[TestCaseOut])
async def get_test_case(test_case_id: str, user: CurrentUser, svc: Svc):
    return ok(TestCaseOut.model_validate(await svc.get_or_404(user, test_case_id)))


@router.put("/{test_case_id}", response_model=Envelope[TestCaseOut])
async def update_test_case(test_case_id: str, payload: TestCaseUpdate, user: CurrentUser, svc: Svc):
    return ok(TestCaseOut.model_validate(await svc.update(user, test_case_id, payload)))


@router.delete("/{test_case_id}", status_code=204)
async def delete_test_case(test_case_id: str, user: CurrentUser, svc: Svc) -> None:
    await svc.delete(user, test_case_id)


@router.post("/{test_case_id}/run", status_code=202, response_model=Envelope[RunStarted])
async def run_test_case(test_case_id: str, user: CurrentUser, svc: Svc, payload: RunTestCaseIn = RunTestCaseIn()):
    return ok(await svc.run(user, test_case_id, payload.environment_id))
