"""M2 · test_planning — hội thoại với AI, sinh plan có phiên bản, sửa plan, Session History.

Chạy với AGENT_MODE=fake (FakePlanner, 6 bước cố định; khi sửa qua chat thì đổi bước 3).
"""
import pytest

from app.agents.llm.base import LLMError
from app.agents.llm.factory import get_planner
from tests.conftest import run_sql

pytestmark = pytest.mark.usefixtures("clean_db")


def generate(client, prompt, conversation_id=None):
    body = {"prompt": prompt, "llm_provider": "google", "llm_model": "gemini-2.0-flash"}  # như api.ts đang gửi
    if conversation_id:
        body["conversation_id"] = conversation_id
    res = client.post("/tasks/generate-plan", json=body)
    assert res.status_code == 200, res.text
    return res.json()["data"]


# ---------- Sinh plan ----------

def test_first_message_creates_conversation_plan_and_two_messages(client):
    data = generate(client, "Test the password reset feature on test.com")

    assert data["plan_id"].startswith("PLN-") and data["task_id"] == data["plan_id"]
    assert data["version"] == 1 and data["status"] == "draft"
    assert data["target_url"] == "https://test.com"
    assert [s["id"] for s in data["steps"]] == [1, 2, 3, 4, 5, 6]
    assert {s["source"] for s in data["steps"]} == {"original"}

    conv = data["conversation"]
    assert conv["seq_no"] == 1 and conv["latest_plan_steps"] == 6
    assert conv["title"] == "Test the password reset feature on test.com"

    user_msg, planner_msg = data["messages"]
    assert (user_msg["role"], user_msg["seq"]) == ("user", 1)
    assert (planner_msg["role"], planner_msg["agent"], planner_msg["kind"]) == ("assistant", "planner", "plan_created")
    assert planner_msg["plan_id"] == data["plan_id"]

    assert run_sql("SELECT source_message_id FROM test_plans") == [{"source_message_id": user_msg["id"]}]


def test_chat_edit_creates_new_version_and_marks_changed_step(client):
    first = generate(client, "Test forgot password on test.com")
    second = generate(client, "Use another email", conversation_id=first["conversation_id"])

    assert second["conversation_id"] == first["conversation_id"]
    assert second["version"] == 2
    assert second["messages"][1]["kind"] == "plan_updated"
    sources = {s["step_no"]: s["source"] for s in second["steps"]}
    assert sources[3] == "chat_edit"  # FakePlanner chỉ đổi bước 3
    assert all(src == "original" for no, src in sources.items() if no != 3)

    # Phiên bản cũ vẫn giữ nguyên
    assert client.get(f"/plans/{first['plan_id']}").json()["data"]["steps"][2]["expected"] == "Test email is entered"
    # Bước 3 trỏ về đúng tin nhắn đã yêu cầu sửa
    rows = run_sql("SELECT source_message_id FROM test_plan_steps WHERE plan_id = :p AND step_no = 3", {"p": second["plan_id"]})
    assert rows == [{"source_message_id": second["messages"][0]["id"]}]


def test_each_new_conversation_gets_next_session_number(client):
    assert generate(client, "First flow")["conversation"]["seq_no"] == 1
    assert generate(client, "Second flow")["conversation"]["seq_no"] == 2


def test_prompt_is_validated(client):
    res = client.post("/tasks/generate-plan", json={"prompt": "  "})
    assert res.status_code == 422 and "prompt" in res.json()["detail"]


def test_unknown_conversation_returns_404_and_saves_nothing(client):
    res = client.post("/tasks/generate-plan", json={"prompt": "Hello there", "conversation_id": "CNV-NOPE"})
    assert res.status_code == 404 and res.json()["code"] == "CONVERSATION_NOT_FOUND"
    assert run_sql("SELECT count(*) AS n FROM conversation_messages") == [{"n": 0}]


def test_planner_failure_returns_502_and_rolls_back_everything(client):
    class BrokenPlanner:
        async def generate(self, *args, **kwargs):
            raise LLMError("OpenAI request timed out")

    client.app.dependency_overrides[get_planner] = lambda: BrokenPlanner()
    try:
        res = client.post("/tasks/generate-plan", json={"prompt": "Test checkout"})
    finally:
        client.app.dependency_overrides.clear()

    assert res.status_code == 502 and res.json()["code"] == "PLANNER_FAILED"
    assert "timed out" in res.json()["detail"]
    # Không để lại phiên chat hay tin nhắn dở dang
    assert run_sql("SELECT (SELECT count(*) FROM conversations) + (SELECT count(*) FROM conversation_messages) AS n") == [{"n": 0}]


