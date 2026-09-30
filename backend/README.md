# AI Agent Tester Backend

Backend FastAPI phục vụ frontend React tại cổng `8081`. Dữ liệu lưu trong PostgreSQL.

## Chạy local

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env            # rồi điền OPENAI_API_KEY nếu cần
createdb ai_agent_tester        # PostgreSQL phải đang chạy
alembic upgrade head            # tạo/cập nhật bảng
python -m scripts.create_admin  # đặt mật khẩu tài khoản demo admin123 / 123 (M7)
python -m playwright install chromium   # trình duyệt cho Browser Executor Agent (M4)

uvicorn app.main:app --reload --host 0.0.0.0 --port 8081
```

- API docs: http://localhost:8081/docs
- Đăng nhập (M7): mọi API trừ `/health` và `/auth/*` cần cookie phiên. Mở frontend đúng địa chỉ trong `CORS_ORIGINS` (mặc định `http://localhost:5173`, **không** phải `127.0.0.1:5173`), nếu không trình duyệt sẽ không gửi cookie.
- Kiểm tra: `curl localhost:8081/health` → `{"status":"ok", ..., "database":"ok"}`

## Chạy test

```bash
createdb ai_agent_tester_test   # chỉ cần 1 lần
pytest
```

Test dùng DB riêng `ai_agent_tester_test` (đổi bằng biến `TEST_DATABASE_URL`). Mỗi lần chạy, test **dựng lại bảng bằng chính migration Alembic**, nên migration hỏng thì test cũng báo lỗi.

Test chạy với `AGENT_MODE=fake` nên **không gọi OpenAI, không mở trình duyệt** — Planner dùng `FakePlanner`, run dùng `SimulatedRunner` (M3a). Muốn kiểm tra với dịch vụ thật:

```bash
RUN_LIVE_LLM=1 pytest tests/test_planner_live.py -s         # gọi OpenAI thật (tốn vài phần nghìn USD)
RUN_LIVE_BROWSER=1 pytest tests/test_orchestrator_live.py -s  # mở Chromium thật lên trang demo (miễn phí, cần đã cài Chromium)
```

## LLM và trình duyệt (M2, M4)

- **Planner Agent** dùng **OpenAI `gpt-4o-mini`** (`OPENAI_MODEL`), key đọc từ `OPENAI_API_KEY` trong `backend/.env`.
- **Orchestrator** (chạy test) dùng **Playwright + Chromium** thật (`app/workers/browser_pool.py`, `app/agents/browser_executor_agent.py`). Mỗi run tự mở/đóng 1 trình duyệt riêng.
- `AGENT_MODE=real` (mặc định) dùng cả hai. `AGENT_MODE=fake` dùng bản giả lập trong `app/agents/fakes.py` (`FakePlanner`, `SimulatedRunner`) cho **cả hai** cùng lúc — không cần mạng, key hay Chromium, dùng cho test và demo dự phòng khi mất mạng.
- Sau mỗi bước, Orchestrator lưu bằng chứng (M6): ảnh chụp, request mạng, console, agent log; Re-run thì có thêm Visual Diff so với run gốc (Pillow). Bí mật bị che trước khi lưu.

## Chạy test (M3a: giả lập / M4: Playwright thật)

- **Giả lập** (`AGENT_MODE=fake`): mỗi bước mất `SIMULATED_STEP_SECONDS` giây (mặc định 2) rồi luôn `passed`, không mở trình duyệt.
- **Thật** (`AGENT_MODE=real`): Browser Executor chạy lệnh Playwright thật, Evaluator so với `expected` — bước có thể `failed`, và run dừng ngay khi bước đầu tiên `failed`.
- Cả hai chế độ: bước cần OTP/mã xác thực (selector/expected có chữ "OTP", "verification code", "2FA", "captcha") dừng lại chờ nhập ở khung Human Intervention (tối đa `HUMAN_INPUT_TIMEOUT_SECONDS`, mặc định 600).
- Run chạy trong bộ nhớ của server: tắt/restart server (kể cả `--reload` khi sửa code) thì run đang chạy bị đánh dấu `failed` ở lần khởi động sau.
- Trang demo để thử/test: `tests/fixtures/site/index.html` (mở qua `file://`, không cần server riêng) — có form quên mật khẩu và luồng đăng nhập + OTP.

## Thêm bảng mới

1. Viết `models.py` trong module, thêm 1 dòng import vào `app/db/all_models.py`.
2. `alembic revision -m "mô tả"` rồi viết `upgrade()` / `downgrade()` (hoặc `--autogenerate` rồi đọc lại).
3. `alembic upgrade head`, sau đó `alembic check` phải báo `No new upgrade operations detected`.

## Kiến trúc

Đang chuyển dần từ cấu trúc phân lớp cũ sang **module theo chiều dọc** (xem `docs/BACKEND_STRUCTURE_PLAN.md`, `docs/BUILD_PLAN.md`):

- `app/core/`: cấu hình, lỗi dùng chung (`DomainError` → HTTP), `/health`, sinh ID.
- `app/db/`: SQLAlchemy async (`base.py`, `session.py`), migration Alembic (`migrations/`).
- `app/modules/<domain>/`: mỗi domain gồm `router → service → repository → models`. Đã có: `feedback` (M1), `test_planning` (M2: hội thoại, plan có phiên bản, Session History), `execution` (M3: chạy test, pause/resume/stop, OTP, SSE, Re-run), `test_runs` (M5: lịch sử chạy — lọc, tìm kiếm, phân trang, chi tiết run; chỉ đọc bảng của M3), `auth` (M7: đăng ký, đăng nhập, phiên bằng cookie HttpOnly, mật khẩu Argon2id; `core/dependencies.get_current_user` đọc cookie), `evidence` (M6: ảnh chụp, network, console, agent log, visual diff từng bước; file ảnh lưu ở `ARTIFACTS_DIR`, mặc định `backend/data/artifacts/`), `environments` (M8: CRUD + Test Connection; không có `repository.py` riêng, dùng thẳng `OwnedRepository(Environment)`).
- `app/modules/execution/`: thêm `state_machine.py` (luật đổi trạng thái), `control.py` (lệnh tới runner), `events.py` (sự kiện SSE), `runner.py` (chạy nền bằng `asyncio`), `support.py` (phần dùng chung giữa `SimulatedRunner` và `Orchestrator`). Chạy **giả lập** (`SimulatedRunner`) hoặc **Playwright thật** (`Orchestrator`) theo `AGENT_MODE`, chọn 1 lần lúc khởi động server.
- `app/agents/`: Planner Agent (`planner_agent.py`), lớp gọi OpenAI (`llm/`), `orchestrator.py` (M4, điều phối 1 lần chạy), `browser_executor_agent.py` (thực hiện lệnh Playwright), `evaluator_agent.py` (so kết quả với `expected`), `user_simulator_agent.py` (chọn giá trị điền form), bản giả lập (`fakes.py`: `FakePlanner`, `SimulatedRunner`).
- `app/workers/browser_pool.py`: mở/đóng 1 trình duyệt Chromium cho mỗi run (M4); từ M8 chặn SSRF cả khi trang redirect (`page.route` gọi `core/url_guard.validate_target_url`).
- `app/core/crud_service.py`, `app/core/url_guard.py` (M8): `CrudService` dùng chung cho module CRUD đơn giản (M9 trở đi kế thừa thay vì viết lại 5 hàm), `validate_target_url` chống SSRF (chỉ http/https, chặn IP private/loopback/link-local/metadata; tắt bằng `ALLOW_PRIVATE_TARGETS=true` khi target là máy local).

Luồng chính: `Frontend → Router → Service → Repository → PostgreSQL`
