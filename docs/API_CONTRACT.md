# Frontend ↔ Backend API Contract

Base URL: VITE_API_BASE_URL in frontend/.env. Default: http://localhost:8081.
All JSON errors use `{ "detail": "Human-readable error message", "code": "MACHINE_CODE" }`. `detail` is always a string (validation errors add an `errors` list).

## Đăng nhập (M7)
Module: `backend/app/modules/auth/`. **Mọi endpoint bên dưới, trừ `/health` và `/auth/*`, cần đăng nhập.**
Phiên nằm trong cookie `session` (HttpOnly, SameSite=Lax, 7 ngày): frontend gửi mọi request với `credentials: 'include'`, SSE dùng `new EventSource(url, { withCredentials: true })`. Thiếu / hết hạn / đã đăng xuất → `401 NOT_AUTHENTICATED`. Dữ liệu (phiên chat, plan, run, evidence, feedback) gắn với người đăng nhập; người khác gọi tới → `404`.

- `POST /auth/register` body `{ "display_name", "email", "password" (8–128 ký tự), "confirm_password"? }` → `201 { "data": User }` + đặt cookie (đăng nhập luôn). Tên đăng nhập = email (viết thường). Email đã có → `409 EMAIL_TAKEN`; sai định dạng / mật khẩu ngắn / xác nhận không khớp → `422`.
- `POST /auth/login` body `{ "login": "<username hoặc email>", "password" }` → `{ "data": User }` + đặt cookie. Sai → `401 INVALID_CREDENTIALS` "Invalid username or password" (cùng thông báo cho tài khoản không tồn tại).
- `POST /auth/logout` → `204`, thu hồi phiên và xoá cookie. Token cũ không dùng lại được.
- `GET /auth/me` → `{ "data": User }` hoặc `401` — frontend gọi khi mở trang để giữ đăng nhập qua reload.

`User`: `{ "id": "USR-…", "username", "email", "display_name", "created_at" }`.
Tài khoản demo: `admin123` / `123`, id `USR-DEMO0001` (chủ của dữ liệu tạo trước M7). Migration tạo tài khoản **chưa có mật khẩu**; chạy `python -m scripts.create_admin` để đặt.

## Health
`GET /health`

```json
{ "status": "ok", "service": "ai-agent-tester-api", "database": "ok" }
```
Returns `503` with `"status": "error", "database": "error"` when PostgreSQL is unreachable.

## Generate plan (M2 — lưu PostgreSQL, OpenAI gpt-4o-mini)
`POST /tasks/generate-plan` — mỗi lần gửi tin nhắn chat hoặc bấm "Run Again". Module: `backend/app/modules/test_planning/`.

Request:
```json
{ "prompt": "Test the password reset feature on test.com", "conversation_id": "CNV-1A2B3C4D" }
```
- `conversation_id` bỏ trống → tạo phiên chat mới (`Session #N`). Có → tiếp tục phiên đó: LLM nhận lịch sử chat + plan hiện tại, trả **phiên bản mới** (`version + 1`).
- `llm_provider`, `llm_model` gửi kèm (nếu có) bị bỏ qua: server dùng cấu hình `OPENAI_MODEL`.

Response `200`:
```json
{ "data": {
  "plan_id": "PLN-EA1EF96D", "task_id": "PLN-EA1EF96D", "conversation_id": "CNV-1A2B3C4D",
  "version": 1, "status": "draft",
  "objective": "Verify password reset", "target_url": "https://test.com",
  "preconditions": ["..."], "test_data": { "email": "user@example.test" },
  "steps": [{ "id": 1, "step_no": 1, "action": "Open URL", "selector": "https://test.com/login", "expected": "Login page is displayed", "source": "original" }],
  "llm_provider": "openai", "llm_model": "gpt-4o-mini-2024-07-18", "created_at": "...",
  "conversation": { "id": "CNV-…", "seq_no": 1, "title": "Password reset", "last_message_at": "...", "created_at": "...", "archived": false,
                    "latest_plan_id": "PLN-…", "latest_plan_status": "draft", "latest_plan_steps": 6, "target_url": "https://test.com" },
  "messages": [
    { "id": "MSG-…", "seq": 1, "role": "user", "agent": null, "kind": "text", "content": "Test the password reset…", "plan_id": null, "run_id": null, "created_at": "..." },
    { "id": "MSG-…", "seq": 2, "role": "assistant", "agent": "planner", "kind": "plan_created", "content": "I planned 6 steps…", "plan_id": "PLN-…", "run_id": null, "created_at": "..." }
  ]
} }
```
- `task_id` = `plan_id`: gửi lại trong `POST /tasks/run`.
- `steps[].source`: `original` (LLM sinh), `chat_edit` (LLM đổi theo tin nhắn), `manual` (user sửa trực tiếp).

