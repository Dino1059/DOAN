"""Browser Executor Agent (M4): đổi 1 bước (action + selector) thành lệnh Playwright thật.

Chỉ THỰC HIỆN hành động và quan sát kết quả — không quyết định passed/failed (việc của
evaluator_agent.py). Action được nhận diện lỏng (chứa từ khoá) để khớp đúng các action Planner
Agent hay sinh ra (xem SYSTEM_PROMPT trong planner_agent.py).
"""
import asyncio
import re
import time

from playwright.async_api import Error as PlaywrightError
from playwright.async_api import Page, TimeoutError as PlaywrightTimeoutError

from app.agents.protocol import RawObservation

_API_RE = re.compile(r"^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)$", re.I)
_STATUS_RE = re.compile(r"\b(\d{3})\b")
# Chốt chặn cuối: Playwright có timeout riêng cho từng lệnh (context.set_default_timeout), nhưng
# nếu trình duyệt "đứng hình" (crash lặng, IPC treo) lệnh có thể không bao giờ trả lời — khi đó
# 1 bước treo mãi sẽ làm kẹt luôn cả run. asyncio.wait_for đảm bảo executor luôn trả lời trong
# STEP_TIMEOUT_SECONDS, dù Playwright có tự timeout hay không.
STEP_TIMEOUT_SECONDS = 25
MAX_BODY_CHARS = 4000  # body response giữ lại làm evidence (M6)


def _keyword(action: str, *words: str) -> bool:
    action = action.lower()
    return any(w in action for w in words)


async def execute_step(page: Page, action: str, selector: str, expected: str, value: str | None = None) -> RawObservation:
    """Thực hiện 1 bước. Lỗi Playwright (timeout, không tìm thấy phần tử, trình duyệt treo...) → ok=False, không ném lỗi."""
    try:
        return await asyncio.wait_for(_dispatch(page, action, selector, expected, value), STEP_TIMEOUT_SECONDS)
    except TimeoutError:
        return RawObservation(False, f"Executor step timed out after {STEP_TIMEOUT_SECONDS}s (browser may be unresponsive)")
    except PlaywrightTimeoutError:
        return RawObservation(False, f"Timed out waiting for '{selector}'")
    except PlaywrightError as exc:
        return RawObservation(False, str(exc).splitlines()[0][:300])


async def _dispatch(page: Page, action: str, selector: str, expected: str, value: str | None) -> RawObservation:
    if _keyword(action, "open url", "navigate", "goto"):
        await page.goto(selector, wait_until="domcontentloaded")
        return RawObservation(True, f"Navigated to {page.url}")

    if _keyword(action, "verify api", "api response", "http"):
        return await _check_api(page, selector)

    if _keyword(action, "verify url"):
        return RawObservation(True, page.url)

    if _keyword(action, "verify element visible", "verify visible", "wait for element", "wait for"):
        await page.wait_for_selector(selector, state="visible")
        return RawObservation(True, "visible")

    if _keyword(action, "verify text", "verify element", "verify"):
        locator = page.locator(selector).first
        await locator.wait_for(state="attached")
        text = (await locator.text_content() or "").strip()
        return RawObservation(True, text)

    if _keyword(action, "select option", "select"):
        await page.select_option(selector, label=value or expected)
        return RawObservation(True, f"Selected '{value or expected}' in {selector}")

    if _keyword(action, "fill", "type", "enter"):
        await page.fill(selector, value or "")
        return RawObservation(True, f"Filled {selector} with '{value or ''}'")

    if _keyword(action, "press key", "press"):
        # Quy ước: selector là tên phím (vd "Enter"); action cũ hơn có thể không rõ phím → mặc định Enter.
        key = selector.strip() or "Enter"
        await page.keyboard.press(key)
        return RawObservation(True, f"Pressed '{key}'")

    if _keyword(action, "click", "tap"):
        await page.click(selector)
        return RawObservation(True, f"Clicked {selector}")

    return RawObservation(False, f"Executor does not know how to run action '{action}'")


async def _check_api(page: Page, selector: str) -> RawObservation:
    match = _API_RE.match(selector.strip())
    if not match:
        return RawObservation(False, f"Expected 'METHOD /path', got '{selector}'")
    method, path = match.group(1).upper(), match.group(2)
    url = path if path.startswith("http") else page.url.rstrip("/") + "/" + path.lstrip("/")
    started = time.monotonic()
    try:
        response = await page.request.fetch(url, method=method)
        body = (await response.text())[:MAX_BODY_CHARS]
    except PlaywrightError as exc:
        return RawObservation(False, f"{method} {path} failed: {exc}")
    extra = {
        "method": method,
        "url": url,
        "status_code": response.status,
        "response_ms": int((time.monotonic() - started) * 1000),
        "response_body": body,
    }
    return RawObservation(True, f"{method} {path} -> HTTP {response.status}", extra=extra)
