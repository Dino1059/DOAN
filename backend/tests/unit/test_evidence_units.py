import io
import json

import pytest
from PIL import Image

from app.modules.evidence.masking import MASK, mask_body, mask_secrets, mask_text
from app.modules.evidence.storage import LocalStorage
from app.modules.evidence.visual_diff import compare


def _png(color=(255, 255, 255), box=None, size=(100, 100)) -> bytes:
    img = Image.new("RGB", size, color)
    if box:
        img.paste((0, 0, 0), box)
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


# ---------- che bí mật ----------

def test_secret_keys_are_masked_recursively_but_normal_fields_are_kept():
    payload = {"password": "123", "status_code": 200, "nested": [{"api_key": "sk-abc", "email": "a@b.test"}]}
    assert mask_secrets(payload) == {"password": MASK, "status_code": 200, "nested": [{"api_key": MASK, "email": "a@b.test"}]}


def test_json_body_with_password_is_masked():
    body = mask_body('{"email": "a@b.test", "password": "123", "otp": "654321"}')
    data = json.loads(body)
    assert data["password"] == MASK and data["otp"] == MASK and data["email"] == "a@b.test"


@pytest.mark.parametrize(("text", "leak"), [
    ('POST /login body={"password":"123"}', "123"),
    ("GET /api?token=abcdef&page=2", "abcdef"),
    ("Authorization: Bearer eyJhbGciOi.xyz", "eyJhbGciOi"),
    ("otp: 654321 accepted", "654321"),
])
def test_secrets_inside_free_text_are_masked(text, leak):
    masked = mask_text(text)
    assert leak not in masked and MASK in masked


# ---------- storage ----------

def test_storage_saves_reads_and_blocks_path_traversal(tmp_path):
    storage = LocalStorage(tmp_path)
    storage.save("runs/RUN-1/a.png", b"png")
    assert storage.read("runs/RUN-1/a.png") == b"png"
    with pytest.raises(ValueError):
        storage.save("../outside.txt", b"x")
    with pytest.raises(FileNotFoundError):
        storage.path("runs/RUN-1/missing.png")
    storage.delete_prefix("runs/RUN-1")
    assert not (tmp_path / "runs" / "RUN-1").exists()


# ---------- visual diff ----------

def test_identical_screenshots_have_zero_diff():
    assert compare(_png(), _png()).diff_percent == 0.0


def test_changed_region_is_measured():
    result = compare(_png(), _png(box=(0, 0, 50, 20)))  # 50x20 = 1000 / 10000 pixel = 10%
    assert result.diff_percent == 10.0 and not result.size_changed
    assert Image.open(io.BytesIO(result.diff_png)).size == (100, 100)


def test_different_sizes_are_flagged():
    assert compare(_png(size=(100, 100)), _png(size=(120, 100))).size_changed
