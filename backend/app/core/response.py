from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Envelope(BaseModel, Generic[T]):
    """Dạng response thành công chung: {"data": ...}."""

    data: T


def ok(data: T) -> dict[str, T]:
    return {"data": data}
