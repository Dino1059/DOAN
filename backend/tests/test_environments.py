"""M8: CRUD environments + Test Connection + chống SSRF qua HTTP."""
import pytest

from tests.conftest import ensure_user

pytestmark = pytest.mark.usefixtures("clean_db")


def _payload(**overrides):
    return {"name": "Staging", "base_url": "https://example.com", "browser": "chromium", **overrides}


def test_create_list_get_update_delete(client):
    created = client.post("/environments", json=_payload()).json()["data"]
    assert created["id"].startswith("ENV-")
    assert created["name"] == "Staging" and created["headless"] is True
    assert created["llm_provider"] == "openai"

    listed = client.get("/environments").json()["data"]
    assert [e["id"] for e in listed] == [created["id"]]

    fetched = client.get(f"/environments/{created['id']}").json()["data"]
    assert fetched["base_url"] == "https://example.com"

    updated = client.put(f"/environments/{created['id']}", json={"name": "Staging v2", "headless": False}).json()["data"]
    assert updated["name"] == "Staging v2" and updated["headless"] is False
    assert updated["base_url"] == "https://example.com"  # không gửi lên thì giữ nguyên

    res = client.delete(f"/environments/{created['id']}")
    assert res.status_code == 204
    assert client.get("/environments").json()["data"] == []


def test_create_rejects_missing_fields(client):
    res = client.post("/environments", json={"name": "No URL"})
    assert res.status_code == 422, res.text


def test_duplicate_name_conflicts(client):
    client.post("/environments", json=_payload(name="Staging"))
    res = client.post("/environments", json=_payload(name="Staging"))
    assert res.status_code == 409, res.text
    assert res.json()["code"] == "ENVIRONMENT_NAME_TAKEN"


@pytest.mark.parametrize("bad_url", ["http://127.0.0.1/", "http://169.254.169.254/latest/meta-data/"])
def test_create_blocks_ssrf_targets(client, bad_url):
    res = client.post("/environments", json=_payload(base_url=bad_url))
    assert res.status_code == 422, res.text
    assert res.json()["code"] == "TARGET_BLOCKED"


def test_update_blocks_ssrf_targets(client):
    created = client.post("/environments", json=_payload()).json()["data"]
    res = client.put(f"/environments/{created['id']}", json={"base_url": "http://127.0.0.1/"})
    assert res.status_code == 422, res.text


def test_get_and_delete_404_for_unknown_id(client):
    assert client.get("/environments/ENV-DOESNOTEXIST").status_code == 404
    assert client.delete("/environments/ENV-DOESNOTEXIST").status_code == 404


def test_test_connection_marks_connected(client, monkeypatch):
    class FakeResponse:
        status_code = 200

    class FakeAsyncClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr("app.modules.environments.service.httpx.AsyncClient", FakeAsyncClient)

    created = client.post("/environments", json=_payload()).json()["data"]
    result = client.post(f"/environments/{created['id']}/test-connection").json()["data"]
    assert result["status"] == "connected" and "200" in result["detail"]

    fetched = client.get(f"/environments/{created['id']}").json()["data"]
    assert fetched["last_check_status"] == "connected" and fetched["last_checked_at"] is not None


def test_test_connection_marks_error_on_connection_failure(client, monkeypatch):
    import httpx

    class FailingAsyncClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, url):
            raise httpx.ConnectError("boom")

    monkeypatch.setattr("app.modules.environments.service.httpx.AsyncClient", FailingAsyncClient)

    created = client.post("/environments", json=_payload()).json()["data"]
    result = client.post(f"/environments/{created['id']}/test-connection").json()["data"]
    assert result["status"] == "error"


def test_run_copies_environment_name_and_browser_as_a_snapshot(client):
    env = client.post("/environments", json=_payload(name="Staging", browser="firefox")).json()["data"]
    plan = client.post("/tasks/generate-plan", json={"prompt": "Test login flow on test.com"}).json()["data"]

    run_id = client.post(
        "/tasks/run", json={"task_id": plan["task_id"], "environment_id": env["id"]}
    ).json()["data"]["task_id"]

    detail = client.get(f"/test-runs/{run_id}").json()["data"]
    assert detail["env"] == "Staging"
    assert detail["browser"] == "Simulated Firefox"  # AGENT_MODE=fake trong test (conftest)

    # Xoá environment sau đó: lịch sử run vẫn giữ đúng tên/browser lúc chạy (bản chụp, không SET NULL ảnh hưởng hiển thị)
    client.delete(f"/environments/{env['id']}")
    detail_after_delete = client.get(f"/test-runs/{run_id}").json()["data"]
    assert detail_after_delete["env"] == "Staging"
    assert detail_after_delete["browser"] == "Simulated Firefox"


def test_environments_are_scoped_per_owner(client):
    created = client.post("/environments", json=_payload()).json()["data"]
    ensure_user("USR-B0000000")

    from app.core.dependencies import CurrentUserInfo, get_current_user

    client.app.dependency_overrides[get_current_user] = lambda: CurrentUserInfo(id="USR-B0000000", username="b")
    try:
        assert client.get("/environments").json()["data"] == []
        assert client.get(f"/environments/{created['id']}").status_code == 404
    finally:
        client.app.dependency_overrides.pop(get_current_user, None)
