"""Orchestrator (M4): thay SimulatedRunner (M3a) bằng trình duyệt Playwright thật.

Cùng chữ ký `run(run_id, steps, env, control, events, repo)` nên execution/router.py chỉ đổi
1 dòng (chọn Orchestrator thay vì SimulatedRunner theo AGENT_MODE) để chuyển từ giả lập sang thật.

Mỗi bước: User Simulator chọn giá trị điền (nếu có) → Browser Executor chạy lệnh Playwright →
Evaluator so kết quả với `expected` → lưu bằng chứng (M6: ảnh chụp, network, console, agent log).
Bước đầu tiên thất bại thì dừng cả run (khác SimulatedRunner, vốn luôn "passed" vì không kiểm tra gì thật).
"""
import asyncio
import logging
import re
import time

from app.agents.browser_executor_agent import execute_step
from app.agents.evaluator_agent import evaluate
from app.agents.protocol import Artifact, NeedHumanInput
from app.agents.user_simulator_agent import fill_value, is_secret_field
from app.workers.browser_pool import open_page

log = logging.getLogger(__name__)

MASK = "••••"
SCREENSHOT_TIMEOUT_SECONDS = 10
MAX_REQUESTS_PER_STEP = 50
MAX_CONSOLE_LINES_PER_STEP = 100
_CSS_LIKE = re.compile(r"^[#.\[]|^[a-z][a-z0-9-]*[#.\[:]", re.I)  # "#id", ".class", "button:has-text(...)"


def _is_css(selector: str | None) -> bool:
    """'#id', '.class', 'button:has-text(...)' là selector; URL ('https://…', 'file://…') và 'GET /api' thì không."""
    return bool(selector) and "://" not in selector and " /" not in selector and bool(_CSS_LIKE.match(selector))


class StepRecorder:
    """Thu network + console của trình duyệt trong lúc 1 bước chạy, và các dòng agent log."""

    def __init__(self, page) -> None:
        self._starts: dict = {}
        self.requests: list[dict] = []
        self.console: list[dict] = []
        self.log_lines: list[dict] = []
        self._t0 = time.monotonic()
        page.on("request", self._on_request)
        page.on("response", self._on_response)
        page.on("console", self._on_console)

    def reset(self) -> None:
        self.requests, self.console, self.log_lines = [], [], []
        self._t0 = time.monotonic()

    def log(self, level: str, agent: str, message: str) -> None:
        self.log_lines.append(
            {"t_ms": int((time.monotonic() - self._t0) * 1000), "level": level, "agent": agent, "message": message}
        )

    def _on_request(self, request) -> None:
        self._starts[request] = time.monotonic()

    def _on_response(self, response) -> None:
        request = response.request
        started = self._starts.pop(request, None)
        if not response.url.startswith(("http://", "https://")) or len(self.requests) >= MAX_REQUESTS_PER_STEP:
            return
        self.requests.append({
            "method": request.method,
            "url": response.url,
            "status_code": response.status,
            "resource_type": request.resource_type,
            "response_ms": int((time.monotonic() - started) * 1000) if started else None,
        })

    def _on_console(self, message) -> None:
        if len(self.console) < MAX_CONSOLE_LINES_PER_STEP:
            self.console.append({"level": message.type, "text": message.text[:1000]})


