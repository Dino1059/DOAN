"""M10: kho test case — CRUD, Save as Test Case (bản chụp độc lập với plan), chạy test case."""
import pytest

pytestmark = pytest.mark.usefixtures("clean_db")

STEPS = [
    {"action": "Open URL", "selector": "https://test.com/login", "expected": "Login page shown"},
    {"action": "Click Element", "selector": "#submit", "expected": "Form submitted"},
]


def _plan(client, prompt="Test login flow on test.com"):
    res = client.post("/tasks/generate-plan", json={"prompt": prompt})
    assert res.status_code == 200, res.text
    return res.json()["data"]


# ---------- CRUD thủ công ----------

def test_create_list_get_update_delete(client):
    created = client.post("/test-cases", json={"name": "Login smoke", "suite": "Authentication", "tags": ["login", "smoke"], "steps": STEPS}).json()["data"]
    assert created["id"].startswith("TC-")
    assert created["suite"] == "Authentication" and created["tags"] == ["login", "smoke"]
    assert [s["action"] for s in created["steps"]] == ["Open URL", "Click Element"]
    assert created["source_plan_id"] is None

    listed = client.get("/test-cases").json()["data"]
    assert [tc["id"] for tc in listed] == [created["id"]]

    fetched = client.get(f"/test-cases/{created['id']}").json()["data"]
    assert fetched["name"] == "Login smoke"

    updated = client.put(f"/test-cases/{created['id']}", json={"name": "Login smoke v2"}).json()["data"]
    assert updated["name"] == "Login smoke v2"
    assert updated["suite"] == "Authentication"  # không gửi lên thì giữ nguyên

    assert client.delete(f"/test-cases/{created['id']}").status_code == 204
    assert client.get("/test-cases").json()["data"] == []


def test_create_rejects_empty_steps(client):
    res = client.post("/test-cases", json={"name": "No steps", "steps": []})
    assert res.status_code == 422, res.text


def test_get_update_delete_404_for_unknown_id(client):
    assert client.get("/test-cases/TC-DOESNOTEXIST").status_code == 404
    assert client.put("/test-cases/TC-DOESNOTEXIST", json={"name": "x"}).status_code == 404
    assert client.delete("/test-cases/TC-DOESNOTEXIST").status_code == 404


def test_list_filters_by_q_suite_and_tag(client):
    client.post("/test-cases", json={"name": "Login smoke", "suite": "Authentication", "tags": ["login"], "steps": STEPS})
    client.post("/test-cases", json={"name": "Checkout flow", "suite": "E-Commerce", "tags": ["checkout"], "steps": STEPS})

    assert [tc["name"] for tc in client.get("/test-cases?q=login").json()["data"]] == ["Login smoke"]
    assert [tc["name"] for tc in client.get("/test-cases?suite=E-Commerce").json()["data"]] == ["Checkout flow"]
    assert [tc["name"] for tc in client.get("/test-cases?tag=checkout").json()["data"]] == ["Checkout flow"]
    assert len(client.get("/test-cases").json()["data"]) == 2


# ---------- Save as Test Case ----------

def test_save_from_plan_copies_steps_as_a_snapshot(client):
    plan = _plan(client)
    saved = client.post(f"/test-cases/from-plan/{plan['plan_id']}", json={"suite": "Authentication", "tags": ["smoke"]}).json()["data"]

    assert saved["source_plan_id"] == plan["plan_id"]
    assert saved["name"] == plan["objective"]  # không gửi name -> lấy objective của plan
    assert [s["action"] for s in saved["steps"]] == [s["action"] for s in plan["steps"]]


def test_editing_the_plan_after_saving_does_not_change_the_test_case(client):
    plan = _plan(client)
    saved = client.post(f"/test-cases/from-plan/{plan['plan_id']}", json={}).json()["data"]
    original_steps = saved["steps"]

    res = client.put(f"/plans/{plan['plan_id']}/steps", json={"steps": [{"action": "Changed Step", "selector": "#x", "expected": "y"}]})
    assert res.status_code == 200, res.text

    unchanged = client.get(f"/test-cases/{saved['id']}").json()["data"]
    assert unchanged["steps"] == original_steps


def test_save_from_plan_unknown_plan_is_404(client):
    res = client.post("/test-cases/from-plan/PLN-DOESNOTEXIST", json={})
    assert res.status_code == 404


# ---------- Chạy test case ----------

def test_run_test_case_creates_a_run_with_test_case_id(client):
    created = client.post("/test-cases", json={"name": "Login smoke", "steps": STEPS}).json()["data"]

    res = client.post(f"/test-cases/{created['id']}/run", json={})
    assert res.status_code == 202, res.text
    run_id = res.json()["data"]["task_id"]
    assert run_id.startswith("RUN-")

    run = client.get(f"/tasks/{run_id}").json()["data"]
    assert run["test_case_id"] == created["id"]
    assert run["plan_id"] is None


def test_run_unknown_test_case_is_404(client):
    res = client.post("/test-cases/TC-DOESNOTEXIST/run", json={})
    assert res.status_code == 404
