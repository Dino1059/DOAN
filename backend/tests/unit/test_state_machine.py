import itertools

import pytest

from app.modules.execution.state_machine import ALLOWED, RUN_STATUSES, TERMINAL, InvalidTransition, ensure_transition

VALID = {
    ("queued", "running"), ("queued", "cancelled"), ("queued", "failed"),
    ("running", "paused"), ("running", "waiting_human_input"), ("running", "waiting_human_approval"),
    ("running", "completed"), ("running", "failed"), ("running", "cancelled"),
    ("paused", "running"), ("paused", "cancelled"), ("paused", "failed"),
    ("waiting_human_input", "running"), ("waiting_human_input", "cancelled"), ("waiting_human_input", "failed"),
    ("waiting_human_approval", "running"), ("waiting_human_approval", "cancelled"),
    ("waiting_human_approval", "failed"),
}
ALL_PAIRS = list(itertools.product(RUN_STATUSES, RUN_STATUSES))


def test_table_covers_every_status():
    assert set(ALLOWED) == set(RUN_STATUSES)


@pytest.mark.parametrize(("current", "target"), sorted(VALID))
def test_valid_transitions(current, target):
    ensure_transition(current, target)


@pytest.mark.parametrize(("current", "target"), [p for p in ALL_PAIRS if p not in VALID])
def test_invalid_transitions_raise_409(current, target):
    with pytest.raises(InvalidTransition) as exc:
        ensure_transition(current, target)
    assert exc.value.status_code == 409


@pytest.mark.parametrize("status", sorted(TERMINAL))
def test_terminal_states_are_final(status):
    assert ALLOWED[status] == frozenset()
