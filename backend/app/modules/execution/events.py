"""Loa phát sự kiện realtime của run → SSE /tasks/stream/{id}.

M3: asyncio.Queue trong bộ nhớ (API và runner chạy chung 1 tiến trình).
M14: đổi sang Redis Pub/Sub, GIỮ NGUYÊN tên hàm publish/subscribe.
"""
import asyncio
from collections import defaultdict
from typing import Any

Event = dict[str, Any]


class Subscription:
    """Đăng ký nhận sự kiện NGAY khi tạo (trước khi đọc snapshot), nên không lỡ sự kiện nào."""

    def __init__(self, hub: "RunEvents", run_id: str) -> None:
        self._hub = hub
        self.run_id = run_id
        self.queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=1000)

    async def get(self, timeout: float | None = None) -> Event | None:
        """Sự kiện kế tiếp, hoặc None nếu hết thời gian chờ (router dùng để gửi ping)."""
        try:
            return await asyncio.wait_for(self.queue.get(), timeout)
        except TimeoutError:
            return None

    def close(self) -> None:
        self._hub._subscribers[self.run_id].discard(self)
        if not self._hub._subscribers[self.run_id]:
            del self._hub._subscribers[self.run_id]


class RunEvents:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[Subscription]] = defaultdict(set)

    async def publish(self, run_id: str, event: Event) -> None:
        event = {"task_id": run_id, **event}
        for sub in list(self._subscribers.get(run_id, ())):
            try:
                sub.queue.put_nowait(event)
            except asyncio.QueueFull:  # client đọc quá chậm: bỏ sự kiện, client tự GET lại khi cần
                pass

    def subscribe(self, run_id: str) -> Subscription:
        sub = Subscription(self, run_id)
        self._subscribers[run_id].add(sub)
        return sub


run_events = RunEvents()
