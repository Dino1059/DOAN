"""Mở 1 trình duyệt Playwright cho 1 lần chạy test (M4, thay SimulatedRunner của M3a).

`env` là dict con cấu hình chép từ test_runs.config, do `execution.service` ghép lại từ
`environments` (M8) khi run có chọn môi trường (vd {"headless": True, "viewport": {...}}).
Mỗi run tự mở/đóng trình duyệt riêng — đơn giản, đủ cho quy mô đồ án; dùng chung 1 browser cho
nhiều run (pool thật) để sau nếu cần tối ưu tốc độ.
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any

from playwright.async_api import Page, Route, async_playwright

from app.core.url_guard import BlockedTarget, validate_target_url

log = logging.getLogger(__name__)

DEFAULT_VIEWPORT = {"width": 1280, "height": 800}
NAVIGATION_TIMEOUT_MS = 15_000


async def _guard_route(route: Route) -> None:
    """Chặn SSRF: kiểm tra cả khi trang redirect sang IP nội bộ, không chỉ lúc tạo environment.

    file:// (trang demo cục bộ) và các request không phải điều hướng trang chính đều bỏ qua.
    """
    url = route.request.url
    if not url.startswith(("http://", "https://")):
        await route.continue_()
        return
    try:
        await asyncio.to_thread(validate_target_url, url)
    except BlockedTarget as exc:
        log.warning("Blocked navigation to %s: %s", url, exc.detail)
        await route.abort()
        return
    await route.continue_()


@asynccontextmanager
async def open_page(env: dict[str, Any] | None = None):
    """`async with open_page(env) as page: ...` — đóng browser dù bước nào ném lỗi."""
    env = env or {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=env.get("headless", True))
        context = await browser.new_context(viewport=env.get("viewport") or DEFAULT_VIEWPORT)
        context.set_default_timeout(NAVIGATION_TIMEOUT_MS)
        await context.route("**/*", _guard_route)
        page: Page = await context.new_page()
        try:
            yield page
        finally:
            await context.close()
            await browser.close()
