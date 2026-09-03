from app.repositories.task_repository import InMemoryTaskRepository
from app.schemas.tasks import HumanInput, PlanRequest, RunRequest, TaskResponse

repository = InMemoryTaskRepository()


class TaskService:
    def generate_plan(self, payload: PlanRequest) -> TaskResponse:
        plan = {
            "objective": payload.prompt_text,
            "target_url": "",
            "preconditions": [],
            "test_data": {},
            "steps": [],
        }
        return repository.create(payload.prompt_text, plan, "plan_ready")

    def run(self, payload: RunRequest) -> TaskResponse:
        return repository.create(payload.prompt_text, status="running")

    def get(self, task_id: str) -> TaskResponse | None:
        return repository.get(task_id)

    def history(self) -> list[dict]:
        return [
            {
                "run_id": task.id.replace("TASK-", "RUN-"),
                "task_id": task.id,
                "name": task.prompt_text[:80],
                "suite": "E2E Test Suite",
                "env": "Staging Engine",
                "browser": "Chromium v124",
                "status": task.status,
                "duration": "0.0s",
                "created_at": task.created_at.isoformat(),
                "passed_steps": 0,
                "failed_steps": 0,
            }
            for task in repository.list()
        ]

    def control(self, task_id: str, action: str) -> TaskResponse | None:
        status_by_action = {"pause": "paused", "resume": "running", "cancel": "cancelled"}
        return repository.update_status(task_id, status_by_action[action])

    def human_input(self, task_id: str, payload: HumanInput) -> TaskResponse | None:
        return repository.update_status(task_id, "running")


task_service = TaskService()