Lỗi: `404 CONVERSATION_NOT_FOUND`, `502 PLANNER_FAILED` (OpenAI lỗi/timeout — không lưu gì), `503 LLM_NOT_CONFIGURED` (thiếu `OPENAI_API_KEY`).

## Plans
- `GET /plans/{plan_id}` → `{ "data": Plan }` (cùng dạng các trường plan ở trên).
- `PUT /plans/{plan_id}/steps` — lưu sau Edit Directly / + Add Step / xoá bước. Body `{ "steps": [{ "action", "selector", "expected" }] }` (1–50 bước, đánh số lại 1..n). Bước đổi nội dung → `source: "manual"`. Plan đã chạy → `409 PLAN_LOCKED`.

## Conversations (Session History)
- `GET /conversations?q=&limit=50` → `{ "data": Conversation[] }`, mới nhất trước, bỏ phiên đã lưu trữ. `q` tìm theo tên phiên, nội dung tin nhắn của user, URL của plan.
- `GET /conversations/{id}` → `{ "data": { "conversation", "messages": Message[] (theo seq), "latest_plan": Plan | null } }` — mở lại một phiên.
- `PATCH /conversations/{id}` body `{ "title"?: string, "archived"?: bool }` → `{ "data": Conversation }`.

## Execution (M3 — lưu PostgreSQL, chạy giả lập)
Module: `backend/app/modules/execution/`. `task_id` = id của run (`RUN-…`), lưu ở bảng `test_runs`.
`AGENT_MODE=real` (mặc định) chạy `Orchestrator` — Playwright thật, cần `python -m playwright install chromium`. `AGENT_MODE=fake` chạy `SimulatedRunner` (M3a, mỗi bước ~2 giây rồi `passed`, không mở trình duyệt; dùng cho test và demo khi không có Chromium/mạng). API giống hệt nhau ở cả 2 chế độ.

### Start run
`POST /tasks/run` → `202`

```json
{ "task_id": "PLN-EA1EF96D", "tasks": [{ "prompt": "…", "max_steps": 30 }], "browser_config": { "headless": false } }
```
Chạy theo thứ tự ưu tiên:
1. `plan_id` hoặc `task_id = "PLN-…"`: khoá plan (`approved`) rồi **chép** các bước của plan vào run.
2. `steps: [{ action, selector, expected }]` (1–50 bước) kèm `name?`: dùng cho plan mẫu chưa lưu.
3. Không có cả hai → `422 PLAN_REQUIRED`. Plan không có / của người khác → `404 PLAN_NOT_FOUND`.

`tasks[0].max_steps / llm_provider / llm_model` và `browser_config.headless / keep_alive` được chép vào `test_runs.config`; các trường khác bị bỏ qua.

```json
{ "data": { "task_id": "RUN-FDC431BD", "run_id": "RUN-FDC431BD", "status": "queued", "message": "Task started. ID: RUN-FDC431BD" } }
```

