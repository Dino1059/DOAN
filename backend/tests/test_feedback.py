"""M1 · feedback — POST /feedback lưu vào PostgreSQL."""
import pytest

from tests.conftest import run_sql

pytestmark = pytest.mark.usefixtures("clean_feedback")

VALID = {"rating": 5, "category": "Product experience", "message": "Great tool!"}


def test_feedback_is_saved_to_database(client):
    res = client.post("/feedback", json=VALID)

    assert res.status_code == 201
    body = res.json()
    assert body["status"] == "received"  # api.ts cũ vẫn dựa vào response.ok, giữ trường này để tương thích
    assert body["data"]["id"].startswith("FBK-")
    assert body["data"]["created_at"]

    rows = run_sql("SELECT id, user_id, rating, category, message FROM feedback")
    assert rows == [
        # M7: góp ý gắn với người đang đăng nhập (test chạy với user demo)
        {"id": body["data"]["id"], "user_id": "USR-DEMO0001", "rating": 5, "category": "Product experience", "message": "Great tool!"}
    ]


def test_message_is_trimmed_and_username_is_ignored(client):
    # Frontend gửi kèm "username"; backend bỏ qua, người gửi lấy từ phiên đăng nhập (M7).
    res = client.post("/feedback", json={**VALID, "message": "  spaced out  ", "username": "admin123"})

    assert res.status_code == 201
    assert run_sql("SELECT message FROM feedback") == [{"message": "spaced out"}]


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({**VALID, "rating": 0}, "rating"),
        ({**VALID, "rating": 6}, "rating"),
        ({**VALID, "category": "Spam"}, "category"),
        ({**VALID, "message": "   "}, "message"),
        ({**VALID, "message": "x" * 501}, "message"),
        ({"category": "Other", "message": "missing rating"}, "rating"),
    ],
)
def test_invalid_feedback_is_rejected_with_readable_detail(client, payload, field):
    res = client.post("/feedback", json=payload)

    assert res.status_code == 422
    body = res.json()
    # detail phải là chuỗi: api.ts làm `new Error(responseData.detail)` rồi hiện lên form
    assert isinstance(body["detail"], str) and field in body["detail"]
    assert body["code"] == "VALIDATION_ERROR"
    assert run_sql("SELECT count(*) AS n FROM feedback") == [{"n": 0}]


def test_message_of_exactly_500_chars_is_accepted(client):
    res = client.post("/feedback", json={**VALID, "message": "x" * 500})
    assert res.status_code == 201


def test_health_reports_database(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "service": "ai-agent-tester-api", "database": "ok"}


def test_database_constraints_reject_bad_rows_even_without_api():
    # Lớp bảo vệ thứ hai: dù ghi thẳng vào DB (bỏ qua Pydantic), CHECK constraint vẫn chặn.
    from sqlalchemy.exc import IntegrityError

    with pytest.raises(IntegrityError):
        run_sql("INSERT INTO feedback (id, rating, category, message) VALUES ('FBK-X', 9, 'Other', 'hi')")
