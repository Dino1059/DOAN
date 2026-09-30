# Authentication Plan — Version 1

## 1. Mục tiêu

Triển khai nghiệp vụ Authentication cho AI Agent Tester ở cả backend và frontend, thay thế login hard-code hiện tại bằng flow có persistence, session, validation và bảo vệ API.

Phạm vi của plan này chỉ tập trung vào Authentication. Chưa triển khai billing, subscription, alerting, report hoặc team management.

## 2. Bối cảnh hiện tại

### Frontend

Authentication hiện tại nằm trong `frontend/src/main.tsx`:

- Username/password được kiểm tra local.
- Credentials đang hard-code: `admin123 / 123`.
- Sign up submit trực tiếp gọi `onLoginSuccess`, không gọi API.
- `currentUser` chỉ nằm trong React state.
- Logout chỉ xoá React state.
- Không có token, session restore hoặc protected route.
- Dashboard được render khi `currentUser` khác `null`.

### Backend

Backend hiện là FastAPI modular monolith tại `backend/app`:

- Có `api/routes`, `schemas`, `services`, `repositories`.
- Chưa có auth route, user model hoặc session model.
- Task repository hiện là in-memory.
- Database URL đã có trong config nhưng chưa có database layer thực sự.
- CORS đã bật cho frontend local tại `http://localhost:5173`.

### Quyết định identity

Authentication nên dùng email làm identity chính và cho phép nhập username hoặc email ở ô login để giữ tương thích UX hiện tại.

```text
Login input: identifier
identifier có thể là email hoặc username
email là trường bắt buộc và unique
username là alias tùy chọn, cũng unique nếu có
```

Credentials demo `admin123 / 123` chỉ được giữ trong môi trường development/test, không dùng làm cơ chế xác thực production.

## 3. Scope nghiệp vụ

### In scope — MVP

1. Register account.
2. Login bằng email hoặc username.
3. Lấy current user/session.
4. Logout và revoke session.
5. Hash password an toàn.
6. Validate request và chuẩn hoá email.
7. Bảo vệ task API và feedback API bằng authenticated user.
8. Restore session khi refresh trang.
9. Loading, error và validation state trên frontend.
10. Test backend và frontend cho các flow chính.

### Chưa làm trong MVP

- Email verification.
- Forgot password / reset password.
- OAuth/Google/GitHub login.
- MFA/2FA.
- Organization/team/role nâng cao.
- Billing/subscription.
- Audit log tổng quát của toàn hệ thống.

Các tính năng này sẽ dùng lại user/session model nhưng không được tự động thêm vào module đầu tiên.

## 4. Business flow

### AUTH-FLOW-01 — Register

```text
User mở AuthModal
→ chọn Create Account
→ nhập full name, email, password, username nếu có
→ frontend validate
→ POST /auth/register
→ backend normalize email + hash password + tạo user
→ tạo session
→ set HttpOnly cookie
→ trả về user public profile
→ frontend cập nhật Auth state
→ dashboard hiển thị
```

### AUTH-FLOW-02 — Login

```text
User nhập email hoặc username + password
→ frontend validate
→ POST /auth/login
→ backend tìm user theo identifier
→ verify password hash
→ tạo/revoke session theo policy
→ set HttpOnly cookie
→ trả về user public profile
→ frontend cập nhật Auth state
→ dashboard hiển thị
```

### AUTH-FLOW-03 — Restore session

```text
App khởi động
→ AuthProvider gọi GET /auth/me
→ backend đọc session cookie
→ session hợp lệ: trả user
→ session không hợp lệ: trả 401
→ frontend hiển thị landing/login
```

### AUTH-FLOW-04 — Logout

```text
User chọn Log Out
→ POST /auth/logout
→ backend revoke session + clear cookie
→ frontend clear user state
→ quay về landing page
```

### AUTH-FLOW-05 — Protected API

```text
Frontend gọi task/feedback API
→ browser tự gửi HttpOnly session cookie
→ backend resolve_current_user
→ authenticated: tiếp tục service
→ unauthenticated: 401 AUTH_REQUIRED
```

## 5. API contract đề xuất

Base path:

```text
/auth
```

