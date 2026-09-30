"""So 2 ảnh chụp cùng 1 bước (run cũ = baseline, run chạy lại = actual) → % pixel khác + ảnh diff.

Chạy trong thread (asyncio.to_thread) vì xử lý ảnh là việc nặng CPU, không để chặn event loop.
"""
import io
from dataclasses import dataclass

from PIL import Image, ImageChops

# Pixel khác nhau ít hơn ngưỡng này (trên thang 0–255) coi là giống (khử nhiễu font/anti-alias)
PIXEL_THRESHOLD = 16


@dataclass(frozen=True)
class DiffResult:
    diff_percent: float  # 0.0–100.0
    diff_png: bytes  # ảnh actual, vùng khác tô đỏ
    size_changed: bool


def compare(baseline_png: bytes, actual_png: bytes) -> DiffResult:
    baseline = Image.open(io.BytesIO(baseline_png)).convert("RGB")
    actual = Image.open(io.BytesIO(actual_png)).convert("RGB")
    size_changed = baseline.size != actual.size
    if size_changed:
        baseline = baseline.resize(actual.size)

    diff = ImageChops.difference(baseline, actual).convert("L")
    mask = diff.point(lambda v: 255 if v > PIXEL_THRESHOLD else 0)
    changed = mask.histogram()[255]
    total = actual.size[0] * actual.size[1]

    # Ảnh diff: nền là ảnh actual làm mờ, pixel khác tô đỏ
    overlay = Image.blend(actual, Image.new("RGB", actual.size, (255, 255, 255)), 0.6)
    overlay.paste(Image.new("RGB", actual.size, (230, 40, 40)), mask=mask)
    out = io.BytesIO()
    overlay.save(out, format="PNG")
    return DiffResult(round(changed * 100 / total, 2) if total else 0.0, out.getvalue(), size_changed)
