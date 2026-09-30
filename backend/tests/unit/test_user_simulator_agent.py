from app.agents.protocol import NeedHumanInput
from app.agents.user_simulator_agent import fill_value


def test_non_fill_action_needs_no_value():
    assert fill_value("Click Element", "#submit", "", {}) == ""


def test_uses_test_data_when_key_matches_selector():
    value = fill_value("Fill Input", "#email-input", "Test email is entered", {"email": "user@example.test"})
    assert value == "user@example.test"


def test_falls_back_to_a_sensible_default_without_test_data():
    assert fill_value("Fill Input", "#email-input", "", {}) == "user@example.test"
    assert fill_value("Fill Input", "#password-input", "", {}) == "Test-Pass123!"
    assert fill_value("Fill Input", "#comment-box", "", {}) == "Test value"


def test_otp_without_test_data_asks_a_human():
    result = fill_value("Fill Input", "#otp-input", "OTP is accepted", {})
    assert isinstance(result, NeedHumanInput)
    assert "otp" in result.question.lower() or "OTP" in result.question


def test_otp_present_in_test_data_does_not_ask_a_human():
    value = fill_value("Fill Input", "#otp-input", "OTP is accepted", {"otp": "111222"})
    assert value == "111222"
