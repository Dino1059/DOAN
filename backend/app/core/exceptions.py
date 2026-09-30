from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Lỗi nghiệp vụ. Service ném lỗi này, handler đổi thành HTTP response."""

    status_code = 400
    code = "DOMAIN_ERROR"

    def __init__(self, detail: str, *, code: str | None = None) -> None:
        super().__init__(detail)
        self.detail = detail
        if code:
            self.code = code


class NotFound(DomainError):
    status_code = 404
    code = "NOT_FOUND"


class InvalidInput(DomainError):
    """Dữ liệu hợp lệ về kiểu nhưng sai về nghiệp vụ (vd: chạy test mà không có plan)."""

    status_code = 422
    code = "INVALID_INPUT"


class Conflict(DomainError):
    status_code = 409
    code = "CONFLICT"


class UpstreamError(DomainError):
    """Dịch vụ bên ngoài (LLM, trình duyệt) lỗi hoặc trả dữ liệu hỏng."""

    status_code = 502
    code = "UPSTREAM_ERROR"


class ServiceUnavailable(DomainError):
    """Thiếu cấu hình để gọi dịch vụ bên ngoài (vd: chưa có OPENAI_API_KEY)."""

    status_code = 503
    code = "SERVICE_UNAVAILABLE"


def _field_name(loc: tuple) -> str:
    # ("body", "message") → "message"
    parts = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(parts) or "request"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail, "code": exc.code})

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Frontend hiển thị thẳng `detail` (api.ts › submitFeedback), nên detail phải là chuỗi đọc được.
        # Danh sách lỗi chi tiết vẫn trả trong `errors`.
        errors = [{"field": _field_name(e["loc"]), "message": e["msg"]} for e in exc.errors()]
        detail = "; ".join(f"{e['field']}: {e['message']}" for e in errors)
        return JSONResponse(
            status_code=422,
            content={"detail": detail, "code": "VALIDATION_ERROR", "errors": errors},
        )
