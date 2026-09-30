"""M8: unit test cho chống SSRF (BUILD_PLAN mục 3.4 — logic khó, không cần HTTP/DB)."""
import pytest

from app.core.config import settings
from app.core.url_guard import BlockedTarget, validate_target_url


@pytest.mark.parametrize("url", [
    "http://127.0.0.1/",
    "http://127.0.0.1:8080/admin",
    "http://169.254.169.254/latest/meta-data/",  # AWS/GCP/Azure metadata
    "http://10.0.0.5/",
    "http://172.16.0.1/",
    "http://192.168.1.1/",
    "http://[::1]/",
    "ftp://example.com/",
    "javascript:alert(1)",
])
def test_blocks_private_and_non_http_targets(url):
    with pytest.raises(BlockedTarget):
        validate_target_url(url)


def test_allows_when_private_targets_flag_is_on(monkeypatch):
    monkeypatch.setattr(settings, "allow_private_targets", True)
    validate_target_url("http://127.0.0.1/")  # không ném lỗi


def test_blocks_unresolvable_host():
    with pytest.raises(BlockedTarget):
        validate_target_url("http://this-host-should-not-resolve.invalid/")
