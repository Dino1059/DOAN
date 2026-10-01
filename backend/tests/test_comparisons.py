"""M12: so 2 run — không ghi DB khi chỉ xem diff; lưu/chia sẻ mới ghi vào bảng comparisons."""
import time

import pytest

from tests.conftest import run_sql

pytestmark = pytest.mark.usefixtures("clean_db")


def _completed_run(client, prompt="Test login flow on test.com"):
    plan = client.post("/tasks/generate-plan", json={"prompt": prompt}).json()["data"]
    run_id = client.post("/tasks/run", json={"task_id": plan["task_id"]}).json()["data"]["task_id"]
    deadline = time.monotonic() + 5.0
    while time.monotonic() < deadline:
        run = client.get(f"/tasks/{run_id}").json()["data"]
        if run["status"] == "completed":
            return run_id
        time.sleep(0.02)
    raise AssertionError("run did not complete in time")


def _fail_step(run_id: str, step_no: int) -> None:
    """Giả lập 1 bước failed bằng cách sửa thẳng DB — SimulatedRunner luôn 'passed' ở mọi bước.

    Orchestrator thật (M4) dừng cả run ngay khi 1 bước failed, nên cũng đổi status của run cho khớp.
    """
    run_sql(
        "UPDATE test_run_steps SET status = 'failed', observation = 'Element not found' "
        "WHERE run_id = :run_id AND step_no = :step_no",
        {"run_id": run_id, "step_no": step_no},
    )
    run_sql("UPDATE test_runs SET status = 'failed' WHERE id = :run_id", {"run_id": run_id})


# ---------- diff (không ghi DB) ----------

def test_identical_runs_show_no_change_on_every_step(client):
    run_a = _completed_run(client)
    run_b = _completed_run(client)

    result = client.get(f"/comparisons/diff?run_a={run_a}&run_b={run_b}").json()["data"]
    assert result["result"] == "Passed -> Passed"
    assert all(not s["changed"] for s in result["steps"])
    assert result["changed_steps"].startswith("0 / ")
    assert run_sql("SELECT * FROM comparisons") == []  # chỉ xem diff: không ghi DB


def test_difference_at_step_5_is_flagged(client):
    run_a = _completed_run(client)
    run_b = _completed_run(client)
    _fail_step(run_b, 5)

    result = client.get(f"/comparisons/diff?run_a={run_a}&run_b={run_b}").json()["data"]
    assert result["result"] == "Passed -> Failed"
    changed_steps = {s["step_no"] for s in result["steps"] if s["changed"]}
    assert changed_steps == {5}
    assert result["changed_steps"] == "1 / 6"


def test_diff_same_run_twice_is_422(client):
    run_a = _completed_run(client)
    res = client.get(f"/comparisons/diff?run_a={run_a}&run_b={run_a}")
    assert res.status_code == 422, res.text
    assert res.json()["code"] == "SAME_RUN"


def test_diff_unknown_run_is_404(client):
    run_a = _completed_run(client)
    res = client.get(f"/comparisons/diff?run_a={run_a}&run_b=RUN-DOESNOTEXIST")
    assert res.status_code == 404


# ---------- lưu / xoá / chia sẻ ----------

def test_save_list_get_delete(client):
    run_a = _completed_run(client)
    run_b = _completed_run(client)

    saved = client.post("/comparisons", json={"run_a_id": run_a, "run_b_id": run_b, "name": "Baseline vs candidate"}).json()["data"]
    assert saved["id"].startswith("CMP-") and saved["shared"] is False

    listed = client.get("/comparisons").json()["data"]
    assert [c["id"] for c in listed] == [saved["id"]]

    detail = client.get(f"/comparisons/{saved['id']}").json()["data"]
    assert detail["result"]["result"] == "Passed -> Passed"

    assert client.delete(f"/comparisons/{saved['id']}").status_code == 204
    assert client.get("/comparisons").json()["data"] == []


def test_save_same_pair_twice_is_409(client):
    run_a = _completed_run(client)
    run_b = _completed_run(client)
    client.post("/comparisons", json={"run_a_id": run_a, "run_b_id": run_b})
    res = client.post("/comparisons", json={"run_a_id": run_a, "run_b_id": run_b})
    assert res.status_code == 409
    assert res.json()["code"] == "COMPARISON_EXISTS"


def test_save_same_run_is_422(client):
    run_a = _completed_run(client)
    res = client.post("/comparisons", json={"run_a_id": run_a, "run_b_id": run_a})
    assert res.status_code == 422


def test_share_then_view_without_login_then_unshare(client):
    run_a = _completed_run(client)
    run_b = _completed_run(client)
    saved = client.post("/comparisons", json={"run_a_id": run_a, "run_b_id": run_b}).json()["data"]

    shared = client.post(f"/comparisons/{saved['id']}/share").json()["data"]
    assert shared["share_path"] == f"/shared/comparisons/{shared['share_token']}"

    public = client.get(shared["share_path"])
    assert public.status_code == 200
    assert public.json()["data"]["result"] == "Passed -> Passed"

    assert client.delete(f"/comparisons/{saved['id']}/share").status_code == 204
    assert client.get(shared["share_path"]).status_code == 404


def test_comparison_is_scoped_to_owner(client):
    from app.core.dependencies import CurrentUserInfo, get_current_user
    from tests.conftest import ensure_user

    run_a = _completed_run(client)
    run_b = _completed_run(client)
    saved = client.post("/comparisons", json={"run_a_id": run_a, "run_b_id": run_b}).json()["data"]

    ensure_user("USR-B0000000")
    client.app.dependency_overrides[get_current_user] = lambda: CurrentUserInfo(id="USR-B0000000", username="b")
    try:
        assert client.get(f"/comparisons/{saved['id']}").status_code == 404
        assert client.get("/comparisons").json()["data"] == []
        assert client.get(f"/comparisons/diff?run_a={run_a}&run_b={run_b}").status_code == 404
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)
