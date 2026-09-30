"""Giao run cho runner chạy nền, trong cùng tiến trình với API (M3a: asyncio.create_task).

M14 thay bằng hàng đợi arq + worker riêng; service chỉ gọi launch() nên không phải sửa.
"""
import asyncio
import logging

from app.modules.execution.control import RunControl
from app.modules.execution.events import RunEvents
from app.modules.execution.repository import RunStore, StepSnapshot

log = logging.getLogger(__name__)


class RunLauncher:
    def __init__(self, runner, store: RunStore, control: RunControl, events: RunEvents) -> None:
        self.runner = runner  # SimulatedRunner (M3a) | Orchestrator (M4): cùng hàm run()
        self.store = store
        self.control = control
        self.events = events
        self._tasks: set[asyncio.Task] = set()

    @property
    def runner_name(self) -> str:
        return self.runner.name

    def launch(self, run_id: str, steps: list[StepSnapshot], env: dict | None = None) -> None:
        task = asyncio.create_task(self._run(run_id, steps, env), name=f"run:{run_id}")
        self._tasks.add(task)  # giữ tham chiếu, nếu không task có thể bị GC giữa chừng
        task.add_done_callback(self._tasks.discard)

    async def _run(self, run_id: str, steps: list[StepSnapshot], env: dict | None) -> None:
        try:
            await self.runner.run(run_id, steps, env, self.control, self.events, self.store)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # lỗi bất ngờ của runner → run failed, không kẹt ở 'running'
            log.exception("Run %s crashed", run_id)
            if await self.store.fail(run_id, f"Runner error: {exc}"):
                await self.events.publish(run_id, {"type": "status", "status": "failed"})
        finally:
            self.control.forget(run_id)

    async def shutdown(self) -> None:
        """Tắt server: dừng mọi run đang chạy. Lần khởi động sau sẽ đánh dấu chúng failed."""
        for task in list(self._tasks):
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
