"""M5: lịch sử chạy — lọc, tìm kiếm, phân trang ở server, chi tiết run. Chỉ đọc bảng của M3."""
from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import ensure_user, run_sql

pytestmark = pytest.mark.usefixtures("clean_db")

OWNER = "USR-DEMO0001"  # user demo mà CurrentUser trả về (trước M7)
NOW = datetime.now(timezone.utc)


def _run(run_id, *, name="Login flow", suite="E2E Test Suite", env=None, browser="Chromium",
         status="completed", age=timedelta(minutes=5), duration=3.0, steps=("passed",), owner=OWNER):
    ensure_user(owner)
    created = NOW - age
    started = created + timedelta(seconds=1)
    finished = started + timedelta(seconds=duration) if status in ("completed", "failed", "cancelled") else None
    run_sql(
        "INSERT INTO test_runs (id, owner_id, name, suite, environment_name, browser, config, status, "
        "current_step, created_at, started_at, finished_at) VALUES (:id, :owner, :name, :suite, :env, :browser, "
        "'{\"runner\": \"playwright\"}'::jsonb, :status, :cur, :created, :started, :finished)",
        {"id": run_id, "owner": owner, "name": name, "suite": suite, "env": env, "browser": browser,
         "status": status, "cur": len(steps), "created": created, "started": started, "finished": finished},
    )
    for no, step_status in enumerate(steps, start=1):
        run_sql(
            "INSERT INTO test_run_steps (id, run_id, step_no, action, selector, expected, status, observation) "
            "VALUES (:id, :run, :no, 'Click Element', '#btn', 'ok', :status, :obs)",
            {"id": f"{run_id}-S{no}", "run": run_id, "no": no, "status": step_status, "obs": f"step {no} {step_status}"},
        )


def _list(client, **params):
    res = client.get("/test-runs", params=params)
    assert res.status_code == 200, res.text
    return res.json()["data"]


def test_list_is_newest_first_with_step_counts_and_duration(client):
    _run("RUN-OLD", age=timedelta(hours=2), steps=("passed", "passed", "failed"))
    _run("RUN-NEW", age=timedelta(minutes=1), duration=125, steps=("passed",))
    data = _list(client)
    assert data["total"] == 2 and data["page"] == 1 and data["page_size"] == 8
    assert [r["run_id"] for r in data["items"]] == ["RUN-NEW", "RUN-OLD"]
    old = data["items"][1]
    assert (old["passed_steps"], old["failed_steps"]) == (2, 1)
    assert old["duration"] == "3.0s" and data["items"][0]["duration"] == "2m 05s"
    assert old["env"] == "Default"  # chưa có bảng environments (M8)


def test_pagination_second_page(client):
    for i in range(10):
        _run(f"RUN-{i:02d}", age=timedelta(minutes=i))
    page1 = _list(client, page=1)
    page2 = _list(client, page=2)
    assert page1["total"] == page2["total"] == 10
    assert len(page1["items"]) == 8 and len(page2["items"]) == 2
    assert [r["run_id"] for r in page2["items"]] == ["RUN-08", "RUN-09"]
    assert _list(client, page=3)["items"] == []


def test_filters_combine_with_and(client):
    _run("RUN-A", status="failed", suite="Checkout", browser="Chromium")
    _run("RUN-B", status="failed", suite="Login", browser="Chromium")
    _run("RUN-C", status="completed", suite="Checkout", browser="Chromium")
    _run("RUN-D", status="failed", suite="Checkout", browser="Simulated Chromium")
    data = _list(client, status="failed", suite="Checkout", browser="Chromium")
    assert [r["run_id"] for r in data["items"]] == ["RUN-A"] and data["total"] == 1


