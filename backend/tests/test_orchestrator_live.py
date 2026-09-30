"""Orchestrator (M4) chạy Playwright thật lên trang demo tĩnh — không tốn tiền, không cần mạng,
nhưng cần đã `python -m playwright install chromium` và chậm hơn test thường (mở trình duyệt thật).

Chạy:  RUN_LIVE_BROWSER=1 pytest tests/test_orchestrator_live.py -s
"""
import asyncio
import os
import time
from pathlib import Path

import pytest

from app.agents.orchestrator import Orchestrator
from app.db.session import SessionLocal
from app.modules.execution.control import RunControl
from app.modules.execution.events import RunEvents
from app.modules.execution.models import TestRun
from app.modules.execution.repository import RunRepository, RunStore, StepSnapshot
from app.core.config import settings
from app.core.ids import new_id
from app.modules.evidence.service import EvidenceRecorder
from app.modules.evidence.storage import LocalStorage
from tests.conftest import ensure_user, run_sql

pytestmark = [
    pytest.mark.skipif(os.environ.get("RUN_LIVE_BROWSER") != "1", reason="set RUN_LIVE_BROWSER=1 to launch Chromium"),
    pytest.mark.usefixtures("clean_db"),
]

SITE_URL = (Path(__file__).parent / "fixtures/site/index.html").resolve().as_uri()
OWNER = "USR-LIVE-TEST"


@pytest.fixture(autouse=True)
def _owner(clean_db):
    ensure_user(OWNER)  # owner_id có khoá ngoại tới users (M7); chạy sau clean_db


async def _make_run(steps: list[tuple[str, str, str]]) -> tuple[str, list[StepSnapshot]]:
    async with SessionLocal() as session:
        repo = RunRepository(session)
        run = await repo.create_run(
            TestRun(
                id=new_id("RUN"), owner_id=OWNER, name="Live Playwright test", suite="live",
                browser="Chromium", config={"runner": "playwright"}, status="queued",
            ),
            steps,
        )
        await session.commit()
        snapshots = [StepSnapshot(s.id, s.step_no, s.action, s.selector, s.expected) for s in run.steps]
        return run.id, snapshots


async def _final_run(run_id: str) -> TestRun:
    async with SessionLocal() as session:
        return await RunRepository(session).get_owned(run_id, OWNER)


def test_forgot_password_flow_runs_in_a_real_browser():
    steps = [
        ("Open URL", SITE_URL, ""),
        ("Click Element", "#forgot-password-link", ""),
        ("Verify Element Visible", "#forgot-screen", ""),
        ("Fill Input", "#reset-email-input", ""),
        ("Click Element", "#send-reset-btn", ""),
        ("Verify Text", "#reset-toast", "Success"),
    ]

    async def scenario():
        run_id, snapshots = await _make_run(steps)
        orchestrator = Orchestrator(human_timeout=30)
        control, events = RunControl(), RunEvents()
        store = RunStore(SessionLocal, evidence=EvidenceRecorder(SessionLocal, LocalStorage(settings.artifacts_dir)))
        await orchestrator.run(run_id, snapshots, {"headless": True}, control, events, store)
        return await _final_run(run_id)

    run = asyncio.run(scenario())
    print(f"\nrun status: {run.status}")
    for s in run.steps:
        print(f"  {s.step_no}. {s.action} -> {s.status}: {s.observation}")

    assert run.status == "completed"
    assert [s.status for s in run.steps] == ["passed"] * len(steps)
    # M6: mỗi bước có 1 ảnh chụp thật (PNG trên đĩa) + agent log
    shots = run_sql("SELECT storage_key FROM evidence_artifacts WHERE kind = 'screenshot'")
    assert len(shots) == len(steps)
    assert all((settings.artifacts_dir / r["storage_key"]).read_bytes()[:8] == b"\x89PNG\r\n\x1a\n" for r in shots)
    assert run_sql("SELECT count(*) AS n FROM evidence_artifacts WHERE kind = 'agent_log'")[0]["n"] == len(steps)
    # User Simulator điền email mặc định (không có test_data) đúng vào ô email
    assert "@" in run.steps[3].observation


