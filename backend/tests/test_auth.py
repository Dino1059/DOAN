"""M7: đăng ký, đăng nhập, đăng xuất, phiên bằng cookie HttpOnly, mỗi user chỉ thấy dữ liệu của mình."""
import hashlib

import pytest

from app.core.config import settings
from tests.conftest import run_sql

pytestmark = pytest.mark.usefixtures("clean_db")

ALICE = {"display_name": "Alice", "email": "Alice@Example.test", "password": "correct-horse-1", "confirm_password": "correct-horse-1"}


@pytest.fixture(autouse=True)
def auth_on(monkeypatch):
    """Các test khác chạy với AUTH_REQUIRED=false; ở đây bật đăng nhập thật."""
    monkeypatch.setattr(settings, "auth_required", True)


def _register(client, **overrides):
    return client.post("/auth/register", json={**ALICE, **overrides})


def _login(client, login="alice@example.test", password=ALICE["password"]):
    return client.post("/auth/login", json={"login": login, "password": password})


# ---------- đăng ký ----------

def test_register_signs_in_with_an_httponly_cookie(client):
    res = _register(client)
    assert res.status_code == 201, res.text
    user = res.json()["data"]
    assert user["email"] == "alice@example.test" and user["username"] == "alice@example.test"
    assert user["display_name"] == "Alice" and user["id"].startswith("USR-")
    cookie = res.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert client.get("/auth/me").json()["data"]["id"] == user["id"]


def test_password_is_stored_as_argon2id_hash_and_token_as_sha256(client):
    res = _register(client)
    token = res.cookies[settings.session_cookie_name]
    [user] = run_sql("SELECT password_hash FROM users WHERE email = 'alice@example.test'")
    assert user["password_hash"].startswith("$argon2id$") and ALICE["password"] not in user["password_hash"]
    [session] = run_sql("SELECT token_hash FROM sessions")
    assert session["token_hash"] == hashlib.sha256(token.encode()).hexdigest() != token


def test_duplicate_email_is_409_case_insensitive(client):
    _register(client)
    client.cookies.clear()
    res = _register(client, email="ALICE@example.TEST")
    assert res.status_code == 409 and res.json()["code"] == "EMAIL_TAKEN"


@pytest.mark.parametrize(("field", "value"), [
    ("password", "short"),                  # < 8 ký tự
    ("confirm_password", "something-else"),  # không khớp
    ("email", "not-an-email"),
    ("display_name", "   "),
])
def test_invalid_registration_is_422(client, field, value):
    assert _register(client, **{field: value}).status_code == 422


# ---------- đăng nhập ----------

def test_login_with_email_or_username_any_case(client):
    _register(client)
    client.cookies.clear()
    assert _login(client, login="ALICE@example.test").status_code == 200
    assert client.get("/auth/me").status_code == 200


def test_wrong_password_and_unknown_user_get_the_same_401(client):
    _register(client)
    client.cookies.clear()
    wrong = _login(client, password="wrong-password")
    unknown = _login(client, login="nobody@example.test")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Invalid username or password", "code": "INVALID_CREDENTIALS"}
    assert settings.session_cookie_name not in wrong.cookies


def test_demo_user_without_password_cannot_sign_in(client):
    assert _login(client, login="admin123", password="123").status_code == 401


# ---------- bảo vệ endpoint ----------

@pytest.mark.parametrize(("method", "url"), [
    ("GET", "/conversations"), ("GET", "/test-runs"), ("GET", "/tasks/RUN-X"),
    ("POST", "/tasks/generate-plan"), ("POST", "/feedback"), ("GET", "/auth/me"),
])
def test_endpoints_require_a_session(client, method, url):
    res = client.request(method, url, json={})
    assert res.status_code == 401 and res.json()["code"] == "NOT_AUTHENTICATED"


def test_health_is_public(client):
    assert client.get("/health").status_code == 200


def test_logout_revokes_the_session(client):
    token = _register(client).cookies[settings.session_cookie_name]
    res = client.post("/auth/logout")
    assert res.status_code == 204
    assert client.get("/auth/me").status_code == 401
    # Dùng lại token cũ (vd: bị đánh cắp trước khi logout) cũng không được
    client.cookies.set(settings.session_cookie_name, token)
    assert client.get("/auth/me").status_code == 401


def test_expired_session_is_rejected(client):
    _register(client)
    run_sql("UPDATE sessions SET expires_at = now() - interval '1 minute'")
    assert client.get("/auth/me").status_code == 401


def test_tampered_token_is_rejected(client):
    _register(client)
    client.cookies.set(settings.session_cookie_name, "forged-token")
    assert client.get("/test-runs").status_code == 401


# ---------- dữ liệu tách theo user ----------

def test_each_user_only_sees_their_own_data(client):
    _register(client)
    run_id = client.post("/tasks/run", json={"steps": [{"action": "Open URL", "selector": "https://a.test"}]}).json()["data"]["task_id"]
    client.post("/feedback", json={"rating": 5, "category": "Other", "message": "from alice"})
    alice_id = client.get("/auth/me").json()["data"]["id"]

    client.cookies.clear()
    _register(client, email="bob@example.test", display_name="Bob")
    assert client.get(f"/tasks/{run_id}").status_code == 404
    assert client.get(f"/test-runs/{run_id}").status_code == 404
    assert client.get("/test-runs").json()["data"]["total"] == 0

    [owner] = run_sql("SELECT owner_id FROM test_runs WHERE id = :id", {"id": run_id})
    [fb] = run_sql("SELECT user_id FROM feedback")
    assert owner["owner_id"] == fb["user_id"] == alice_id
