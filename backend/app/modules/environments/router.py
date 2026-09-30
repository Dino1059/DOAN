from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.core.response import Envelope, ok
from app.db.repository import OwnedRepository
from app.db.session import get_session
from app.modules.environments.models import Environment
from app.modules.environments.schemas import EnvironmentIn, EnvironmentOut, EnvironmentUpdate, TestConnectionOut
from app.modules.environments.service import EnvironmentService

router = APIRouter(prefix="/environments", tags=["environments"])


def get_environment_service(session: Annotated[AsyncSession, Depends(get_session)]) -> EnvironmentService:
    return EnvironmentService(OwnedRepository(Environment, session))


EnvSvc = Annotated[EnvironmentService, Depends(get_environment_service)]


@router.get("", response_model=Envelope[list[EnvironmentOut]])
async def list_environments(user: CurrentUser, svc: EnvSvc):
    return ok([EnvironmentOut.model_validate(e) for e in await svc.list(user, order_by=(Environment.name,))])


@router.post("", status_code=201, response_model=Envelope[EnvironmentOut])
async def create_environment(payload: EnvironmentIn, user: CurrentUser, svc: EnvSvc):
    return ok(EnvironmentOut.model_validate(await svc.create(user, payload)))


@router.get("/{env_id}", response_model=Envelope[EnvironmentOut])
async def get_environment(env_id: str, user: CurrentUser, svc: EnvSvc):
    return ok(EnvironmentOut.model_validate(await svc.get_or_404(user, env_id)))


@router.put("/{env_id}", response_model=Envelope[EnvironmentOut])
async def update_environment(env_id: str, payload: EnvironmentUpdate, user: CurrentUser, svc: EnvSvc):
    return ok(EnvironmentOut.model_validate(await svc.update(user, env_id, payload)))


@router.delete("/{env_id}", status_code=204)
async def delete_environment(env_id: str, user: CurrentUser, svc: EnvSvc) -> None:
    await svc.delete(user, env_id)


@router.post("/{env_id}/test-connection", response_model=Envelope[TestConnectionOut])
async def test_connection(env_id: str, user: CurrentUser, svc: EnvSvc):
    return ok(await svc.test_connection(user, env_id))