API hiện tại chưa versioned. Với version 1, giữ `/auth` để phù hợp cấu trúc backend hiện tại; việc đổi sang `/api/v1/auth` chỉ thực hiện khi có kế hoạch versioning toàn bộ API.

### POST `/auth/register`

Purpose: tạo tài khoản mới và đăng nhập ngay sau khi đăng ký.

Request:

```json
{
  "email": "user@example.com",
  "username": "user123",
  "full_name": "Alex Morgan",
  "password": "StrongPassword123!"
}
```

Rules:

- `email` bắt buộc, trim và lowercase.
- `username` optional, nếu có phải unique.
- `full_name` bắt buộc.
- Password tối thiểu 8 ký tự trong MVP.
- Không trả password hoặc password hash.

Response `201`:

```json
{
  "data": {
    "user": {
      "id": "usr_...",
      "email": "user@example.com",
      "username": "user123",
      "full_name": "Alex Morgan"
    }
  }
}
```

Session được tạo qua HttpOnly cookie, không trả session secret trong JSON.

### POST `/auth/login`

Request:

```json
{
  "identifier": "user@example.com",
  "password": "StrongPassword123!"
}
```

`identifier` có thể là email hoặc username.

Response `200`:

```json
{
  "data": {
    "user": {
      "id": "usr_...",
      "email": "user@example.com",
      "username": "user123",
      "full_name": "Alex Morgan"
    }
  }
}
```

Cookie đề xuất:

```text
Name: ai_agent_session
HttpOnly: true
Secure: true trong production
SameSite: Lax trong production cùng site
SameSite: None + Secure nếu deployment khác site
```

### GET `/auth/me`

Purpose: restore session khi frontend khởi động.

Response `200`:

```json
{
  "data": {
    "user": {
      "id": "usr_...",
      "email": "user@example.com",
      "username": "user123",
      "full_name": "Alex Morgan"
    }
  }
}
```

Không có session hợp lệ: `401`.

### POST `/auth/logout`

Purpose: revoke current session và clear cookie.

Response: `204 No Content` hoặc:

```json
{
  "status": "logged_out"
}
```

Logout nên idempotent: session đã hết hạn hoặc không tồn tại vẫn trả kết quả thành công.

## 6. Error contract

Giữ format `detail` đang dùng trong backend, nhưng bổ sung `code` để frontend không phải parse message text.

```json
{
  "detail": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid credentials",
    "fields": []
  }
}
```

Các code tối thiểu:

| HTTP | Code | Ý nghĩa |
|---:|---|---|
| 400 | `AUTH_INVALID_REQUEST` | Request không hợp lệ |
| 401 | `AUTH_INVALID_CREDENTIALS` | Sai identifier/password |
| 401 | `AUTH_REQUIRED` | API cần đăng nhập |
| 409 | `AUTH_EMAIL_EXISTS` | Email đã tồn tại |
| 409 | `AUTH_USERNAME_EXISTS` | Username đã tồn tại |
| 422 | `VALIDATION_ERROR` | Pydantic/domain validation lỗi |
| 429 | `AUTH_RATE_LIMITED` | Quá nhiều login attempt |

Không trả về thông tin cho biết email có tồn tại trong các flow nhạy cảm nếu sau này thêm password reset.

## 7. Database design

### `users`

| Column | Type | Rule |
|---|---|---|
| `id` | UUID/string | Primary key |
| `email` | varchar | Required, lowercase, unique |
| `username` | varchar | Nullable, unique nếu có |
| `full_name` | varchar | Required |
| `password_hash` | varchar | Required, không expose |
| `status` | varchar | `active`, `disabled` |
| `created_at` | timestamp | Required |
| `updated_at` | timestamp | Required |
| `last_login_at` | timestamp | Nullable |

Indexes:

- Unique index trên normalized `email`.
- Unique index trên `username` nếu database hỗ trợ partial unique index hoặc xử lý nullable phù hợp.
- Index trên `status` nếu cần quản trị.

### `sessions`

| Column | Type | Rule |
|---|---|---|
| `id` | UUID/string | Primary key |
| `user_id` | UUID/string | Foreign key → `users.id` |
| `token_hash` | varchar | Required, unique |
| `created_at` | timestamp | Required |
| `expires_at` | timestamp | Required, indexed |
| `revoked_at` | timestamp | Nullable |
| `last_seen_at` | timestamp | Nullable |
| `ip_address` | varchar | Nullable |
| `user_agent` | text | Nullable |

