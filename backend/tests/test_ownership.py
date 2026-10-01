"""Quyền sở hữu (BUILD_PLAN mục 3.4): user khác không được thấy dữ liệu của mình → 404.

Mỗi module mới chỉ cần thêm endpoint vào danh sách OWNED_ENDPOINTS.
"""
import pytest

from app.core.dependencies import CurrentUserInfo, get_current_user
from tests.conftest import ensure_user, run_sql

pytestmark = pytest.mark.usefixtures("clean_db")

# (method, url mẫu, body) — {plan_id}, {conversation_id}, {run_id} được thay bằng dữ liệu của user A
OWNED_ENDPOINTS = [
    ("GET", "/plans/{plan_id}", None),
    ("PUT", "/plans/{plan_id}/steps", {"steps": [{"action": "Open URL"}]}),
    ("GET", "/conversations/{conversation_id}", None),
    ("PATCH", "/conversations/{conversation_id}", {"title": "hacked"}),
    ("POST", "/tasks/generate-plan", {"prompt": "continue someone else's chat", "conversation_id": "{conversation_id}"}),
    ("POST", "/tasks/run", {"task_id": "{plan_id}", "prompt": "run someone else's plan"}),
    ("GET", "/tasks/{run_id}", None),
    ("GET", "/tasks/stream/{run_id}", None),
    ("POST", "/tasks/{run_id}/pause", None),
    ("POST", "/tasks/{run_id}/resume", None),
    ("POST", "/tasks/{run_id}/cancel", None),
    ("POST", "/tasks/{run_id}/human-input", {"input_text": "123456"}),
    ("POST", "/test-runs/{run_id}/rerun", None),
    ("GET", "/test-runs/{run_id}", None),
    ("GET", "/evidence/{run_id}/steps/1", None),
    ("GET", "/environments/{environment_id}", None),
    ("PUT", "/environments/{environment_id}", {"name": "hacked"}),
    ("DELETE", "/environments/{environment_id}", None),
    ("POST", "/environments/{environment_id}/test-connection", None),
    ("GET", "/test-cases/{test_case_id}", None),
    ("PUT", "/test-cases/{test_case_id}", {"name": "hacked"}),
    ("DELETE", "/test-cases/{test_case_id}", None),
    ("POST", "/test-cases/{test_case_id}/run", None),
    ("POST", "/test-cases/from-plan/{plan_id}", {}),
    ("GET", "/reports/{report_id}", None),
    ("GET", "/reports/{report_id}/download", None),
    ("DELETE", "/reports/{report_id}", None),
    ("POST", "/reports/{report_id}/share", None),
    ("DELETE", "/reports/{report_id}/share", None),
    ("GET", "/comparisons/{comparison_id}", None),
    ("DELETE", "/comparisons/{comparison_id}", None),
    ("POST", "/comparisons/{comparison_id}/share", None),
    ("DELETE", "/comparisons/{comparison_id}/share", None),
    ("GET", "/comparisons/diff?run_a={run_id}&run_b={run_id_2}", None),
]


@pytest.fixture
def owned_by_a(client):
    data = client.post("/tasks/generate-plan", json={"prompt": "User A private flow"}).json()["data"]
    run = client.post("/tasks/run", json={"task_id": data["plan_id"]}).json()["data"]
    rerun = client.post(f"/test-runs/{run['task_id']}/rerun").json()["data"]
    env = client.post("/environments", json={"name": "A's env", "base_url": "https://example.com"}).json()["data"]
    test_case = client.post(
        "/test-cases", json={"name": "A's test case", "steps": [{"action": "Open URL", "selector": "https://a.test", "expected": "ok"}]}
    ).json()["data"]

    # Báo cáo/so sánh cần run đã xong — đánh dấu ngay bằng SQL thay vì chờ SimulatedRunner chạy thật.
    run_sql(
        "UPDATE test_runs SET status = 'completed', started_at = now(), finished_at = now() WHERE id = ANY(:ids)",
        {"ids": [run["task_id"], rerun["task_id"]]},
    )
    report = client.post("/reports", json={"run_id": run["task_id"], "format": "markdown"}).json()["data"]
    comparison = client.post("/comparisons", json={"run_a_id": run["task_id"], "run_b_id": rerun["task_id"]}).json()["data"]

    return {
        "plan_id": data["plan_id"], "conversation_id": data["conversation_id"], "run_id": run["task_id"],
        "run_id_2": rerun["task_id"], "environment_id": env["id"], "test_case_id": test_case["id"],
        "report_id": report["id"], "comparison_id": comparison["id"],
    }


@pytest.fixture
def as_user_b(client):
    ensure_user("USR-B0000000")
    client.app.dependency_overrides[get_current_user] = lambda: CurrentUserInfo(id="USR-B0000000", username="b")
    yield
    client.app.dependency_overrides.pop(get_current_user, None)


def _fill(value, ids):
    if isinstance(value, str):
        return value.format(**ids)
    if isinstance(value, dict):
        return {k: _fill(v, ids) for k, v in value.items()}
    return value


@pytest.mark.parametrize(("method", "url", "body"), OWNED_ENDPOINTS, ids=[f"{m} {u}" for m, u, _ in OWNED_ENDPOINTS])
def test_other_user_gets_404(client, owned_by_a, as_user_b, method, url, body):
    res = client.request(method, _fill(url, owned_by_a), json=_fill(body, owned_by_a))
    assert res.status_code == 404, res.text


def test_other_user_sees_empty_session_history(client, owned_by_a, as_user_b):
    assert client.get("/conversations").json()["data"] == []


def test_other_user_sees_empty_run_history(client, owned_by_a, as_user_b):
    assert client.get("/tasks/history/runs").json()["data"] == []
    assert client.get("/test-runs").json()["data"]["total"] == 0
    assert client.get("/test-runs/filters").json()["data"]["statuses"] == []


def test_other_user_sees_empty_environment_list(client, owned_by_a, as_user_b):
    assert client.get("/environments").json()["data"] == []


def test_other_user_sees_empty_test_case_list(client, owned_by_a, as_user_b):
    assert client.get("/test-cases").json()["data"] == []


def test_other_user_sees_empty_report_and_comparison_lists(client, owned_by_a, as_user_b):
    assert client.get("/reports").json()["data"] == []
    assert client.get("/comparisons").json()["data"] == []
