# AI Agent Tester Backend

Backend FastAPI phục vụ frontend React tại cổng `8081`.

## Chạy local

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8081
```

API docs: http://localhost:8081/docs

## Kiến trúc

- `app/api/routes/`: endpoint HTTP/SSE, chỉ nhận request và gọi service.
- `app/schemas/`: request/response models bằng Pydantic.
- `app/services/`: nghiệp vụ tạo plan, chạy task và điều khiển task.
- `app/repositories/`: lớp lưu trữ; hiện dùng in-memory để chạy demo nhanh.
- `app/core/`: settings và các cấu hình dùng chung.
- `app/main.py`: khởi tạo FastAPI, CORS và đăng ký router.

Luồng chính:

`Frontend → Router → Service → Repository`

Khi triển khai thật, thay `InMemoryTaskRepository` bằng PostgreSQL repository và thêm Redis/Celery hoặc worker riêng cho Playwright; router và component frontend không cần đổi.



cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8081


cd frontend
npm install
npm run dev