### Run
`GET /tasks/{task_id}` → `{ "data": Run }`:
```json
{ "id": "RUN-…", "task_id": "RUN-…", "status": "waiting_human_input", "name": "Verify password reset",
  "runner": "simulated", "plan_id": "PLN-…", "rerun_of": null,
  "current_step": 2, "total_steps": 3,
  "human_prompt": "Step 2 needs a one-time code (OTP). Please enter it to continue.",
  "error_message": null, "created_at": "…", "started_at": "…", "finished_at": null,
  "steps": [{ "id": 1, "step_no": 1, "action": "Open URL", "selector": "…", "expected": "…",
              "status": "passed", "observation": "[Simulated] …", "started_at": "…", "duration_ms": 2003 }] }
```
- `status` của run: `queued` → `running` → `completed` / `failed` / `cancelled`, có thể qua `paused`, `waiting_human_input`, `waiting_human_approval`. Luật chuyển: `modules/execution/state_machine.py`.
- `steps[].status`: `pending`, `running`, `passed`, `failed`, `skipped` (Stop giữa chừng → các bước chưa xong thành `skipped`).
- `runner`: `"simulated"` (UI hiện nhãn **Simulated run**) hoặc `"playwright"` (trình duyệt thật).
- Không có / của người khác → `404 RUN_NOT_FOUND`.

### Realtime (SSE)
`GET /tasks/stream/{task_id}` → `text/event-stream`. Mọi sự kiện đều là `data: <json>` (không có dòng `event:`):
```text
data: {"type":"snapshot", ...Run}
data: {"task_id":"RUN-…","type":"status","status":"running"}
data: {"task_id":"RUN-…","type":"step","step_no":1,"status":"running","current_step":1}
data: {"task_id":"RUN-…","type":"step","step_no":1,"status":"passed","observation":"[Simulated] …","duration_ms":2003}
data: {"task_id":"RUN-…","type":"status","status":"waiting_human_input","human_prompt":"…"}
data: {"task_id":"RUN-…","type":"status","status":"completed"}
```
- Luôn gửi `snapshot` trước, nên nối lại (EventSource tự reconnect) là có ngay trạng thái đầy đủ.
- Stream tự đóng sau sự kiện `status` kết thúc (`completed` / `failed` / `cancelled`). Run đã kết thúc → chỉ gửi `snapshot`.
- Không có sự kiện nào trong 15 giây → gửi dòng comment `: ping` để giữ kết nối.

### Controls
`POST /tasks/{task_id}/pause`, `/resume`, `/cancel` → `{ "data": Run }`.
- Pause có hiệu lực **giữa hai bước**: bước đang chạy được chạy xong.
- Sai trạng thái → `409 INVALID_TRANSITION`, ví dụ pause run đã `completed`, hoặc resume khi đang chờ OTP (phải trả lời, không phải resume).

### Human input
`POST /tasks/{task_id}/human-input` → `{ "data": Run }`
```json
{ "action": "provide_input", "input_text": "123456" }
```
- Chỉ khi run đang `waiting_human_input`, nếu không → `409 NOT_WAITING_FOR_INPUT`. `input_text` rỗng → `422 INPUT_REQUIRED`.
- `waiting_human_approval`: gửi `action: "approve"` (chạy tiếp) hoặc `"reject"` (huỷ run).
- Câu trả lời chỉ đi qua bộ nhớ tới runner. DB (`run_interventions.answer`) lưu bản **đã che** nếu câu hỏi là bí mật (OTP, password, code…): `123456` → `••••56`.
- M3a: bước có chữ "OTP", "verification code", "2FA" hoặc "captcha" sẽ dừng lại hỏi.

### Re-run
`POST /test-runs/{run_id}/rerun` → `202`, cùng dạng với Start run. Chạy lại **đúng các bước của run cũ** (không lấy plan mới nhất), run mới có `rerun_of = run_id`.

### Tin nhắn trong phiên chat
Run bắt đầu từ plan sẽ ghi vào phiên chat của plan đó: `kind: "run_started"` khi bắt đầu, `kind: "run_status"` khi kết thúc, đều có `run_id`.

### Khởi động lại server
M3a chạy run trong bộ nhớ của tiến trình API. Server tắt giữa chừng thì lần khởi động sau, các run chưa xong bị đánh dấu `failed` với `error_message: "Server restarted while the run was in progress"`.

## Test Runs (M5 — lịch sử chạy, chỉ đọc)
Module: `backend/app/modules/test_runs/`. Đọc bảng của M3 (`test_runs`, `test_run_steps`, `run_interventions`), chỉ thấy run của mình.

