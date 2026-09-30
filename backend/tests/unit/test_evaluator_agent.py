from app.agents.evaluator_agent import evaluate
from app.agents.protocol import RawObservation


def test_executor_failure_is_always_failed():
    result = evaluate("Verify Text", "Success", RawObservation(False, "Timed out waiting for '.toast'"), 120)
    assert result.status == "failed" and "Timed out" in result.observation


def test_non_verify_action_passes_when_executor_succeeded():
    result = evaluate("Click Element", "", RawObservation(True, "Clicked #submit"), 50)
    assert result.status == "passed" and result.observation == "Clicked #submit"


def test_verify_step_without_expectation_passes():
    result = evaluate("Verify Element Visible", "", RawObservation(True, "visible"), 10)
    assert result.status == "passed"


def test_verify_step_matches_substring_case_insensitively():
    result = evaluate("Verify Text", "success", RawObservation(True, "SUCCESS! Link sent."), 10)
    assert result.status == "passed"


def test_verify_step_fails_when_text_does_not_match():
    result = evaluate("Verify Text", "Success", RawObservation(True, "Something went wrong"), 10)
    assert result.status == "failed"
    assert "Success" in result.observation and "Something went wrong" in result.observation


def test_verify_api_response_matches_status_code():
    passed = evaluate("Verify API Response", "HTTP 200 is returned", RawObservation(True, "GET /api -> HTTP 200"), 10)
    failed = evaluate("Verify API Response", "HTTP 200 is returned", RawObservation(True, "GET /api -> HTTP 404"), 10)
    assert passed.status == "passed" and failed.status == "failed"