Backend chỉ lưu hash của session token, không lưu raw token.

### Optional — `auth_events`

Chưa bắt buộc cho bước đầu. Có thể thêm sau để theo dõi security event:

```text
login_success
login_failed
logout
register
session_revoked
```

`auth_events` khác với Test Evidence. Nó phục vụ security/audit, không mô tả kết quả test.

## 8. Authentication security design

### Password

- Hash bằng Argon2id hoặc thư viện password hashing đã được kiểm chứng.
- Không lưu plaintext password.
- Không log password.
- Không trả password hash trong response.

### Session

Khuyến nghị MVP dùng opaque server-side session cookie thay vì lưu JWT trong `localStorage`:

- Dễ revoke khi logout.
- Không expose credential cho JavaScript.
- Phù hợp với flow dashboard hiện tại.
- Frontend chỉ cần `credentials: 'include'`.

### CORS

Backend cần:

- `allow_credentials=True`.
- Allow origin cụ thể từ config, không dùng `*` khi có cookie.
- Production dùng domain frontend thật.

### Rate limit

MVP có thể bắt đầu bằng logging và giới hạn đơn giản. Sau đó bổ sung rate limit cho login theo IP và identifier.

### Demo account

Demo account chỉ được seed trong development/test bằng environment variable hoặc seed command. Không hard-code password trong React production build.

## 9. Backend file structure theo nghiệp vụ

### Nguyên tắc bắt buộc

Không tạo file theo một template cố định. Mỗi file chỉ được tạo khi có một trách nhiệm thực sự tồn tại và có lý do để tách riêng.

Trace một requirement phải đi được theo đường ngắn nhất:

```text
Requirement
→ endpoint cần thiết
→ business logic cần thiết
→ persistence cần thiết
→ test tương ứng
```

Không tạo trước các file như `models.py`, `exceptions.py`, `security.py` hoặc `dependencies.py` chỉ vì một kiến trúc mẫu thường có chúng. Nếu trách nhiệm của file chỉ có một hàm nhỏ và chưa tạo ra coupling, giữ trong module phù hợp trước; chỉ tách khi file bắt đầu có trách nhiệm độc lập hoặc cần được tái sử dụng.

### File tối thiểu dự kiến cho Authentication MVP

Đây là danh sách dự kiến tối thiểu, cần xác nhận lại trong lúc implement:

```text
backend/
├── app/
│   ├── main.py                         # đăng ký auth router
│   ├── core/
│   │   └── config.py                   # auth/database/cookie config nếu thực sự cần
│   ├── api/routes/
│   │   └── auth.py                     # endpoint HTTP auth
│   ├── schemas/
│   │   └── auth.py                     # request/response contract auth
│   ├── services/
│   │   └── auth_service.py             # register/login/me/logout
│   ├── repositories/
│   │   └── auth_repository.py           # user/session persistence
│   ├── security/
│   │   └── password.py                  # chỉ tạo nếu password logic đủ độc lập
│   └── tests/
│       └── test_auth.py                 # test theo behavior, không tách file tùy ý
├── migrations/
│   └── versions/
│       └── xxxx_create_auth_tables.py
└── requirements.txt
```

Các file sau **không mặc định được tạo**:

- `auth/models.py`: chỉ tạo nếu domain model khác persistence model.
- `auth/exceptions.py`: chỉ tạo nếu auth có nhiều domain exception cần dùng lại.
- `auth/dependencies.py`: chỉ tạo nếu auth dependency đủ lớn hoặc được dùng ở nhiều router.
- `db/base.py`, `db/session.py`: chỉ tạo theo database framework thực tế được chọn; không tạo placeholder.
- `logging.py`: chỉ tạo khi logging configuration thực sự tách khỏi `config.py`.
- Hai file test riêng biệt: chỉ tách khi unit/API test đã đủ lớn để cần phân chia.