class Orchestrator:
    name = "playwright"

    def __init__(self, human_timeout: float) -> None:
        self.human_timeout = human_timeout

    async def run(self, run_id, steps, env, control, events, repo) -> None:
        from app.modules.execution.control import HumanInputTimeout, RunCancelled
        from app.modules.execution.support import advance

        env = env or {}
        test_data = {str(k): str(v) for k, v in (env.get("test_data") or {}).items()}

        try:
            await advance(run_id, "running", control, events, repo)
            async with open_page(env) as page:
                recorder = StepRecorder(page)
                for step in steps:
                    await control.wait_while_paused(run_id)
                    await repo.start_step(run_id, step)
                    await events.publish(
                        run_id, {"type": "step", "step_no": step.step_no, "status": "running", "current_step": step.step_no}
                    )
                    recorder.reset()
                    recorder.log("INFO", "orchestrator", f"Step {step.step_no}: {step.action} {step.selector}".strip())
                    started = time.monotonic()

                    secret = is_secret_field(step.selector, step.expected)
                    value = fill_value(step.action, step.selector, step.expected, test_data)
                    if isinstance(value, NeedHumanInput):
                        recorder.log("TRACE", "user_simulator", f"No test data for {step.selector}; asking a human")
                        value = await self._ask_human(
                            run_id, step.id, value.question, control, events, repo, self.human_timeout
                        )
                        secret = True  # người nhập (OTP...) → luôn coi là bí mật
                        recorder.log("TRACE", "user_simulator", "Human provided the value")
                    elif value:
                        recorder.log("ACTION", "user_simulator", f"Value for {step.selector}: {MASK if secret else value!r}")

                    observation = await execute_step(page, step.action, step.selector, step.expected, value=value)
                    if secret and value:
                        # Executor ghi lại giá trị đã điền — không để OTP/mật khẩu lọt vào observation, log, evidence
                        observation = type(observation)(
                            observation.ok, observation.detail.replace(value, MASK), observation.extra
                        )
                    recorder.log("ACTION" if observation.ok else "ERROR", "browser_executor", observation.detail)

                    duration_ms = int((time.monotonic() - started) * 1000)
                    result = evaluate(step.action, step.expected, observation, duration_ms)
                    recorder.log("SUCCESS" if result.status == "passed" else "ERROR", "evaluator", result.observation)

                    # Lưu bằng chứng TRƯỚC khi báo "bước xong": UI nhận sự kiện là tải được evidence ngay
                    artifacts = await self._collect(page, step, observation, recorder)
                    await repo.save_evidence(run_id, step, artifacts)

                    await repo.finish_step(step.id, result.status, result.observation, result.duration_ms)
                    await events.publish(
                        run_id,
                        {"type": "step", "step_no": step.step_no, "status": result.status,
                         "observation": result.observation, "duration_ms": result.duration_ms},
                    )
                    if result.status == "failed":
                        message = f"Step {step.step_no} ({step.action}) failed: {result.observation}"[:500]
                        await advance(run_id, "failed", control, events, repo, error_message=message)
                        return

            await advance(run_id, "completed", control, events, repo)
        except RunCancelled:
            return  # Stop: service đã ghi 'cancelled' và publish
        except HumanInputTimeout:
            if await repo.fail(run_id, "Timed out waiting for human input"):
                await events.publish(run_id, {"type": "status", "status": "failed"})

    @staticmethod
    async def _collect(page, step, observation, recorder: StepRecorder) -> list[Artifact]:
        """5 loại bằng chứng của 1 bước (visual_diff do EvidenceRecorder tự tính khi là Re-run)."""
        artifacts = [Artifact("agent_log", {"lines": recorder.log_lines})]

        network = {"requests": recorder.requests}
        if observation.extra:  # bước Verify API Response
            network["api_check"] = {**observation.extra, "expected": step.expected}
        if recorder.requests or observation.extra:
            artifacts.append(Artifact("network", network))
        if recorder.console:
            artifacts.append(Artifact("console", {"lines": recorder.console}))

        try:
            png = await asyncio.wait_for(page.screenshot(type="png"), SCREENSHOT_TIMEOUT_SECONDS)
            highlight = step.selector if _is_css(step.selector) else None
            artifacts.append(Artifact("screenshot", {"highlight_selector": highlight, "page_url": page.url}, png))
        except Exception as exc:  # trang đã đóng / trình duyệt treo: vẫn lưu các bằng chứng còn lại
            log.warning("Screenshot failed for step %s: %s", step.step_no, exc)
        return artifacts

    @staticmethod
    async def _ask_human(run_id: str, step_id: str, question: str, control, events, repo, timeout: float) -> str:
        while not await repo.ask_human(run_id, step_id, question):
            await control.wait_while_paused(run_id)
            await control.sleep(run_id, 0.05)
        await events.publish(run_id, {"type": "status", "status": "waiting_human_input", "human_prompt": question})
        return await control.wait_for_human_input(run_id, timeout)
