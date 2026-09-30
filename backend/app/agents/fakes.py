"""Bản giả lập dùng chung (BUILD_PLAN mục 3.5): test tự động, và demo khi không có mạng/key.

Bật bằng AGENT_MODE=fake. Cùng giao diện với bản thật nên service không phải sửa.
"""
import re
import time
from typing import Any

from app.agents.llm.base import LLMJsonResult
from app.agents.protocol import Artifact, ChatTurn, LLMUsage, PlanDraft, StepDraft

_URL_RE = re.compile(r"(https?://[^\s,]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.[a-z]{2,}\b|\b[a-z0-9-]+\.(?:com|net|org|io|vn|dev|app)\b)", re.I)


class FakePlanner:
    """Sinh kịch bản mẫu 6 bước, không gọi LLM. Kết quả cố định để test dễ kiểm tra."""

    async def generate(
        self, prompt: str, history: list[ChatTurn], current_plan: dict[str, Any] | None = None
    ) -> PlanDraft:
        match = _URL_RE.search(prompt)
        target = ""
        if match:
            target = match.group(0).rstrip(".")
            if not target.startswith("http"):
                target = "https://" + target
        base = target or "https://example.test"
        steps = [
            StepDraft("Open URL", f"{base}/login", "Login page is displayed"),
            StepDraft("Click Element", "#forgot-password-link", "Forgot password form is displayed"),
            StepDraft("Fill Input", "#email-input", "Test email is entered"),
            StepDraft("Click Element", "#send-reset-btn", "Reset request is submitted"),
            StepDraft("Verify Element Visible", ".toast-success", "Success message is shown"),
            StepDraft("Verify API Response", "POST /api/auth/forgot-password", "HTTP 200 is returned"),
        ]
        if current_plan:
            # Mô phỏng "sửa qua chat" giống LLM thật: giữ nguyên plan hiện tại, chỉ đổi bước 3.
            steps = [StepDraft(s["action"], s["selector"], s["expected"]) for s in current_plan["steps"]]
            if len(steps) >= 3:
                steps[2] = StepDraft(steps[2].action, steps[2].selector, f"Updated: {prompt[:60]}")
            target = current_plan.get("target_url") or target
        return PlanDraft(
            title=prompt.strip()[:60] or "Untitled test",
            reply=f"I planned {len(steps)} steps for this flow.",
            objective=f"Verify: {prompt.strip()[:120]}",
            target_url=target,
            preconditions=["Target application is reachable"],
            test_data={"email": "user@example.test"},
            steps=steps,
            usage=LLMUsage(provider="fake", model="fake-planner"),
        )


class FakeLLMProvider:
    """LLM giả trả JSON cố định — dùng để test PlannerAgent mà không gọi OpenAI."""

    def __init__(self, data: dict[str, Any]) -> None:
        self.data = data
        self.calls: list[list[dict[str, str]]] = []

    async def complete_json(self, messages, *, schema_name, schema) -> LLMJsonResult:
        self.calls.append(messages)
        return LLMJsonResult(data=self.data, usage=LLMUsage(provider="fake", model="fake-llm", prompt_tokens=10, completion_tokens=20))


# ---------- M3a: chạy test giả lập ----------

_ASK_HUMAN_RE = re.compile(r"\b(otp|verification code|2fa|captcha)\b", re.I)


class SimulatedRunner:
    """Chạy giả lập: mỗi bước chờ vài giây rồi passed. Cùng chữ ký với orchestrator.run (M4).

    Bước có chữ "OTP" (hoặc captcha, 2FA...) sẽ dừng lại hỏi người 1 lần, để test luồng Human Intervention.
    Không mở trình duyệt, không gọi LLM: observation ghi rõ "[Simulated]" để không nhầm với chạy thật.
    """

    name = "simulated"

    def __init__(self, step_seconds: float, human_timeout: float) -> None:
        self.step_seconds = step_seconds
        self.human_timeout = human_timeout

    async def run(self, run_id, steps, env, control, events, repo) -> None:
        # Import tại chỗ: agents không phụ thuộc module execution lúc import.
        from app.modules.execution.control import HumanInputTimeout, RunCancelled
        from app.modules.execution.support import advance

        try:
            await advance(run_id, "running", control, events, repo)
            for step in steps:
                await control.wait_while_paused(run_id)
                await repo.start_step(run_id, step)
                await events.publish(
                    run_id, {"type": "step", "step_no": step.step_no, "status": "running", "current_step": step.step_no}
                )
                started = time.monotonic()
                await control.sleep(run_id, self.step_seconds)

                observation = f"[Simulated] {step.action} on {step.selector or '(page)'}: {step.expected or 'done'}."
                text = f"{step.action} {step.selector} {step.expected}"
                if _ASK_HUMAN_RE.search(text):
                    question = f"Step {step.step_no} needs a one-time code (OTP). Please enter it to continue."
                    while not await repo.ask_human(run_id, step.id, question):
                        await control.wait_while_paused(run_id)
                        await control.sleep(run_id, 0.05)
                    await events.publish(
                        run_id, {"type": "status", "status": "waiting_human_input", "human_prompt": question}
                    )
                    await control.wait_for_human_input(run_id, self.human_timeout)
                    # Service đã chuyển run về 'running' và publish khi nhận câu trả lời.
                    observation = f"[Simulated] Entered the code provided by the user into {step.selector or 'the form'}."

                duration_ms = int((time.monotonic() - started) * 1000)
                # M6: chỉ có agent log (không có trình duyệt → không có ảnh, network, console)
                await repo.save_evidence(run_id, step, [Artifact("agent_log", {"lines": [
                    {"t_ms": 0, "level": "INFO", "agent": "orchestrator", "message": f"[Simulated] Step {step.step_no}: {step.action}"},
                    {"t_ms": duration_ms, "level": "SUCCESS", "agent": "evaluator", "message": observation},
                ]})])
                await repo.finish_step(step.id, "passed", observation, duration_ms)
                await events.publish(
                    run_id,
                    {"type": "step", "step_no": step.step_no, "status": "passed", "observation": observation,
                     "duration_ms": duration_ms},
                )
            await advance(run_id, "completed", control, events, repo)
        except RunCancelled:
            return  # Stop: service đã ghi 'cancelled' và publish
        except HumanInputTimeout:
            if await repo.fail(run_id, "Timed out waiting for human input"):
                await events.publish(run_id, {"type": "status", "status": "failed"})
