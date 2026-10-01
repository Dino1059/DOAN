"""M11: render(run, evidence_counts) -> Markdown. Không gọi LLM — thuần ghép chuỗi từ dữ liệu đã có (M5 + M6)."""
from app.modules.test_runs.schemas import RunDetail


def render(run: RunDetail, evidence_counts: dict[int, int]) -> str:
    lines = [
        f"# Test Report — {run.name}",
        "",
        f"- **Run ID:** {run.run_id}",
        f"- **Status:** {run.status}",
        f"- **Suite:** {run.suite}",
        f"- **Environment:** {run.env} / {run.browser}",
        f"- **Duration:** {run.duration}",
        f"- **Started:** {run.started_at.isoformat() if run.started_at else '—'}",
        f"- **Finished:** {run.finished_at.isoformat() if run.finished_at else '—'}",
        "",
        "## Summary",
        "",
        f"- Passed steps: {run.passed_steps}",
        f"- Failed steps: {run.failed_steps}",
        f"- Total steps: {len(run.steps)}",
    ]
    if run.error_message:
        lines += ["", "## Error", "", run.error_message]

    lines += ["", "## Steps", "", "| # | Action | Selector | Expected | Status | Duration | Observation | Evidence |",
              "|---|---|---|---|---|---|---|---|"]
    for step in run.steps:
        duration = f"{step.duration_ms} ms" if step.duration_ms is not None else "—"
        observation = (step.observation or "—").replace("|", "\\|").replace("\n", " ")
        count = evidence_counts.get(step.step_no, 0)
        evidence = f"[{count} item(s)](/evidence/{run.run_id}/steps/{step.step_no})" if count else "—"
        lines.append(
            f"| {step.step_no} | {step.action} | `{step.selector}` | {step.expected} | "
            f"{step.status} | {duration} | {observation} | {evidence} |"
        )

    if run.interventions:
        lines += ["", "## Human Interventions", ""]
        for i in run.interventions:
            lines.append(f"- Step {i.step_no or '—'}: _{i.question}_ → `{i.decision or i.answer or 'pending'}`")

    return "\n".join(lines) + "\n"
