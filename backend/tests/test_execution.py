"""M3a: chạy test giả lập (SimulatedRunner) + điều khiển + SSE, lưu PostgreSQL.

Runner chạy nền trên event loop của TestClient; mỗi bước mất SIMULATED_STEP_SECONDS=0.05s (conftest).
"""
import json
import time

import pytest

from app.db.session import SessionLocal
from app.modules.execution.repository import RunRepository
from app.modules.execution.router import run_launcher
from tests.conftest import run_sql

pytestmark = pytest.mark.usefixtures("clean_db")

OTP_STEPS = [
    {"action": "Open URL", "selector": "https://example.test/login", "expected": "Login page"},
    {"action": "Fill Input", "selector": "#otp-input", "expected": "OTP is accepted"},
    {"action": "Verify Element Visible", "selector": ".dashboard", "expected": "Dashboard is shown"},
]


@pytest.fixture
def slow_steps():
    """Bước chạy chậm hơn để kịp pause/cancel giữa chừng."""
    runner = run_launcher.runner
    old, runner.step_seconds = runner.step_seconds, 0.3
    yield
    runner.step_seconds = old


def _plan(client, prompt="Test login flow on test.com"):
    res = client.post("/tasks/generate-plan", json={"prompt": prompt})
    assert res.status_code == 200
    return res.json()["data"]


def _start(client, **body):
    res = client.post("/tasks/run", json=body)
    assert res.status_code == 202, res.text
    return res.json()["data"]["task_id"]


def _get(client, run_id):
    res = client.get(f"/tasks/{run_id}")
    assert res.status_code == 200, res.text
    return res.json()["data"]