Trong repository hiện tại, cấu trúc đang là `api/routes`, `schemas`, `services`, `repositories`. Vì vậy bước đầu sẽ bổ sung file Authentication vào các khu vực đang tồn tại, không tạo thêm `modules/auth/` nếu chưa có lợi ích thực tế. Việc chuyển sang module-first chỉ thực hiện khi số lượng nghiệp vụ đủ lớn để giảm trace cost.

### Trách nhiệm thực tế

| File | Chỉ được tạo khi cần trách nhiệm này | Trách nhiệm |
|---|---|---|
| `api/routes/auth.py` | Có HTTP auth endpoints | Nhận request, gọi service, set/clear cookie |
| `schemas/auth.py` | Có auth request/response contract | Validate và serialize dữ liệu auth |
| `services/auth_service.py` | Có register/login/session business logic | Điều phối nghiệp vụ, không tự query DB trực tiếp |
| `repositories/auth_repository.py` | Có persistence user/session | Query và lưu user/session |
| `security/password.py` | Password hash/verify cần tái sử dụng hoặc đủ phức tạp | Hash và verify password |
| `tests/test_auth.py` | Có behavior auth cần regression protection | Unit/API tests cho auth |
| migration auth | Có schema persistence thật | Tạo `users`/`sessions` tables |

Không để router tự query database hoặc hash password. Tuy nhiên cũng không tách thêm abstraction nếu trách nhiệm đó chưa tồn tại.

## 10. Frontend file structure theo nghiệp vụ

### Nguyên tắc bắt buộc

Frontend cũng không tạo đầy đủ `api`, `hooks`, `components`, `types`, `validation`, `provider` theo template nếu mỗi phần chưa có trách nhiệm độc lập.

Trước mắt chỉ cần tách những responsibility đã quan sát thấy trong code hiện tại:

1. Gọi auth API.
2. Quản lý auth/session state.
3. Hiển thị sign-in/sign-up UI.
4. Validate input auth.

### File tối thiểu dự kiến

```text
frontend/src/
├── features/auth/
│   ├── AuthModal.tsx       # nếu cần giữ layout modal tách khỏi main.tsx
│   ├── authApi.ts          # register/login/me/logout
│   ├── authTypes.ts        # User, request/response, AuthState
│   └── authValidation.ts   # chỉ tạo nếu validation đủ để dùng chung
├── main.tsx                # composition tạm thời, dashboard chưa refactor
└── index.css
```

`AuthProvider.tsx`, `useAuth.ts`, `SignInForm.tsx`, `SignUpForm.tsx`, `httpClient.ts`, `apiError.ts` chỉ được tạo khi logic tương ứng đủ lớn hoặc được dùng ở nhiều nơi.

Ví dụ:

- Nếu `AuthModal.tsx` vẫn dễ đọc sau khi thêm API, chưa cần tách `SignInForm.tsx`.
- Nếu chỉ có auth dùng `fetch`, chưa cần dựng `shared/api/httpClient.ts`; có thể bắt đầu bằng `authApi.ts` và tách client khi task/feedback cũng dùng chung behavior.
- Nếu chỉ có vài rule validation, giữ trong `authApi.ts` hoặc component; chỉ tạo `authValidation.ts` khi có rule dùng chung giữa register/login.
- Nếu chỉ có `App` dùng auth state, chưa cần tạo Provider/hook riêng.

### Trách nhiệm thực tế

| File | Khi nào tạo | Trách nhiệm |
|---|---|---|
| `features/auth/AuthModal.tsx` | Auth UI cần tách khỏi file 2.340 dòng | Layout/modal và chuyển mode |
| `features/auth/authApi.ts` | Có backend auth thật | Gọi register/login/me/logout |
| `features/auth/authTypes.ts` | Cần type dùng chung giữa API và UI | User/request/response/auth state |
| `features/auth/authValidation.ts` | Có validation dùng ở nhiều form | Rule email/password/username |
| `AuthProvider.tsx` | Auth state được dùng ở nhiều nhánh app | Session restore, user, loading/error |
| `useAuth.ts` | Có nhiều component cần truy cập auth state | Public access layer cho auth state |
| `httpClient.ts` | Nhiều domain dùng chung credentials/error parsing | HTTP behavior dùng chung |
| `auth.test.tsx` | Có auth UI behavior cần regression protection | Frontend auth tests |

