"""Bộ đàm API → runner: pause / resume / cancel / câu trả lời của người.

Trạng thái trong DB do service ghi (UI thấy ngay); file này chỉ báo cho runner đang chạy biết.
M3: asyncio.Event trong bộ nhớ. M14: đổi sang Redis, GIỮ NGUYÊN tên hàm.
"""
import asyncio
from dataclasses import dataclass, field
from typing import Literal

Command = Literal["pause", "resume", "cancel", "human_input"]


class RunCancelled(Exception):
    """Runner nhận lệnh Stop: dừng ngay, không ghi thêm gì."""


class HumanInputTimeout(Exception):
    pass


@dataclass
class _RunChannel:
    running: asyncio.Event = field(default_factory=asyncio.Event)  # set = không bị pause
    cancelled: asyncio.Event = field(default_factory=asyncio.Event)
    answers: asyncio.Queue[str] = field(default_factory=asyncio.Queue)

    def __post_init__(self) -> None:
        self.running.set()


class RunControl:
    def __init__(self) -> None:
        self._channels: dict[str, _RunChannel] = {}

    def _channel(self, run_id: str) -> _RunChannel:
        return self._channels.setdefault(run_id, _RunChannel())

    async def send(self, run_id: str, command: Command, payload: str | None = None) -> None:
        ch = self._channel(run_id)
        if command == "pause":
            ch.running.clear()
        elif command == "resume":
            ch.running.set()
        elif command == "cancel":
            ch.cancelled.set()
            ch.running.set()  # đánh thức runner đang đứng chờ resume
        elif command == "human_input":
            ch.answers.put_nowait(payload or "")

    def is_cancelled(self, run_id: str) -> bool:
        return self._channel(run_id).cancelled.is_set()

    async def wait_while_paused(self, run_id: str) -> None:
        """Gọi giữa các bước: đang pause thì đứng chờ; bị Stop thì ném RunCancelled."""
        ch = self._channel(run_id)
        await ch.running.wait()
        if ch.cancelled.is_set():
            raise RunCancelled(run_id)

    async def sleep(self, run_id: str, seconds: float) -> None:
        """Giả lập thời gian chạy 1 bước, nhưng dừng ngay nếu bị Stop giữa chừng."""
        ch = self._channel(run_id)
        try:
            await asyncio.wait_for(ch.cancelled.wait(), seconds)
        except TimeoutError:
            return
        raise RunCancelled(run_id)

    async def wait_for_human_input(self, run_id: str, timeout: float) -> str:
        ch = self._channel(run_id)
        answer = asyncio.ensure_future(ch.answers.get())
        cancelled = asyncio.ensure_future(ch.cancelled.wait())
        try:
            done, _ = await asyncio.wait({answer, cancelled}, timeout=timeout, return_when=asyncio.FIRST_COMPLETED)
        finally:
            for fut in (answer, cancelled):
                if not fut.done():
                    fut.cancel()
        if cancelled in done:
            raise RunCancelled(run_id)
        if answer in done:
            return answer.result()
        raise HumanInputTimeout(run_id)

    def forget(self, run_id: str) -> None:
        """Run kết thúc: giải phóng bộ nhớ."""
        self._channels.pop(run_id, None)


run_control = RunControl()
