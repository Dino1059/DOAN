from sqlalchemy import any_

from app.core.crud_service import CrudService
from app.core.dependencies import CurrentUserInfo
from app.core.ids import new_id
from app.db.repository import OwnedRepository
from app.modules.execution.schemas import RunRequest, RunStarted
from app.modules.execution.service import ExecutionService
from app.modules.test_cases.models import TestCase
from app.modules.test_cases.schemas import SaveFromPlanIn
from app.modules.test_planning.service import PlanningService


class TestCaseService(CrudService[TestCase]):
    model = TestCase
    id_prefix = "TC"
    not_found_message = "Test case not found"

    def __init__(self, repo: OwnedRepository[TestCase], planning: PlanningService, execution: ExecutionService) -> None:
        super().__init__(repo)
        self.planning = planning
        self.execution = execution

    async def list(
        self, user: CurrentUserInfo, *, q: str | None = None, suite: str | None = None, tag: str | None = None
    ) -> list[TestCase]:
        where = []
        if q:
            where.append(TestCase.name.ilike(f"%{q}%"))
        if suite:
            where.append(TestCase.suite == suite)
        if tag:
            where.append(tag == any_(TestCase.tags))
        return await self.repo.list(user.id, where=tuple(where), order_by=(TestCase.created_at.desc(),))

    async def save_from_plan(self, user: CurrentUserInfo, plan_id: str, data: SaveFromPlanIn) -> TestCase:
        """Chép bước của plan hiện tại (bản chụp độc lập) — sửa/xoá plan sau đó không ảnh hưởng."""
        plan = await self.planning.get_plan(user, plan_id)  # không phải của mình → 404
        steps = [{"action": s.action, "selector": s.selector, "expected": s.expected} for s in plan.steps]
        test_case = self.model(
            id=new_id(self.id_prefix), owner_id=user.id, source_plan_id=plan_id,
            name=(data.name or plan.objective)[:200], suite=data.suite, tags=data.tags, steps=steps,
        )
        return await self.repo.add(test_case)

    async def run(self, user: CurrentUserInfo, test_case_id: str, environment_id: str | None) -> RunStarted:
        await self.get_or_404(user, test_case_id)  # không phải của mình → 404 trước khi giao cho execution
        return await self.execution.start(user, RunRequest(test_case_id=test_case_id, environment_id=environment_id))
