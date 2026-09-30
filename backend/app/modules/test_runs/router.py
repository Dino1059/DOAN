from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.session import get_session
from app.modules.test_runs.repository import TestRunsRepository
from app.modules.test_runs.schemas import FilterOptions, RunDetail, RunHistoryItem, RunListQuery, RunPage
from app.modules.test_runs.service import TestRunsService

router = APIRouter(tags=["test_runs"])


def get_test_runs_service(session: Annotated[AsyncSession, Depends(get_session)]) -> TestRunsService:
    return TestRunsService(TestRunsRepository(session))


Svc = Annotated[TestRunsService, Depends(get_test_runs_service)]


@router.get("/test-runs", response_model=Envelope[RunPage])
async def list_runs(user: CurrentUser, svc: Svc, query: Annotated[RunListQuery, Query()]):
    return ok(await svc.list(user, query))


# Khai báo TRƯỚC /test-runs/{run_id}, nếu không "filters" bị hiểu là một run_id.
@router.get("/test-runs/filters", response_model=Envelope[FilterOptions])
async def filter_options(user: CurrentUser, svc: Svc):
    return ok(await svc.filter_options(user))


@router.get("/test-runs/{run_id}", response_model=Envelope[RunDetail])
async def run_detail(run_id: str, user: CurrentUser, svc: Svc):
    return ok(await svc.detail(user, run_id))


# Alias cũ cho api.ts (fetchRunHistory). Khai báo trước /tasks/{run_id} của execution — xem main.py.
@router.get("/tasks/history/runs", response_model=Envelope[list[RunHistoryItem]])
async def run_history(user: CurrentUser, svc: Svc, limit: Annotated[int, Query(ge=1, le=100)] = 50):
    page = await svc.list(user, RunListQuery(page_size=limit))
    return ok(page.items)
