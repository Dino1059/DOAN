"""Luật chuyển trạng thái của 1 run (BACKEND_STRUCTURE_PLAN.md mục 9.5).

Mọi chỗ đổi test_runs.status (API lẫn runner) đều đi qua ensure_transition,
nên không có chuyện Pause một run đã completed rồi kẹt ở 'paused'.
"""
from app.core.exceptions import Conflict

RUN_STATUSES = (
    "queued",
    "running",
    "paused",
    "waiting_human_input",
    "waiting_human_approval",
    "completed",
    "failed",
    "cancelled",
)

ALLOWED: dict[str, frozenset[str]] = {
    "queued": frozenset({"running", "cancelled", "failed"}),
    "running": frozenset(
        {"paused", "waiting_human_input", "waiting_human_approval", "completed", "failed", "cancelled"}
    ),
    "paused": frozenset({"running", "cancelled", "failed"}),
    "waiting_human_input": frozenset({"running", "cancelled", "failed"}),
    "waiting_human_approval": frozenset({"running", "cancelled", "failed"}),
    "completed": frozenset(),
    "failed": frozenset(),
    "cancelled": frozenset(),
}
TERMINAL = frozenset({"completed", "failed", "cancelled"})


class InvalidTransition(Conflict):
    code = "INVALID_TRANSITION"


def can_transition(current: str, target: str) -> bool:
    return target in ALLOWED[current]


def ensure_transition(current: str, target: str) -> None:
    if not can_transition(current, target):
        raise InvalidTransition(f"Cannot change run status from '{current}' to '{target}'")
