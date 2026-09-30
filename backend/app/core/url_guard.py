"""Chống SSRF (M8): chặn environment/redirect trỏ vào mạng nội bộ hoặc metadata endpoint.

Dùng ở 2 chỗ: lúc tạo/sửa environment (`EnvironmentService`) và lúc Playwright điều hướng
(`workers/browser_pool.py`, chặn cả khi trang redirect sang IP nội bộ sau khi đã qua bước tạo).
"""
import ipaddress
import socket
from urllib.parse import urlsplit

from app.core.config import settings
from app.core.exceptions import InvalidInput

ALLOWED_SCHEMES = ("http", "https")


class BlockedTarget(InvalidInput):
    code = "TARGET_BLOCKED"


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local  # gồm 169.254.169.254 (metadata AWS/GCP/Azure)
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def validate_target_url(url: str) -> None:
    """Ném `BlockedTarget` (422) nếu URL không phải http/https hoặc phân giải ra IP nội bộ."""
    if settings.allow_private_targets:
        return

    parts = urlsplit(url)
    if parts.scheme not in ALLOWED_SCHEMES:
        raise BlockedTarget(f"Only http/https URLs are allowed, got: {parts.scheme or '(none)'}")
    host = parts.hostname
    if not host:
        raise BlockedTarget("URL has no host")

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise BlockedTarget(f"Could not resolve host: {host}") from None

    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if _is_blocked_ip(ip):
            raise BlockedTarget(f"Target resolves to a blocked address: {host} -> {ip}")