## 10.1. Kế hoạch tách `main.tsx` theo responsibility

### Mục tiêu

Tách `main.tsx` từ file bootstrap + toàn bộ UI + toàn bộ state + API calls thành các phần có boundary rõ ràng, nhưng không thay đổi UI/UX hoặc nghiệp vụ hiện tại.

Sau khi hoàn thành, `main.tsx` chỉ nên chịu trách nhiệm khởi động React và render root component. Không đặt business logic, API call hoặc dashboard markup mới vào file này.

### Nguyên tắc tách

- Tách theo responsibility đang tồn tại, không tách theo số lượng dòng một cách máy móc.
- Một component chỉ được tách khi có một boundary rõ: một màn hình, một flow hoặc một reusable behavior.
- Không tạo `components/`, `hooks/`, `utils/` hàng loạt nếu chưa có logic tương ứng.
- Không tạo component chỉ để bọc một đoạn JSX ngắn không có behavior riêng.
- State phải nằm gần feature sử dụng nó nhất.
- API call không nằm trong presentational component.
- Không đưa business logic vào `shared`; chỉ đưa logic thật sự dùng chung.
- Sau mỗi bước phải build được và UI phải giữ nguyên behavior.

### Các responsibility hiện có trong `main.tsx`

| Responsibility hiện tại | Xử lý đề xuất |
|---|---|
| React bootstrap | Giữ lại trong `main.tsx` |
| Root app/auth switch | Tách thành `App.tsx` khi root state bắt đầu có session restore |
| Auth modal/sign-in/sign-up | Tách theo Authentication plan |
| Landing navbar/hero | Tách thành feature Landing |
| `FadingVideo` | Tách riêng nếu Landing/Auth cùng sử dụng và cần test độc lập |
| `BlurText` | Tách riêng nếu còn được sử dụng ngoài LandingHero |
| Dashboard navigation | Giữ trong Dashboard shell hoặc tách khi có responsive behavior riêng |
| Dashboard overview | Tách thành Dashboard Overview vì đã là màn hình độc lập |
| New Test flow | Tách thành New Test feature vì có prompt, plan và execution state |
| Task polling/SSE/control | Tách thành execution state/service vì là business behavior, không phải UI |
| Test Runs | Tách thành Test Runs feature vì có filter, pagination và detail modal |
| Environments | Tách khi bắt đầu có API persistence |
| Reports | Tách khi report có API hoặc business logic thật |
| Comparisons | Tách khi comparison có API/real calculation |
| Settings | Tách khi có persistence thật |
| Static demo data | Chỉ tách thành data file khi được nhiều component sử dụng hoặc cần test riêng |
| SVG icons | Chỉ gom thành icon file khi có reuse thực tế; không tạo icon library tổng quát trước |

### Trình tự tách an toàn

#### Bước MAIN-01 — Baseline

- Chạy `npm run build`.
- Ghi nhận các flow cần giữ nguyên: login demo, theme, New Test, run test, Test Runs.
- Không thay đổi API payload hoặc tên field trong bước này.
- Xác định vùng JSX/state bằng line range và responsibility.

#### Bước MAIN-02 — Tách root bootstrap

Tạo `src/App.tsx` chỉ khi root logic đã có responsibility rõ:

```text
src/main.tsx
  → import App
  → createRoot
  → render App

src/App.tsx
  → theme state
  → auth/session state
  → Landing hoặc Dashboard
```

Nếu chưa có session restore và `App` chỉ là vài dòng, có thể giữ root logic trong `main.tsx` tạm thời.

#### Bước MAIN-03 — Tách Landing

Chỉ tạo các file tương ứng với responsibility thực tế:

```text
src/features/landing/
├── LandingNavbar.tsx
├── LandingHero.tsx
└── FadingVideo.tsx       # chỉ nếu được dùng bởi nhiều feature hoặc cần test riêng
```

`BlurText` chưa bắt buộc thành file riêng nếu chỉ được dùng trong `LandingHero`.

#### Bước MAIN-04 — Tách Authentication

Thực hiện theo section Authentication:

```text
src/features/auth/
├── AuthModal.tsx
├── authApi.ts
└── authTypes.ts
```

