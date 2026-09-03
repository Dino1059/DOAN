from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.tasks import TaskResponse


class InMemoryTaskRepository:
    def __init__(self) -> None:
        self._items: dict[str, TaskResponse] = {}

    def create(self, prompt_text: str, plan: dict | None = None, status: str = "created") -> TaskResponse:
        task = TaskResponse(
            id=f"TASK-{uuid4().hex[:8].upper()}",
            status=status,
            prompt_text=prompt_text,
            plan=plan,
            created_at=datetime.now(timezone.utc),
        )
        self._items[task.id] = task
        return task

    def get(self, task_id: str) -> TaskResponse | None:
        return self._items.get(task_id)

    def update_status(self, task_id: str, status: str) -> TaskResponse | None:
        task = self.get(task_id)
        if task:
            task.status = status
        return task

    def list(self) -> list[TaskResponse]:
        return list(reversed(list(self._items.values())))

