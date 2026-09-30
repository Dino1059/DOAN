"""Phần dùng chung giữa SimulatedRunner (M3a, agents/fakes.py) và Orchestrator (M4).

Cả hai có cùng chữ ký `run(run_id, steps, env, control, events, repo)` (BUILD_PLAN mục 9),
và cùng cần "đợi hết pause rồi mới đổi trạng thái" — viết 1 lần ở đây để không lặp lại.
"""


async def advance(run_id: str, target: str, control, events, repo, **fields) -> None:
    """Đổi run sang `target`. Đang pause thì chờ resume trước (paused → completed là không hợp lệ)."""
    while True:
        await control.wait_while_paused(run_id)
        if await repo.advance(run_id, target, **fields):
            await events.publish(run_id, {"type": "status", "status": target})
            return
        await control.sleep(run_id, 0.05)