### Danh sách
`GET /test-runs?q=&status=&suite=&env=&browser=&date_range=&page=1&page_size=8` → `{ "data": RunPage }`
```json
{ "data": { "items": [ { "run_id": "RUN-…", "task_id": "RUN-…", "name": "Verify password reset", "suite": "E2E Test Suite",
  "env": "Default", "browser": "Chromium", "status": "failed", "duration": "3.1s", "created_at": "…",
  "passed_steps": 2, "failed_steps": 1 } ], "total": 10, "page": 1, "page_size": 8 } }
```
- Mọi bộ lọc kết hợp bằng **AND**; bỏ trống = không lọc. Mới nhất trước.
- `q`: tìm trong Run ID hoặc tên (không phân biệt hoa thường).
- `env`: tên môi trường chép lúc chạy; run chưa gắn môi trường (trước M8) có `env = "Default"`.
- `date_range`: `24h` | `7d` | `30d` (theo `created_at`). Giá trị khác → 422.
- `duration`: `"3.1s"`, `"2m 05s"`; run đang chạy tính tới hiện tại; chưa bắt đầu → `"0.0s"`.
- `page` ≥ 1, `page_size` 1–100. Trang vượt quá → `items: []`, `total` vẫn đúng.

### Giá trị cho bộ lọc
`GET /test-runs/filters` → `{ "data": { "statuses": [...], "suites": [...], "envs": [...], "browsers": [...] } }` — chỉ các giá trị có thật trong run của mình.

### Chi tiết (RunDetailModal)
`GET /test-runs/{run_id}` → `{ "data": RunDetail }`: các trường của 1 dòng danh sách, cộng `runner`, `plan_id`, `rerun_of`, `error_message`, `started_at`, `finished_at`,
`steps[]` (`id`, `step_no`, `action`, `selector`, `expected`, `status`, `observation`, `started_at`, `duration_ms`) và
`interventions[]` (`step_no`, `kind`, `question`, `answer` đã che, `decision`, `asked_at`, `answered_at`). Không có / của người khác → `404 RUN_NOT_FOUND`.

### Alias cũ
`GET /tasks/history/runs?limit=50` → `{ "data": RunHistoryItem[] }` (không phân trang). Giữ cho tương thích; frontend mới dùng `/test-runs`.

## Evidence (M6 — bằng chứng từng bước)
Module: `backend/app/modules/evidence/`. Bảng `evidence_artifacts`; file ảnh nằm ngoài DB (`ARTIFACTS_DIR`, mặc định `backend/data/artifacts/`).

### Bằng chứng của 1 bước
`GET /evidence/{run_id}/steps/{step_no}` → `{ "data": { "run_id", "step_no", "items": [ { "id", "kind", "payload", "file_url", "created_at" } ] } }`

| `kind` | Tab | `payload` | `file_url` |
|---|---|---|---|
| `network` | API Validation | `{ "requests": [{ "method", "url", "status_code", "resource_type", "response_ms" }], "api_check"?: { "method", "url", "status_code", "response_ms", "response_body", "expected" } }` — `api_check` chỉ có ở bước "Verify API Response", body tối đa 4000 ký tự | — |
| `screenshot` | Screenshot | `{ "highlight_selector", "page_url" }` | ảnh PNG sau khi bước chạy xong |
| `agent_log` | Agent Log | `{ "lines": [{ "t_ms", "level": "INFO\|TRACE\|ACTION\|SUCCESS\|ERROR", "agent", "message" }] }` | — |
| `console` | Console | `{ "lines": [{ "level", "text" }] }` | — |
| `visual_diff` | Visual Diff | `{ "baseline_run_id", "baseline_artifact_id", "diff_percent", "size_changed" }` — **chỉ có khi run là Re-run**, so với ảnh cùng bước của run gốc | ảnh diff (pixel khác tô đỏ) |

- Mật khẩu, token, OTP, `Authorization: Bearer …` trong mọi `payload` bị che thành `••••` **trước khi lưu**. Giá trị điền vào ô mật khẩu/OTP cũng bị che trong `observation`.
- `AGENT_MODE=fake` (SimulatedRunner) chỉ có `agent_log` — không có trình duyệt nên không có ảnh, network, console.
- Bước chưa có bằng chứng → `items: []`. Run không có / của người khác → `404 RUN_NOT_FOUND`.

