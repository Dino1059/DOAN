from uuid import uuid4


def new_id(prefix: str) -> str:
    """Sinh khoá chính dạng 'FBK-9F3A21C4' (quy ước ID có tiền tố, mục 10.4)."""
    return f"{prefix}-{uuid4().hex[:8].upper()}"