Chỉ tách `SignInForm.tsx`, `SignUpForm.tsx`, `AuthProvider.tsx`, `useAuth.ts` khi logic thực tế đủ độc lập.

#### Bước MAIN-05 — Tách Dashboard shell và navigation

Tách phần layout dashboard khỏi nội dung module:

```text
src/features/dashboard/
├── DashboardWorkspace.tsx   # shell, navigation, active module
└── DashboardNavigation.tsx  # chỉ nếu navigation có logic/behavior riêng
```

`DashboardWorkspace.tsx` ban đầu vẫn có thể còn lớn. Không tách tiếp chỉ để làm file ngắn hơn nếu boundary nghiệp vụ chưa rõ.

#### Bước MAIN-06 — Tách New Test và execution behavior

New Test hiện có nhiều responsibility thật: prompt, plan editing, run control, polling, SSE và evidence. Tách theo business flow:

```text
src/features/test-execution/
├── NewTestWorkspace.tsx
├── TestPlanPanel.tsx
├── LiveExecutionPanel.tsx
├── EvidenceViewer.tsx
└── useTaskExecution.ts       # chỉ tạo khi polling/SSE/control được gom thành một behavior độc lập
```

Không tạo các file trên cùng lúc. Thứ tự thực tế:

1. Tách `TestPlanPanel` nếu plan editing đã có props/state boundary rõ.
2. Tách `EvidenceViewer` nếu evidence tabs không còn phụ thuộc trực tiếp vào toàn bộ dashboard state.
3. Tách `useTaskExecution` khi polling/SSE/pause/resume/cancel/human-input có thể kiểm thử độc lập.
4. Chỉ sau đó tách `NewTestWorkspace` nếu component vẫn còn quá lớn.

#### Bước MAIN-07 — Tách Test Runs

Khi run history đã có API client rõ ràng, tách:

```text
src/features/test-runs/
├── TestRunsPage.tsx
├── RunFilters.tsx             # chỉ nếu filter logic được dùng lại
├── RunDetails.tsx
└── runHistoryApi.ts           # chỉ nếu không dùng chung API client hiện hữu
```

Không tạo file `RunFilters.tsx` nếu filter vẫn chỉ được dùng một lần và còn dễ đọc trong page.

#### Bước MAIN-08 — Tách các module còn lại theo mức độ thật

- Environments: tách khi có backend CRUD.
- Reports: tách khi có report generation/download thật.
- Comparisons: tách khi có calculation/API thật.
- Settings: tách theo tab chỉ khi tab có persistence hoặc validation riêng.

Các module đang mock có thể giữ gần Dashboard shell cho đến khi nghiệp vụ backend được xác nhận.

### State ownership sau khi tách

| State | Nơi sở hữu đề xuất |
|---|---|
| Theme | Root/App vì Landing và Dashboard cùng dùng |
| Current user/session | Auth feature/root auth state |
| Active dashboard module | Dashboard shell |
| Prompt/test plan | New Test feature |
| Task ID/status/SSE/polling | Test execution behavior |
| Run filters/pagination | Test Runs feature |
| Environment form | Environments feature khi có persistence |
| Report filters | Reports feature khi có API |
| Evidence tab/selected step | Execution/Evidence feature |

### Quy tắc dependency

```text
main.tsx
  → App
    → features
      → feature api/state
        → shared code nếu thật sự dùng chung
```

Không cho phép:

- `shared` import ngược từ một feature cụ thể.
- Component UI tự gọi trực tiếp nhiều endpoint.
- Feature này import state nội bộ của feature khác.
- Dashboard shell biết chi tiết password/session implementation.

### Definition of Done cho việc tách `main.tsx`

- `main.tsx` chỉ còn bootstrap React hoặc rất ít root wiring.
- Không thay đổi visual/UI behavior.
- Không thay đổi request payload/response mapping ngoài phạm vi đã xác nhận.
- Mỗi file mới có responsibility được ghi rõ.
- Không có file placeholder hoặc file chỉ chứa một wrapper vô nghĩa.
- Build pass sau mỗi bước tách.
- Auth, New Test và Test Runs vẫn trace được từ feature → API/state → UI.
- Không có circular dependency.
- Có test cho phần logic được tách ra nếu logic đó có behavior riêng.