### File ảnh
`GET /evidence/files/{artifact_id}` → file (`image/png`). Của người khác / không có / mất file → `404 EVIDENCE_NOT_FOUND`.

## Feedback
`POST /feedback` — lưu vào bảng `feedback` (PostgreSQL). Module: `backend/app/modules/feedback/`.

Request:
```json
{ "rating": 5, "category": "Product experience", "message": "Useful", "username": "admin123" }
```
- `rating`: số nguyên 1–5.
- `category`: một trong `Product experience`, `Bug report`, `Feature request`, `Other`.
- `message`: 1–500 ký tự sau khi bỏ khoảng trắng hai đầu.
- `username`: bị bỏ qua; người gửi lấy từ phiên đăng nhập (M7), lưu ở `feedback.user_id`.

Response `201 Created`:
```json
{ "status": "received", "data": { "id": "FBK-360C467B", "rating": 5, "category": "Product experience", "message": "Useful", "created_at": "2026-09-30T10:33:06.400822Z" } }
```

Lỗi `422` (dữ liệu sai). `detail` luôn là **chuỗi** để frontend hiện thẳng lên form:
```json
{ "detail": "message: String should have at least 1 character", "code": "VALIDATION_ERROR", "errors": [{ "field": "message", "message": "String should have at least 1 character" }] }
```

## Environments (M8 — CRUD + Test Connection, chống SSRF)
Module: `backend/app/modules/environments/`. Mọi endpoint yêu cầu đăng nhập, chỉ thấy environment của chính mình.

### Danh sách / tạo
`GET /environments` → `{ "data": [EnvironmentOut, ...] }`, sắp theo `name`.
`POST /environments` → `201`, body:
```json
{ "name": "Staging", "base_url": "https://test.com", "browser": "chromium", "headless": true,
  "viewport_width": 1920, "viewport_height": 1080, "llm_provider": "openai", "llm_model": "gpt-4o-mini" }
```
- `browser`: `chromium` | `firefox` | `webkit` | `headless_node`.
- `llm_provider`: `google` | `openai` | `anthropic` | `openrouter` | `deepseek` | `azure` | `hub1` (dự án chỉ thật sự chạy được `openai`, mặc định).
- `base_url` bị chặn (422 `TARGET_BLOCKED`) nếu không phải `http`/`https` hoặc phân giải ra IP nội bộ/loopback/link-local/metadata (`core/url_guard.py`).
- Trùng tên trong cùng user → `409 ENVIRONMENT_NAME_TAKEN`.

`EnvironmentOut`:
```json
{ "id": "ENV-9F3A21C4", "name": "Staging", "base_url": "https://test.com", "browser": "chromium",
  "headless": true, "viewport_width": 1920, "viewport_height": 1080, "llm_provider": "openai", "llm_model": "gpt-4o-mini",
  "last_check_status": null, "last_checked_at": null, "created_at": "...", "updated_at": "..." }
```

### Đọc / sửa / xoá
`GET /environments/{id}`, `PUT /environments/{id}` (từng phần, chỉ trường gửi lên mới đổi; cùng luật chặn SSRF/trùng tên), `DELETE /environments/{id}` → `204`. Không phải của mình → `404`.

### Test Connection
`POST /environments/{id}/test-connection` → `{ "data": { "status": "connected" | "error", "detail": "HTTP 200" } }`. Gửi `GET` tới `base_url` (không tự theo redirect, timeout 5s), ghi lại `last_check_status`/`last_checked_at`.

### Ảnh hưởng tới run (M3)
`POST /tasks/run` nhận thêm `environment_id`. Run chép `environment_name` và `browser` (bản chụp) lúc tạo; xoá/sửa environment sau đó không đổi lịch sử run cũ. Playwright (M4) cũng chặn điều hướng/redirect sang IP nội bộ bằng cùng `url_guard`.

## Settings (M9 — hồ sơ, mật khẩu, API key mã hoá, tuỳ chọn)
Module: `backend/app/modules/user_settings/`. Mọi endpoint yêu cầu đăng nhập, luôn thao tác trên chính user đang gọi (không có `{id}` của người khác).