def test_otp_step_asks_for_human_input_and_a_real_browser_verifies_it():
    steps = [
        ("Open URL", SITE_URL, ""),
        ("Fill Input", "#email-input", ""),
        ("Fill Input", "#password-input", ""),
        ("Click Element", "#login-btn", ""),
        ("Verify Element Visible", "#otp-screen", ""),
        ("Fill Input", "#otp-input", "OTP is accepted"),
        ("Click Element", "#verify-otp-btn", ""),
        ("Verify Element Visible", "#dashboard-screen", ""),
    ]
    # Email chứa "otp" → trang demo bắt xác thực 2 bước (tests/fixtures/site/index.html)
    env = {"headless": True, "test_data": {"email": "otp-tester@example.test"}}

    async def answer_when_waiting(run_id: str, control: RunControl) -> None:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            run = await _final_run(run_id)
            if run.status == "waiting_human_input":
                # Làm đúng như ExecutionService.provide_human_input: đóng câu hỏi + đưa run về
                # 'running' trong DB TRƯỚC, rồi mới báo runner. Bỏ bước DB thì runner không
                # chuyển được sang 'completed' (waiting_human_input → completed là không hợp lệ).
                async with SessionLocal() as session:
                    repo = RunRepository(session)
                    locked = await repo.get_owned(run_id, OWNER, lock=True)
                    pending = await repo.pending_intervention(run_id)
                    await repo.answer_intervention(pending, answer="••••21", decision=None, user_id=OWNER)
                    await repo.set_status(locked, "running")
                    await session.commit()
                await control.send(run_id, "human_input", "654321")
                return
            await asyncio.sleep(0.1)
        raise AssertionError("orchestrator never asked for human input")

    async def scenario():
        run_id, snapshots = await _make_run(steps)
        orchestrator = Orchestrator(human_timeout=30)
        control, events = RunControl(), RunEvents()
        store = RunStore(SessionLocal, evidence=EvidenceRecorder(SessionLocal, LocalStorage(settings.artifacts_dir)))
        await asyncio.gather(
            orchestrator.run(run_id, snapshots, env, control, events, store),
            answer_when_waiting(run_id, control),
        )
        return await _final_run(run_id)

    run = asyncio.run(scenario())
    print(f"\nrun status: {run.status}")
    for s in run.steps:
        print(f"  {s.step_no}. {s.action} -> {s.status}: {s.observation}")

    assert run.status == "completed"
    assert [s.status for s in run.steps] == ["passed"] * len(steps)
    # M6: mỗi bước có 1 ảnh chụp thật (PNG trên đĩa) + agent log
    shots = run_sql("SELECT storage_key FROM evidence_artifacts WHERE kind = 'screenshot'")
    assert len(shots) == len(steps)
    assert all((settings.artifacts_dir / r["storage_key"]).read_bytes()[:8] == b"\x89PNG\r\n\x1a\n" for r in shots)
    assert run_sql("SELECT count(*) AS n FROM evidence_artifacts WHERE kind = 'agent_log'")[0]["n"] == len(steps)
    # OTP người nhập và mật khẩu không được lọt vào observation lẫn bằng chứng
    stored = " ".join(r["p"] for r in run_sql("SELECT coalesce(payload::text, '') AS p FROM evidence_artifacts"))
    observations = " ".join(s.observation or "" for s in run.steps)
    for secret in ("654321", "Test-Pass123!"):
        assert secret not in stored and secret not in observations


def test_network_evidence_is_captured_over_http():
    """Trang demo phục vụ qua HTTP cục bộ → có request thật để ghi vào tab API Validation."""
    import functools
    import http.server
    import threading

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(Path(SITE_URL[7:]).parent))
    handler.log_message = lambda *a, **k: None
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    steps = [
        ("Open URL", f"{base}/index.html?token=abc123", ""),
        ("Verify API Response", f"GET {base}/index.html", "HTTP 200 is returned"),
    ]

    async def scenario():
        run_id, snapshots = await _make_run(steps)
        store = RunStore(SessionLocal, evidence=EvidenceRecorder(SessionLocal, LocalStorage(settings.artifacts_dir)))
        await Orchestrator(human_timeout=30).run(run_id, snapshots, {"headless": True}, RunControl(), RunEvents(), store)
        return await _final_run(run_id)

    try:
        run = asyncio.run(scenario())
    finally:
        server.shutdown()

    assert run.status == "completed", [s.observation for s in run.steps]
    [open_net] = run_sql(
        "SELECT e.payload FROM evidence_artifacts e JOIN test_run_steps s ON s.id = e.step_id "
        "WHERE e.kind = 'network' AND s.step_no = 1"
    )
    doc = open_net["payload"]["requests"][0]
    assert doc["method"] == "GET" and doc["status_code"] == 200 and doc["resource_type"] == "document"
    assert "abc123" not in doc["url"]  # token trong URL bị che
    [api_net] = run_sql(
        "SELECT e.payload FROM evidence_artifacts e JOIN test_run_steps s ON s.id = e.step_id "
        "WHERE e.kind = 'network' AND s.step_no = 2"
    )
    api = api_net["payload"]["api_check"]
    assert api["status_code"] == 200 and api["expected"] == "HTTP 200 is returned"
    assert "Reset your password" in api["response_body"] and api["response_ms"] >= 0
