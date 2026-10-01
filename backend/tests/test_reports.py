"""M11: tạo báo cáo Markdown/PDF từ 1 run, tải về, chia sẻ/unshare, lọc danh sách."""
import time

import pytest

from app.modules.execution.router import run_launcher

pytestmark = pytest.mark.usefixtures("clean_db")


def _plan(client, prompt="Test login flow on test.com"):
    res = client.post("/tasks/generate-plan", json={"prompt": prompt})
    assert res.status_code == 200, res.text
    return res.json()["data"]


def _completed_run(client, prompt="Test login flow on test.com"):
    plan = _plan(client, prompt)
    res = client.post("/tasks/run", json={"task_id": plan["task_id"]})
    assert res.status_code == 202, res.text
    run_id = res.json()["data"]["task_id"]
    deadline = time.monotonic() + 5.0
    while time.monotonic() < deadline:
        run = client.get(f"/tasks/{run_id}").json()["data"]
        if run["status"] == "completed":
            return run_id
        time.sleep(0.02)
    raise AssertionError("run did not complete in time")


@pytest.fixture
def slow_steps():
    runner = run_launcher.runner
    old, runner.step_seconds = runner.step_seconds, 2.0
    yield
    runner.step_seconds = old


# ---------- tạo / tải ----------

def test_generate_markdown_report(client):
    run_id = _completed_run(client)
    res = client.post("/reports", json={"run_id": run_id, "format": "markdown"})
    assert res.status_code == 201, res.text
    report = res.json()["data"]
    assert report["id"].startswith("RPT-") and report["format"] == "markdown"
    assert report["result"] == "Passed" and report["failed_step"] == "—"
    assert report["shared"] is False

    download = client.get(f"/reports/{report['id']}/download")
    assert download.status_code == 200
    assert download.headers["content-type"].startswith("text/markdown")
    assert "# Test Report" in download.text
    assert run_id in download.text


def test_generate_pdf_report(client):
    run_id = _completed_run(client)
    report = client.post("/reports", json={"run_id": run_id, "format": "pdf"}).json()["data"]
    assert report["format"] == "pdf"

    download = client.get(f"/reports/{report['id']}/download")
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/pdf"
    assert download.content.startswith(b"%PDF")


def test_generate_report_with_custom_name(client):
    run_id = _completed_run(client)
    report = client.post("/reports", json={"run_id": run_id, "format": "markdown", "name": "My custom report"}).json()["data"]
    assert report["name"] == "My custom report"


def test_generate_report_for_unfinished_run_is_409(client, slow_steps):
    plan = _plan(client)
    run_id = client.post("/tasks/run", json={"task_id": plan["task_id"]}).json()["data"]["task_id"]
    res = client.post("/reports", json={"run_id": run_id, "format": "markdown"})
    assert res.status_code == 409, res.text
    assert res.json()["code"] == "RUN_NOT_FINISHED"


def test_generate_report_for_unknown_run_is_404(client):
    res = client.post("/reports", json={"run_id": "RUN-DOESNOTEXIST", "format": "markdown"})
    assert res.status_code == 404


# ---------- danh sách / xoá ----------

def test_list_filters_by_format_and_suite(client):
    run_id = _completed_run(client)
    client.post("/reports", json={"run_id": run_id, "format": "markdown"})
    client.post("/reports", json={"run_id": run_id, "format": "pdf"})

    assert len(client.get("/reports").json()["data"]) == 2
    assert len(client.get("/reports?format=pdf").json()["data"]) == 1
    assert len(client.get("/reports?suite=E2E Test Suite").json()["data"]) == 2
    assert len(client.get("/reports?suite=Nonexistent").json()["data"]) == 0


def test_delete_report(client):
    run_id = _completed_run(client)
    report = client.post("/reports", json={"run_id": run_id, "format": "markdown"}).json()["data"]
    assert client.delete(f"/reports/{report['id']}").status_code == 204
    assert client.get(f"/reports/{report['id']}").status_code == 404
    assert client.get("/reports").json()["data"] == []


# ---------- chia sẻ ----------

def test_share_then_view_without_login_then_unshare(client):
    run_id = _completed_run(client)
    report = client.post("/reports", json={"run_id": run_id, "format": "markdown"}).json()["data"]

    shared = client.post(f"/reports/{report['id']}/share").json()["data"]
    assert shared["share_path"] == f"/shared/reports/{shared['share_token']}"

    public = client.get(shared["share_path"])
    assert public.status_code == 200
    assert "# Test Report" in public.text

    assert client.delete(f"/reports/{report['id']}/share").status_code == 204
    assert client.get(shared["share_path"]).status_code == 404


def test_report_is_scoped_to_owner(client):
    from app.core.dependencies import CurrentUserInfo, get_current_user
    from tests.conftest import ensure_user

    run_id = _completed_run(client)
    report = client.post("/reports", json={"run_id": run_id, "format": "markdown"}).json()["data"]

    ensure_user("USR-B0000000")
    client.app.dependency_overrides[get_current_user] = lambda: CurrentUserInfo(id="USR-B0000000", username="b")
    try:
        assert client.get(f"/reports/{report['id']}").status_code == 404
        assert client.get("/reports").json()["data"] == []
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)