### Hồ sơ
`GET /settings/profile` → `{ "data": { "id", "username", "email", "display_name", "created_at" } }`.
`PUT /settings/profile` — từng phần (`display_name?`, `email?`). Email trùng người khác → `409 EMAIL_TAKEN`.

### Đổi mật khẩu
`PUT /settings/password` — `{ "current_password", "new_password" (≥8 ký tự) }` → `204`. Sai mật khẩu hiện tại → `400 INVALID_PASSWORD`. Đổi xong: mọi phiên khác (thiết bị/trình duyệt khác) bị thu hồi, phiên đang dùng để đổi vẫn còn hiệu lực.

### API key LLM
`GET /settings/api-keys` → `{ "data": [{ "provider": "openai", "configured": true, "last4": "1234", "updated_at": "..." }, ...] }` — luôn trả đủ 7 provider (`google`/`openai`/`anthropic`/`openrouter`/`deepseek`/`azure`/`hub1`), **không bao giờ trả key gốc**.
`PUT /settings/api-keys/{provider}` — `{ "api_key": "sk-...", "config": {} }` → mã hoá (Fernet, khoá `SECRETS_KEY` trong `backend/.env`) trước khi lưu, upsert theo `(owner_id, provider)`.
`DELETE /settings/api-keys/{provider}` → `204` (idempotent, chưa có key thì cũng trả `204`).

Agents (M4: Planner) tự động dùng key `openai` của user nếu đã cấu hình, rơi về `OPENAI_API_KEY` trong `.env` nếu chưa — không có endpoint nào trả key đã giải mã.

### Tuỳ chọn cá nhân
`GET/PUT /settings/preferences` — `{ "theme": "light" | "dark", "notifications": {...} }`. Theme đổi ở nút trên header hoặc tab Appearance đều gọi endpoint này; mặc định `light`/`{}` khi user chưa lưu lần nào.

## Test Cases (M10 — kho test case)
Module: `backend/app/modules/test_cases/`. Mọi endpoint yêu cầu đăng nhập, chỉ thấy test case của chính mình.

### Danh sách / tạo thủ công
`GET /test-cases?q=&suite=&tag=` → `{ "data": [TestCaseOut, ...] }`, mới nhất trước. Lọc `q` theo tên (không phân biệt hoa thường), `suite` khớp đúng, `tag` khớp 1 phần tử trong mảng `tags`.
`POST /test-cases` — tạo thủ công: `{ "name", "suite"?, "tags"?: string[], "steps": [{ "action", "selector", "expected" }, ...] }`.

`TestCaseOut`:
```json
{ "id": "TC-9F3A21C4", "source_plan_id": "PLN-...", "name": "Login smoke", "suite": "Authentication",
  "tags": ["login", "smoke"], "steps": [{ "action": "...", "selector": "...", "expected": "..." }],
  "created_at": "...", "updated_at": "..." }
```

### Đọc / sửa / xoá
`GET /test-cases/{id}`, `PUT /test-cases/{id}` (từng phần), `DELETE /test-cases/{id}` → `204`. Không phải của mình → `404`.

### Save as Test Case
`POST /test-cases/from-plan/{plan_id}` — `{ "name"?, "suite"?, "tags"? }`. Chép **bản chụp** `steps` của plan hiện tại (phiên bản mới nhất) vào test case; không gửi `name` thì lấy `objective` của plan. Plan không phải của mình → `404`. Sửa/xoá plan gốc sau đó **không** ảnh hưởng test case đã lưu.

### Chạy test case
`POST /test-cases/{id}/run` — `{ "environment_id"? }` → `202`, cùng `RunStarted` như `POST /tasks/run`. Run tạo ra có `test_case_id` (xem `GET /tasks/{id}` / `GET /test-runs/{id}`), không có `plan_id`.

## Reports (M11 — xuất báo cáo Markdown/PDF từ 1 run)
Module: `backend/app/modules/reports/`. Mọi endpoint (trừ link chia sẻ) yêu cầu đăng nhập, chỉ thấy báo cáo của chính mình.