def test_search_by_id_or_name_and_env_filter(client):
    _run("RUN-AAA111", name="Password reset", env="Staging")
    _run("RUN-BBB222", name="Checkout flow")
    assert [r["run_id"] for r in _list(client, q="password")["items"]] == ["RUN-AAA111"]
    assert [r["run_id"] for r in _list(client, q="bbb2")["items"]] == ["RUN-BBB222"]
    assert [r["run_id"] for r in _list(client, env="Staging")["items"]] == ["RUN-AAA111"]
    assert [r["run_id"] for r in _list(client, env="Default")["items"]] == ["RUN-BBB222"]


def test_date_range_filter(client):
    _run("RUN-TODAY", age=timedelta(hours=3))
    _run("RUN-WEEK", age=timedelta(days=3))
    _run("RUN-MONTH", age=timedelta(days=20))
    _run("RUN-ANCIENT", age=timedelta(days=90))
    ids = lambda r: {x["run_id"] for x in _list(client, date_range=r)["items"]}  # noqa: E731
    assert ids("24h") == {"RUN-TODAY"}
    assert ids("7d") == {"RUN-TODAY", "RUN-WEEK"}
    assert ids("30d") == {"RUN-TODAY", "RUN-WEEK", "RUN-MONTH"}
    assert _list(client)["total"] == 4


def test_invalid_query_is_422(client):
    assert client.get("/test-runs", params={"date_range": "1y"}).status_code == 422
    assert client.get("/test-runs", params={"page": 0}).status_code == 422


def test_filter_options_only_contain_real_values(client):
    _run("RUN-1", status="failed", suite="Login", env="Staging", browser="Chromium")
    _run("RUN-2", status="completed", suite="Checkout", browser="Simulated Chromium")
    _run("RUN-OTHER", suite="Someone else's", owner="USR-OTHER")
    data = client.get("/test-runs/filters").json()["data"]
    assert data == {
        "statuses": ["completed", "failed"],
        "suites": ["Checkout", "Login"],
        "envs": ["Default", "Staging"],
        "browsers": ["Chromium", "Simulated Chromium"],
    }


def test_detail_has_steps_and_interventions(client):
    _run("RUN-D1", status="failed", steps=("passed", "failed", "skipped"))
    run_sql(
        "UPDATE test_runs SET error_message = 'Step 2 failed', rerun_of = NULL WHERE id = 'RUN-D1'"
    )
    run_sql(
        "INSERT INTO run_interventions (id, run_id, step_id, kind, question, answer, answered_at) "
        "VALUES ('INT-1', 'RUN-D1', 'RUN-D1-S2', 'input', 'Enter the OTP', '••••56', now())"
    )
    data = client.get("/test-runs/RUN-D1").json()["data"]
    assert data["status"] == "failed" and data["error_message"] == "Step 2 failed"
    assert data["runner"] == "playwright"
    assert [s["status"] for s in data["steps"]] == ["passed", "failed", "skipped"]
    assert data["steps"][1]["observation"] == "step 2 failed"
    assert (data["passed_steps"], data["failed_steps"]) == (1, 1)
    assert data["interventions"] == [
        {"step_no": 2, "kind": "input", "question": "Enter the OTP", "answer": "••••56", "decision": None,
         "asked_at": data["interventions"][0]["asked_at"], "answered_at": data["interventions"][0]["answered_at"]}
    ]


def test_unknown_run_detail_is_404(client):
    res = client.get("/test-runs/RUN-NOPE")
    assert res.status_code == 404 and res.json()["code"] == "RUN_NOT_FOUND"


def test_other_users_runs_are_invisible(client):
    _run("RUN-MINE")
    _run("RUN-THEIRS", owner="USR-OTHER")
    assert [r["run_id"] for r in _list(client)["items"]] == ["RUN-MINE"]
    assert client.get("/test-runs/RUN-THEIRS").status_code == 404


def test_legacy_history_alias_still_works(client):
    _run("RUN-X", steps=("passed", "failed"))
    items = client.get("/tasks/history/runs").json()["data"]
    assert [(i["run_id"], i["passed_steps"], i["failed_steps"]) for i in items] == [("RUN-X", 1, 1)]
