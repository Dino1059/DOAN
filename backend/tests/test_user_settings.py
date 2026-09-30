"""M9: hồ sơ, đổi mật khẩu (thu hồi phiên khác), API key mã hoá, tuỳ chọn cá nhân."""
import pytest

from app.core.config import settings
from tests.conftest import run_sql

pytestmark = pytest.mark.usefixtures("clean_db")

ALICE = {"display_name": "Alice", "email": "alice@example.test", "password": "correct-horse-1", "confirm_password": "correct-horse-1"}


@pytest.fixture(autouse=True)
def auth_on(monkeypatch):
    """Các test khác chạy với AUTH_REQUIRED=false; ở đây cần phiên thật để kiểm tra thu hồi session."""
    monkeypatch.setattr(settings, "auth_required", True)


def _register_and_login_twice(client):
    """Trả 2 client (2 'trình duyệt') cùng đăng nhập user Alice."""
    from fastapi.testclient import TestClient

    client.post("/auth/register", json=ALICE)
    other = TestClient(client.app)
    other.post("/auth/login", json={"login": ALICE["email"], "password": ALICE["password"]})
    return other  # client đầu (từ register) và other đều đăng nhập, cookie khác nhau


# ---------- hồ sơ ----------

def test_get_and_update_profile(client):
    client.post("/auth/register", json=ALICE)
    profile = client.get("/settings/profile").json()["data"]
    assert profile["email"] == "alice@example.test" and profile["display_name"] == "Alice"

    updated = client.put("/settings/profile", json={"display_name": "Alice B."}).json()["data"]
    assert updated["display_name"] == "Alice B." and updated["email"] == "alice@example.test"


def test_update_profile_email_conflict(client):
    client.post("/auth/register", json=ALICE)
    client.post("/auth/logout")
    client.post("/auth/register", json={**ALICE, "email": "bob@example.test", "display_name": "Bob"})

    res = client.put("/settings/profile", json={"email": "alice@example.test"})
    assert res.status_code == 409, res.text
    assert res.json()["code"] == "EMAIL_TAKEN"


# ---------- mật khẩu ----------

def test_change_password_revokes_other_sessions_but_not_current(client):
    other = _register_and_login_twice(client)
    assert client.get("/auth/me").status_code == 200
    assert other.get("/auth/me").status_code == 200

    res = client.put("/settings/password", json={"current_password": ALICE["password"], "new_password": "new-horse-2"})
    assert res.status_code == 204, res.text

    assert client.get("/auth/me").status_code == 200  # phiên đang dùng để đổi mật khẩu vẫn còn
    assert other.get("/auth/me").status_code == 401  # phiên khác bị thu hồi

    # Mật khẩu mới đăng nhập được, mật khẩu cũ thì không
    assert client.post("/auth/login", json={"login": ALICE["email"], "password": "new-horse-2"}).status_code == 200
    assert client.post("/auth/login", json={"login": ALICE["email"], "password": ALICE["password"]}).status_code == 401


def test_change_password_wrong_current_is_400(client):
    client.post("/auth/register", json=ALICE)
    res = client.put("/settings/password", json={"current_password": "wrong", "new_password": "new-horse-2"})
    assert res.status_code == 400, res.text
    assert res.json()["code"] == "INVALID_PASSWORD"


# ---------- API key ----------

def test_api_keys_start_unconfigured_for_all_providers(client):
    client.post("/auth/register", json=ALICE)
    keys = client.get("/settings/api-keys").json()["data"]
    assert {k["provider"] for k in keys} == {"google", "openai", "anthropic", "openrouter", "deepseek", "azure", "hub1"}
    assert all(not k["configured"] and k["last4"] is None for k in keys)


def test_set_api_key_encrypts_and_only_exposes_last4(client):
    client.post("/auth/register", json=ALICE)
    res = client.put("/settings/api-keys/openai", json={"api_key": "sk-abcdefgh1234"})
    assert res.status_code == 200, res.text
    out = res.json()["data"]
    assert out["configured"] is True and out["last4"] == "1234"

    [row] = run_sql("SELECT encrypted_key, last4 FROM api_keys WHERE provider = 'openai'")
    assert row["last4"] == "1234"
    assert "sk-abcdefgh1234" not in row["encrypted_key"]  # không lưu nguyên văn

    keys = client.get("/settings/api-keys").json()["data"]
    [openai_key] = [k for k in keys if k["provider"] == "openai"]
    assert openai_key["configured"] is True and openai_key["last4"] == "1234"


def test_set_api_key_upserts_on_second_call(client):
    client.post("/auth/register", json=ALICE)
    client.put("/settings/api-keys/openai", json={"api_key": "sk-first-0000"})
    client.put("/settings/api-keys/openai", json={"api_key": "sk-second-1111"})
    rows = run_sql("SELECT last4 FROM api_keys WHERE provider = 'openai'")
    assert len(rows) == 1 and rows[0]["last4"] == "1111"


def test_delete_api_key(client):
    client.post("/auth/register", json=ALICE)
    client.put("/settings/api-keys/openai", json={"api_key": "sk-abcdefgh1234"})
    res = client.delete("/settings/api-keys/openai")
    assert res.status_code == 204
    keys = client.get("/settings/api-keys").json()["data"]
    [openai_key] = [k for k in keys if k["provider"] == "openai"]
    assert openai_key["configured"] is False


def test_delete_api_key_is_idempotent_when_not_set(client):
    client.post("/auth/register", json=ALICE)
    assert client.delete("/settings/api-keys/anthropic").status_code == 204


def test_set_api_key_rejects_unknown_provider(client):
    client.post("/auth/register", json=ALICE)
    res = client.put("/settings/api-keys/chatgpt", json={"api_key": "sk-abcdefgh1234"})
    assert res.status_code == 422


# ---------- tuỳ chọn ----------

def test_preferences_default_then_update(client):
    client.post("/auth/register", json=ALICE)
    prefs = client.get("/settings/preferences").json()["data"]
    assert prefs == {"theme": "light", "notifications": {}}

    updated = client.put(
        "/settings/preferences", json={"theme": "dark", "notifications": {"email_on_fail": True}}
    ).json()["data"]
    assert updated == {"theme": "dark", "notifications": {"email_on_fail": True}}

    assert client.get("/settings/preferences").json()["data"] == updated