### Migration không phá UI

1. Giữ layout/AuthModal hiện tại.
2. Đo coupling và xác định boundary trước khi tạo file.
3. Chỉ tách `AuthModal`, sign-in/sign-up form hoặc auth state khi có responsibility độc lập.
4. Thêm `authApi` dùng API thật.
5. Chỉ tạo `AuthProvider`/`useAuth` nếu nhiều component cần auth state.
6. Thay `currentUser` local bằng auth state thực tế.
7. Chỉ sau khi auth ổn định mới tách các module dashboard khác.

## 11. Frontend API behavior

Nếu đã có `httpClient.ts`, hoặc sau này nhiều feature dùng chung HTTP behavior, file này cần:

- Dùng `VITE_API_BASE_URL`.
- Gửi `credentials: 'include'`.
- Set `Content-Type: application/json` khi có body.
- Kiểm tra `response.ok`.
- Parse error theo `detail.code`.
- Không log password hoặc session data.

Auth state đề xuất:

```ts
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  error: ApiError | null;
}
```

Khi app khởi động:

- `loading`: chưa render dashboard/landing cuối cùng.
- `GET /auth/me` thành công: `authenticated`.
- HTTP 401: `unauthenticated`.
- lỗi network: hiển thị lỗi có retry, không tự động coi là login thành công.

## 12. Backend implementation phases

### Phase AUTH-01 — Foundation

- Chốt contract.
- Thêm dependencies password hashing và database ORM/migration nếu chưa có.
- Tạo DB session/base.
- Tạo config cho cookie/session/password policy.
- Tạo migration `users` và `sessions`.

Output:

- Database khởi tạo được.
- Migration chạy được.
- Không thay đổi task business logic.

### Phase AUTH-02 — Domain/service

- Implement user repository.
- Implement session repository.
- Implement password hash/verify.
- Implement register/login/me/logout service.
- Chuẩn hoá email và identifier.
- Chỉ tách domain exceptions nếu có nhiều lỗi auth cần dùng lại hoặc mapping riêng.

### Phase AUTH-03 — API

- Tạo auth router.
- Đăng ký router trong `app/main.py`.
- Set/clear HttpOnly cookie.
- Implement `get_current_user` dependency.
- Bảo vệ task và feedback endpoint sau khi auth contract được kiểm tra.

### Phase AUTH-04 — Tests

- Unit test password hashing.
- Unit test duplicate email/username.
- Unit test invalid credentials.
- API test register/login/me/logout.
- API test expired/revoked session.
- API test protected endpoint trả 401.

## 13. Frontend implementation phases

### Phase FE-AUTH-01 — Extract auth code

- Đo kích thước và coupling của phần auth trong `main.tsx`.
- Chỉ tách `AuthModal` nếu việc tách giúp trace hoặc test rõ hơn.
- Chỉ tách `SignInForm` và `SignUpForm` nếu mỗi form có logic độc lập đủ lớn.
- Giữ nguyên visual/UI behavior.
- Xoá login hard-code sau khi API sẵn sàng.

### Phase FE-AUTH-02 — API integration

- Tạo `authApi`.
- Thêm `credentials: 'include'`.
- Implement register/login/me/logout.
- Mapping response snake_case sang frontend type nếu cần.
- Chỉ tách `httpClient` nếu task/feedback/auth có behavior HTTP dùng chung.

### Phase FE-AUTH-03 — Auth state

- Restore session khi refresh.
- Hiển thị loading state.
- Hiển thị error state.
- Logout bằng API.
- Chặn dashboard khi unauthenticated.
- Chỉ tạo `AuthProvider` hoặc `useAuth` nếu auth state được sử dụng ở nhiều component/nhánh UI.

### Phase FE-AUTH-04 — Tests

- Test đúng file/component thực tế sau khi quyết định tách file.
- Validate empty identifier/password.
- Login success.
- Login failure.
- Register success/failure.
- Restore session.
- Logout.

## 14. Traceability matrix

Các path trong bảng là responsibility mapping. Path cuối cùng chỉ được chốt sau khi kiểm tra độ lớn và coupling thực tế; không tạo file chỉ để khớp tên trong bảng.