def test_missing_openai_key_returns_503_but_reading_still_works(client, monkeypatch):
    from app.core.config import settings

    data = generate(client, "Test login")
    monkeypatch.setattr(settings, "agent_mode", "real")
    monkeypatch.setattr(settings, "openai_api_key", None)

    res = client.post("/tasks/generate-plan", json={"prompt": "Test login again"})
    assert res.status_code == 503 and res.json()["code"] == "LLM_NOT_CONFIGURED"
    assert client.get(f"/plans/{data['plan_id']}").status_code == 200


# ---------- Sửa plan trực tiếp ----------

def test_edit_add_and_delete_steps_marks_manual_changes(client):
    plan = generate(client, "Test search on shop.test")
    steps = [{"action": s["action"], "selector": s["selector"], "expected": s["expected"]} for s in plan["steps"]]
    steps[1]["selector"] = "#new-selector"                       # sửa bước 2
    del steps[4]                                                 # xoá bước 5
    steps.append({"action": "Verify Text", "selector": "h1", "expected": "Done"})  # thêm bước cuối

    res = client.put(f"/plans/{plan['plan_id']}/steps", json={"steps": steps})

    assert res.status_code == 200
    out = res.json()["data"]["steps"]
    assert [s["step_no"] for s in out] == [1, 2, 3, 4, 5, 6]     # đánh số lại liên tục
    assert [s["source"] for s in out] == ["original", "manual", "original", "original", "manual", "manual"]
    assert out[1]["selector"] == "#new-selector"


def test_approved_plan_is_locked(client):
    plan = generate(client, "Test cart")
    client.post("/tasks/run", json={"task_id": plan["task_id"], "prompt": "Test cart"})

    res = client.put(f"/plans/{plan['plan_id']}/steps", json={"steps": [{"action": "Open URL"}]})
    assert res.status_code == 409 and res.json()["code"] == "PLAN_LOCKED"


def test_steps_list_cannot_be_empty(client):
    plan = generate(client, "Test profile")
    assert client.put(f"/plans/{plan['plan_id']}/steps", json={"steps": []}).status_code == 422


# ---------- Session History ----------

def test_session_history_is_newest_first_and_searchable(client):
    a = generate(client, "Checkout coupon on store.test")
    b = generate(client, "Password reset on test.com")
    generate(client, "Also check the email body", conversation_id=a["conversation_id"])  # a mới hoạt động lại

    items = client.get("/conversations").json()["data"]
    assert [c["id"] for c in items] == [a["conversation_id"], b["conversation_id"]]
    assert items[0]["latest_plan_steps"] == 6 and items[0]["latest_plan_status"] == "draft"

    def search(q):
        return [c["id"] for c in client.get("/conversations", params={"q": q}).json()["data"]]

    assert search("password") == [b["conversation_id"]]          # theo tiêu đề
    assert search("email body") == [a["conversation_id"]]        # theo nội dung tin nhắn user
    assert search("store.test") == [a["conversation_id"]]        # theo URL của plan


def test_open_conversation_returns_messages_in_order_and_latest_plan(client):
    first = generate(client, "Test signup on app.test")
    second = generate(client, "Add a step for the terms checkbox", conversation_id=first["conversation_id"])

    detail = client.get(f"/conversations/{first['conversation_id']}").json()["data"]
    assert [m["seq"] for m in detail["messages"]] == [1, 2, 3, 4]
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant", "user", "assistant"]
    assert detail["latest_plan"]["plan_id"] == second["plan_id"]


def test_rename_and_archive_conversation(client):
    conv_id = generate(client, "Test logout")["conversation_id"]

    renamed = client.patch(f"/conversations/{conv_id}", json={"title": "Logout flow"}).json()["data"]
    assert renamed["title"] == "Logout flow"

    client.patch(f"/conversations/{conv_id}", json={"archived": True})
    assert client.get("/conversations").json()["data"] == []
    # Lưu trữ chỉ ẩn khỏi sidebar, vẫn mở lại được
    assert client.get(f"/conversations/{conv_id}").status_code == 200