### Tạo / danh sách
`POST /reports` — `{ "run_id", "format": "markdown" | "pdf", "name"? }` → `201`, `ReportDetailOut` (xem dưới). Run chưa xong (không ở trạng thái `completed`/`failed`/`cancelled`) → `409 RUN_NOT_FINISHED`. Run không phải của mình → `404`.
`GET /reports?q=&format=&suite=&date_range=` → `{ "data": [ReportOut, ...] }`, mới nhất trước. `suite` lọc theo suite của run liên kết (JOIN `test_runs`), `date_range` là `24h`/`7d`/`30d` tính theo lúc tạo báo cáo.

`ReportOut`: `{ "id": "RPT-...", "run_id", "name", "format", "shared": bool, "created_at" }`.

### Chi tiết / tải về
`GET /reports/{id}` → `ReportDetailOut` = `ReportOut` + `{ "result": "Passed"|"Failed"|"Cancelled", "duration": "3.1s", "failed_step": "Step 4 / 6" | "—" }` — 3 trường này **tính từ run liên kết**, không lưu lại ở bảng `reports`.
`GET /reports/{id}/download` → file (`text/markdown` hoặc `application/pdf`, `Content-Disposition: attachment`).
`DELETE /reports/{id}` → `204`, xoá luôn file đã xuất.

### Chia sẻ
`POST /reports/{id}/share` → `{ "share_token", "share_path": "/shared/reports/{token}" }` (sinh token nếu chưa có, giữ nguyên nếu đã chia sẻ).
`DELETE /reports/{id}/share` → `204`, huỷ chia sẻ.
`GET /shared/reports/{token}` — **không cần đăng nhập**, trả thẳng file như `/download`. Token sai hoặc đã unshare → `404`.

## Comparisons (M12 — so 2 lần chạy)
Module: `backend/app/modules/comparisons/`. Xem diff **không ghi DB**; chỉ `POST /comparisons` (Save) mới tạo bản ghi.

### Xem diff (không lưu)
`GET /comparisons/diff?run_a={id}&run_b={id}` → `ComparisonResult`:
```json
{ "run_a": { "id", "name", "status", "duration" }, "run_b": { "...": "..." },
  "result": "Passed -> Failed", "time_difference": "+3.2s", "changed_steps": "2 / 8",
  "visual_difference": "1 region(s)" | "No visual difference" | "No visual diff data (B is not a Re-run of A)",
  "steps": [{ "step_no", "action", "a_status", "b_status", "a_observation", "b_observation", "changed": bool }],
  "api_diff": [{ "step_no", "changed": bool, "a": { "status_code", "response_body" } | null, "b": "..." }] }
```
- `run_a == run_b` → `422 SAME_RUN`. Run không phải của mình → `404`.
- So khớp theo `step_no`; bước chỉ có ở 1 bên cũng tính là `changed`.
- `api_diff` chỉ gồm bước có bằng chứng `network.api_check` (bước "Verify API Response") ở ít nhất 1 run.
- `visual_difference` chỉ tính được khi B thực sự là Re-run của A (đúng cơ chế Visual Diff của M6); với cặp run bất kỳ thì trả "No visual diff data".

### Lưu / xem / xoá / chia sẻ
`GET /comparisons` → `{ "data": [ComparisonOut, ...] }`. `POST /comparisons` — `{ "run_a_id", "run_b_id", "name"? }` → `201`; trùng cặp (cùng user) → `409 COMPARISON_EXISTS`; `run_a_id == run_b_id` → `422`.
`GET /comparisons/{id}` → `ComparisonOut` + `{ "result": ComparisonResult }` (diff tính lại ngay lúc gọi, không đọc từ cache).
`DELETE /comparisons/{id}` → `204`.
`POST /comparisons/{id}/share` / `DELETE /comparisons/{id}/share` — giống Reports.
`GET /shared/comparisons/{token}` — không cần đăng nhập, trả `ComparisonResult`.

## Not API yet
Settings tabs Team & Members / Notifications / Integrations currently use frontend local state (placeholder, chưa có bảng — xem mục 10.6 của `BACKEND_STRUCTURE_PLAN.md`).
