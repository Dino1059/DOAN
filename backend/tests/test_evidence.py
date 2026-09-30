"""M6: bằng chứng từng bước — lưu file ra đĩa, che bí mật, endpoint đọc, visual diff khi Re-run."""
import asyncio
import io
import time

import pytest
from PIL import Image

from app.agents.protocol import Artifact
from app.core.config import settings
from app.db.session import SessionLocal
from app.modules.evidence.masking import MASK
from app.modules.evidence.service import EvidenceRecorder
from app.modules.evidence.storage import LocalStorage
from tests.conftest import ensure_user, run_sql

pytestmark = pytest.mark.usefixtures("clean_db")
OWNER = "USR-DEMO0001"


def _png(box=None) -> bytes:
    img = Image.new("RGB", (80, 60), (255, 255, 255))
    if box:
        img.paste((200, 0, 0), box)
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def _run(run_id, *, owner=OWNER, rerun_of=None, steps=2):
    ensure_user(owner)
    run_sql(
        "INSERT INTO test_runs (id, owner_id, name, browser, status, rerun_of) "
        "VALUES (:id, :owner, 'Evidence test', 'Chromium', 'completed', :rerun)",
        {"id": run_id, "owner": owner, "rerun": rerun_of},
    )
    for no in range(1, steps + 1):
        run_sql(
            "INSERT INTO test_run_steps (id, run_id, step_no, action, selector, expected, status) "
            "VALUES (:id, :run, :no, 'Click Element', '#btn', '', 'passed')",
            {"id": f"{run_id}-S{no}", "run": run_id, "no": no},
        )


def _record(run_id, step_no, artifacts):
    recorder = EvidenceRecorder(SessionLocal, LocalStorage(settings.artifacts_dir))
    asyncio.run(recorder.record(run_id, f"{run_id}-S{step_no}", step_no, artifacts))


def _evidence(client, run_id, step_no):
    res = client.get(f"/evidence/{run_id}/steps/{step_no}")
    assert res.status_code == 200, res.text
    return {item["kind"]: item for item in res.json()["data"]["items"]}


def test_screenshot_is_stored_on_disk_and_served(client):
    _run("RUN-EV1")
    _record("RUN-EV1", 1, [Artifact("screenshot", {"highlight_selector": "#btn"}, _png())])

    [row] = run_sql("SELECT storage_key, payload FROM evidence_artifacts")
    assert row["storage_key"].startswith("runs/RUN-EV1/step-01-screenshot-")
    assert (settings.artifacts_dir / row["storage_key"]).is_file()

    shot = _evidence(client, "RUN-EV1", 1)["screenshot"]
    assert shot["payload"] == {"highlight_selector": "#btn"}
    res = client.get(shot["file_url"])
    assert res.status_code == 200 and res.headers["content-type"] == "image/png"
    assert res.content == _png()


def test_secrets_are_masked_before_saving(client):
    _run("RUN-EV2")
    _record("RUN-EV2", 1, [
        Artifact("network", {"requests": [], "api_check": {
            "method": "POST", "url": "https://a.test/login?token=abc123", "status_code": 200,
            "response_body": '{"password":"123","ok":true}'}}),
        Artifact("console", {"lines": [{"level": "log", "text": "Bearer eyJsecret.token"}]}),
    ])
    rows = run_sql("SELECT payload::text AS p FROM evidence_artifacts")
    stored = " ".join(r["p"] for r in rows)
    for leak in ("abc123", '"123"', "eyJsecret"):
        assert leak not in stored
    api = _evidence(client, "RUN-EV2", 1)["network"]["payload"]["api_check"]
    assert api["status_code"] == 200 and MASK in api["response_body"]


def test_rerun_gets_visual_diff_against_original_run(client):
    _run("RUN-BASE", steps=1)
    _record("RUN-BASE", 1, [Artifact("screenshot", {}, _png())])
    _run("RUN-AGAIN", rerun_of="RUN-BASE", steps=1)
    _record("RUN-AGAIN", 1, [Artifact("screenshot", {}, _png(box=(0, 0, 40, 30)))])  # 1/4 ảnh đổi màu

    diff = _evidence(client, "RUN-AGAIN", 1)["visual_diff"]
    assert diff["payload"]["baseline_run_id"] == "RUN-BASE"
    assert diff["payload"]["diff_percent"] == 25.0
    assert client.get(diff["file_url"]).status_code == 200
    # Run gốc không có baseline → không có visual_diff
    assert "visual_diff" not in _evidence(client, "RUN-BASE", 1)


def test_step_without_evidence_returns_empty_list(client):
    _run("RUN-EV3")
    assert client.get("/evidence/RUN-EV3/steps/2").json()["data"]["items"] == []


def test_other_users_evidence_is_404(client):
    _run("RUN-THEIRS", owner="USR-OTHER")
    _record("RUN-THEIRS", 1, [Artifact("screenshot", {}, _png())])
    [row] = run_sql("SELECT id FROM evidence_artifacts")
    assert client.get("/evidence/RUN-THEIRS/steps/1").status_code == 404
    res = client.get(f"/evidence/files/{row['id']}")
    assert res.status_code == 404 and res.json()["code"] == "EVIDENCE_NOT_FOUND"


def test_deleting_a_run_cascades_to_evidence_rows(client):
    _run("RUN-DEL")
    _record("RUN-DEL", 1, [Artifact("agent_log", {"lines": []})])
    run_sql("DELETE FROM test_runs WHERE id = 'RUN-DEL'")
    assert run_sql("SELECT count(*) AS n FROM evidence_artifacts")[0]["n"] == 0


def test_simulated_run_records_agent_log_for_every_step(client):
    res = client.post("/tasks/run", json={"steps": [{"action": "Open URL", "selector": "https://a.test"},
                                                    {"action": "Click", "selector": "#b"}]})
    run_id = res.json()["data"]["task_id"]
    deadline = time.monotonic() + 5
    while client.get(f"/tasks/{run_id}").json()["data"]["status"] != "completed":
        assert time.monotonic() < deadline
        time.sleep(0.02)
    for step_no in (1, 2):
        lines = _evidence(client, run_id, step_no)["agent_log"]["payload"]["lines"]
        assert lines[0]["message"].startswith("[Simulated]") and lines[-1]["level"] == "SUCCESS"