| Requirement ID | Nghiệp vụ | Frontend | Backend | Database | Test |
|---|---|---|---|---|---|
| AUTH-001 | Register | Auth UI responsibility | `auth.py`, `auth_service.py` | `users`, `sessions` | Register API test |
| AUTH-002 | Login email/username | Auth UI responsibility | `auth_service.py` | `users`, `sessions` | Login success/failure |
| AUTH-003 | Restore session | Auth state responsibility | `GET /auth/me` | `sessions` | Session restore test |
| AUTH-004 | Logout | Auth state responsibility | `POST /auth/logout` | `sessions.revoked_at` | Logout test |
| AUTH-005 | Protect API | Shared HTTP responsibility nếu phát sinh | `get_current_user` | `users`, `sessions` | 401 protected API test |
| AUTH-006 | Password security | Không expose password | Password responsibility nếu cần tách | `users.password_hash` | Hash/verify test |
| AUTH-007 | Duplicate identity | Form error mapping | `auth/service.py` | Unique indexes | 409 tests |
| AUTH-008 | Session cookie | `credentials: include` | Cookie middleware/response | `sessions` | Cookie integration test |

## 15. Definition of Done

Authentication module chỉ được xem là hoàn thành khi:

- Không còn hard-code login trong production frontend.
- Register tạo user thật trong database.
- Login nhận email hoặc username.
- Password được hash bằng thuật toán an toàn.
- Session cookie là HttpOnly.
- Refresh browser vẫn giữ được session hợp lệ.
- Logout revoke session ở backend.
- `/tasks/*` và `/feedback` có thể lấy current user.
- Unauthorized request trả `401 AUTH_REQUIRED`.
- Duplicate email/username trả lỗi rõ ràng.
- Không log password, raw session token hoặc password hash.
- Backend unit/API tests pass.
- Frontend auth tests pass.
- `npm run build` pass.
- API docs có đầy đủ auth endpoints.
- Migration có thể chạy lại trên database sạch.

## 16. Rủi ro và cách xử lý

| Rủi ro | Impact | Cách xử lý |
|---|---|---|
| CORS cookie sai cấu hình | Login thành công nhưng `/auth/me` 401 | Test frontend/backend khác port, dùng `credentials: include` |
| Giữ demo credential trong bundle | Lộ credential | Chỉ seed development, bỏ Fill Demo ở production |
| Lưu token vào localStorage | XSS có thể lấy token | Dùng HttpOnly session cookie |
| In-memory session | Mất session khi restart | Dùng bảng `sessions` |
| Không kiểm tra `response.ok` | UI hiểu nhầm login thành công | Centralize error handling trong `httpClient` |
| Tách file quá sớm | Refactor lớn, dễ regression | Chỉ tách auth trước, giữ dashboard nguyên trạng |
| Thêm OAuth/password reset quá sớm | Scope phình to | Để ngoài MVP |

## 17. Checklist trước khi bắt đầu implement

- [ ] Xác nhận email là identity chính.
- [ ] Xác nhận username có bắt buộc hay optional.
- [ ] Xác nhận register có auto-login hay cần email verification.
- [ ] Xác nhận dùng session cookie cho MVP.
- [ ] Xác nhận password policy tối thiểu.
- [ ] Xác nhận task và feedback sẽ được bảo vệ ngay trong module này.
- [ ] Xác nhận database engine cho local/production.
- [ ] Xác nhận giữ hay loại bỏ demo account.
- [ ] Chốt API error contract.
- [ ] Chốt migration tool.

## 18. Thứ tự triển khai được đề xuất

```text
1. Chốt các quyết định trong checklist
2. Tạo database/migration cho users và sessions
3. Implement backend security + repository + service
4. Implement auth API
5. Viết backend tests
6. Tách frontend auth files nếu việc tách tạo ra responsibility độc lập
7. Kết nối frontend với auth API
8. Implement session restore; chỉ tạo Provider/hook nếu cần dùng chung
9. Bảo vệ task/feedback API
10. Viết frontend tests
11. Chạy build + API integration test
12. Tổng kết AUTH module trước khi chuyển module khác
```