def _wait(client, run_id, *statuses, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        run = _get(client, run_id)
        if run["status"] in statuses:
            return run
        time.sleep(0.02)
    raise AssertionError(f"run stayed '{run['status']}', expected {statuses}")


# ---------- chạy ----------


def test_run_from_plan_copies_steps_locks_plan_and_completes(client):
    plan = _plan(client)
    # frontend gửi plan_id trong trường task_id, kèm các trường cũ (tasks[], browser_config)
    run_id = _start(
        client, task_id=plan["task_id"],
        tasks=[{"prompt": "x", "max_steps": 30, "llm_provider": "google"}], browser_config={"headless": False},
    )
    assert run_id.startswith("RUN-")
    assert client.get(f"/plans/{plan['plan_id']}").json()["data"]["status"] == "approved"

    run = _wait(client, run_id, "completed")
    assert run["plan_id"] == plan["plan_id"] and run["runner"] == "simulated"
    assert [s["action"] for s in run["steps"]] == [s["action"] for s in plan["steps"]]
    assert {s["status"] for s in run["steps"]} == {"passed"}
    assert all(s["observation"].startswith("[Simulated]") for s in run["steps"])
    assert run["current_step"] == run["total_steps"] == len(plan["steps"])
    assert run["started_at"] and run["finished_at"]

    [row] = run_sql("SELECT config FROM test_runs WHERE id = :id", {"id": run_id})
    # test_data của plan được chép vào config để runner thật (M4) điền form, và để Re-run dùng lại đúng dữ liệu đó.
    assert row["config"] == {
        "max_steps": 30, "llm_provider": "google", "headless": False, "runner": "simulated",
        "test_data": plan["test_data"],
    }


def test_run_writes_status_messages_into_the_chat(client):
    plan = _plan(client)
    run_id = _start(client, plan_id=plan["plan_id"])
    _wait(client, run_id, "completed")
    msgs = client.get(f"/conversations/{plan['conversation_id']}").json()["data"]["messages"]
    run_msgs = [(m["kind"], m["run_id"]) for m in msgs if m["run_id"]]
    assert run_msgs == [("run_started", run_id), ("run_status", run_id)]
    assert "completed" in msgs[-1]["content"]


def test_editing_the_plan_after_run_does_not_change_the_run(client):
    plan = _plan(client)
    run_id = _start(client, plan_id=plan["plan_id"])
    _wait(client, run_id, "completed")
    # plan đã khoá → sửa bị 409, run giữ nguyên bản chụp
    assert client.put(f"/plans/{plan['plan_id']}/steps", json={"steps": [{"action": "X"}]}).status_code == 409
    run_sql("DELETE FROM test_plans WHERE id = :id", {"id": plan["plan_id"]})
    run = _get(client, run_id)
    assert run["plan_id"] is None and len(run["steps"]) == len(plan["steps"])


def test_run_with_inline_steps(client):
    run_id = _start(client, steps=[{"action": "Open URL", "selector": "https://a.test"}], name="Smoke")
    run = _wait(client, run_id, "completed")
    assert run["name"] == "Smoke" and run["plan_id"] is None and len(run["steps"]) == 1


def test_run_without_plan_or_steps_is_422(client):
    res = client.post("/tasks/run", json={"tasks": [{"prompt": "no plan"}]})
    assert res.status_code == 422 and res.json()["code"] == "PLAN_REQUIRED"


@pytest.mark.parametrize("body", [{"task_id": "PLN-DOESNOTEXIST"}, {"plan_id": "PLN-DOESNOTEXIST"}, {"task_id": "TASK-OLD"}])
def test_run_with_unknown_plan_is_404(client, body):
    assert client.post("/tasks/run", json=body).status_code == 404


def test_unknown_run_is_404(client):
    res = client.get("/tasks/RUN-DOESNOTEXIST")
    assert res.status_code == 404 and res.json()["code"] == "RUN_NOT_FOUND"


# ---------- điều khiển ----------


def test_pause_stops_progress_until_resume(client, slow_steps):
    run_id = _start(client, steps=OTP_STEPS[:1] + OTP_STEPS[2:] * 3)  # 4 bước, không có OTP
    _wait(client, run_id, "running")
    paused = client.post(f"/tasks/{run_id}/pause")
    assert paused.status_code == 200 and paused.json()["data"]["status"] == "paused"

    time.sleep(0.4)  # bước đang chạy dở được phép chạy xong
    done_at_pause = sum(s["status"] == "passed" for s in _get(client, run_id)["steps"])
    time.sleep(0.8)  # đủ cho 2 bước nữa nếu không pause
    run = _get(client, run_id)
    assert run["status"] == "paused"
    assert sum(s["status"] == "passed" for s in run["steps"]) == done_at_pause < 4

    assert client.post(f"/tasks/{run_id}/resume").json()["data"]["status"] == "running"
    run = _wait(client, run_id, "completed")
    assert {s["status"] for s in run["steps"]} == {"passed"}


def test_cancel_stops_the_run_and_skips_remaining_steps(client, slow_steps):
    run_id = _start(client, steps=OTP_STEPS[:1] * 4)
    _wait(client, run_id, "running")
    res = client.post(f"/tasks/{run_id}/cancel")
    assert res.status_code == 200 and res.json()["data"]["status"] == "cancelled"
    time.sleep(0.5)
    run = _get(client, run_id)
    assert run["status"] == "cancelled" and run["finished_at"]
    assert "skipped" in {s["status"] for s in run["steps"]}
    assert "running" not in {s["status"] for s in run["steps"]}


def test_controls_on_finished_run_are_409(client):
    run_id = _start(client, steps=OTP_STEPS[:1])
    _wait(client, run_id, "completed")
    for action in ("pause", "resume", "cancel"):
        res = client.post(f"/tasks/{run_id}/{action}")
        assert res.status_code == 409, action
        assert res.json()["code"] == "INVALID_TRANSITION"


def test_resume_when_not_paused_is_409(client, slow_steps):
    run_id = _start(client, steps=OTP_STEPS[:1] * 3)
    _wait(client, run_id, "running")
    assert client.post(f"/tasks/{run_id}/resume").status_code == 409
    client.post(f"/tasks/{run_id}/cancel")


# ---------- human input ----------


def test_otp_step_waits_for_human_input_and_masks_answer(client):
    run_id = _start(client, steps=OTP_STEPS)
    run = _wait(client, run_id, "waiting_human_input")
    assert "OTP" in run["human_prompt"]
    assert [s["status"] for s in run["steps"]] == ["passed", "running", "pending"]

    res = client.post(f"/tasks/{run_id}/human-input", json={"action": "provide_input", "input_text": "123456"})
    assert res.status_code == 200 and res.json()["data"]["status"] == "running"

    run = _wait(client, run_id, "completed")
    assert run["human_prompt"] is None
    [row] = run_sql("SELECT answer, answered_by, answered_at FROM run_interventions WHERE run_id = :id", {"id": run_id})
    assert row["answer"] == "••••56"  # không lưu OTP nguyên văn
    assert row["answered_by"] == "USR-DEMO0001" and row["answered_at"]


def test_human_input_when_not_waiting_is_409(client):
    run_id = _start(client, steps=OTP_STEPS[:1])
    _wait(client, run_id, "completed")
    res = client.post(f"/tasks/{run_id}/human-input", json={"input_text": "123456"})
    assert res.status_code == 409 and res.json()["code"] == "NOT_WAITING_FOR_INPUT"


def test_empty_human_input_is_422(client):
    run_id = _start(client, steps=OTP_STEPS)
    _wait(client, run_id, "waiting_human_input")
    assert client.post(f"/tasks/{run_id}/human-input", json={"input_text": "   "}).status_code == 422
    client.post(f"/tasks/{run_id}/cancel")


def test_cancel_while_waiting_closes_the_question(client):
    run_id = _start(client, steps=OTP_STEPS)
    _wait(client, run_id, "waiting_human_input")
    assert client.post(f"/tasks/{run_id}/cancel").json()["data"]["status"] == "cancelled"
    [row] = run_sql("SELECT answer, answered_at FROM run_interventions WHERE run_id = :id", {"id": run_id})
    assert row["answer"] is None and row["answered_at"] is not None
    assert _get(client, run_id)["human_prompt"] is None


# ---------- re-run, lịch sử ----------


def test_rerun_uses_the_old_runs_steps(client):
    plan = _plan(client)
    first = _start(client, plan_id=plan["plan_id"])
    _wait(client, first, "completed")
    # phiên bản plan mới không ảnh hưởng tới Re-run của run cũ
    client.post("/tasks/generate-plan", json={"prompt": "change step 3", "conversation_id": plan["conversation_id"]})
    res = client.post(f"/test-runs/{first}/rerun")
    assert res.status_code == 202
    second = res.json()["data"]["task_id"]
    assert second != first

    run = _wait(client, second, "completed")
    old = _get(client, first)
    assert run["rerun_of"] == first and run["plan_id"] == plan["plan_id"]
    assert [(s["action"], s["expected"]) for s in run["steps"]] == [(s["action"], s["expected"]) for s in old["steps"]]


def test_history_lists_runs_newest_first(client):
    a = _start(client, steps=OTP_STEPS[:1], name="first")
    _wait(client, a, "completed")
    b = _start(client, steps=OTP_STEPS[:1] * 2, name="second")
    _wait(client, b, "completed")
    items = client.get("/tasks/history/runs").json()["data"]
    assert [i["run_id"] for i in items] == [b, a]
    assert items[0]["passed_steps"] == 2 and items[0]["failed_steps"] == 0 and items[0]["name"] == "second"
    assert items[0]["duration"].endswith("s")


# ---------- SSE ----------


def test_stream_sends_snapshot_then_step_events_until_completed(client):
    run_id = _start(client, steps=OTP_STEPS[:1] * 2)
    events = []
    with client.stream("GET", f"/tasks/stream/{run_id}") as res:
        assert res.status_code == 200
        assert res.headers["content-type"].startswith("text/event-stream")
        for line in res.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))
    assert events[0]["type"] == "snapshot" and events[0]["task_id"] == run_id
    assert events[-1] == {"task_id": run_id, "type": "status", "status": "completed"}
    passed = [e["step_no"] for e in events if e["type"] == "step" and e["status"] == "passed"]
    # snapshot có thể đến sau khi runner đã chạy xong vài bước: chỉ cần thứ tự tăng dần, không trùng
    assert passed == sorted(set(passed))


def test_stream_of_finished_run_sends_only_snapshot(client):
    run_id = _start(client, steps=OTP_STEPS[:1])
    _wait(client, run_id, "completed")
    with client.stream("GET", f"/tasks/stream/{run_id}") as res:
        lines = [line for line in res.iter_lines() if line.startswith("data: ")]
    assert len(lines) == 1 and json.loads(lines[0][6:])["status"] == "completed"


def test_orphaned_runs_are_failed_on_startup(client):
    run_id = _start(client, steps=OTP_STEPS)
    _wait(client, run_id, "waiting_human_input")

    async def startup_cleanup():  # đúng việc lifespan làm khi server khởi động lại
        async with SessionLocal() as session:
            count = await RunRepository(session).fail_orphaned_runs()
            await session.commit()
        return count

    assert client.portal.call(startup_cleanup) == 1
    run = _get(client, run_id)
    assert run["status"] == "failed" and "restarted" in run["error_message"]
    assert run["human_prompt"] is None
