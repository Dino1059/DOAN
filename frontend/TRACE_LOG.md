# NHẬT KÝ HỆ THỐNG & TẢI TRẠNG THAY ĐỔI (TRACE LOG)
## AI Agent Tester — Bản thiết kế v1

**Repository**: [https://github.com/Dino1059/Autonomous_test.git](https://github.com/Dino1059/Autonomous_test.git)  
**Phiên bản (Version)**: v1.0.0  
**Ngày khởi tạo**: 08/08/2026  
**Môi trường (Tech Stack)**: HTML5, React 18 (UMD CDN), Babel Standalone 7.29, Framer Motion 11.11, Tailwind CSS.

---

### 📊 BẢNG TỔNG HỢP COMMIT & LỆNH REVERT (COMMIT TRACE TABLE)

| STT | Comment (Commit Message) | SHA | Nội dung tóm tắt thay đổi | Lệnh Revert về bản đó |
| :-: | :--- | :-: | :--- | :--- |
| **17** | `Update dashboard modules and test run workflows` | `8986a4f` | Update dashboard modules and test run workflows | `git checkout 8986a4f`<br/>*(hoặc `git reset --hard 8986a4f`)* |
| **16** | `docs & feat: cap nhat README, browser_config va chuan hoa React SPA Dashboard` | `8c6fe85` | docs & feat: cap nhat README, browser_config va chuan hoa React SPA Dashboard, thêm alias và nối các endpoint giữa be và fe ,Kết nối SSE EventSource realtime trên Frontend | `git checkout 8c6fe85`<br/>*(hoặc `git reset --hard 8c6fe85`)* |
| **15** | `[LOCAL] sửa browser headless mode — hiển thị cửa sổ Chromium khi chạy local` | *(chưa commit)* | Viết lại `app/utils/browser_config.py`: auto-detect Docker vs Local; `headless=False` khi chạy local → cửa sổ Chromium mở ra; `headless=True` chỉ trong Docker. Sửa lỗi `OSError: Read-only file system /app` khi chạy local bằng cách dùng `os.getcwd()` thay cho đường dẫn cứng `/app`. | *(chưa push — thay đổi cục bộ)* |
| **14** | `[LOCAL] xóa gradio_ui và agent_tester, thống nhất 1 UI React SPA` | *(chưa commit)* | Xóa thư mục `gradio_ui/` và `agent_tester/`; cập nhật `README.md` loại bỏ mọi tham chiếu Gradio; cập nhật `docker-compose.yml` (port 8088 thay 7860, volume `frontend/` thay `gradio_ui/`); thêm `browser_profiles/` vào `.gitignore`. | *(chưa push — thay đổi cục bộ)* |
| **13** | `chuẩn hóa 1 UI duy nhất React SPA, xóa gradio_ui và agent_tester` | `ce5abcd` | chuẩn hóa 1 UI duy nhất React SPA, xóa gradio_ui và agent_tester | `git checkout ce5abcd`<br/>*(hoặc `git reset --hard ce5abcd`)* |
| **12** | `chuẩn hóa 1 UI duy nhất React SPA, xóa gradio_ui và agent_tester` | `831506b` | chuẩn hóa 1 UI duy nhất React SPA, xóa gradio_ui và agent_tester | `git checkout 831506b`<br/>*(hoặc `git reset --hard 831506b`)* |
| **11** | `Đấu nối màn hình Playwright Viewport real-time và bảng giám sát Multi-Agent Status vào React Dashboard UI` | `b4fdd93` | Đấu nối màn hình Playwright Viewport real-time và bảng giám sát Multi-Agent Status vào React Dashboard UI | `git checkout b4fdd93`<br/>*(hoặc `git reset --hard b4fdd93`)* |
| **10** | `Bổ sung requests vào requirements.txt và cập nhật start.sh tự động kích hoạt agent_tester venv` | `7071a6f` | Bổ sung requests vào requirements.txt và cập nhật start.sh tự động kích hoạt agent_tester venv | `git checkout 7071a6f`<br/>*(hoặc `git reset --hard 7071a6f`)* |
| **9** | `Cấu hình hỗ trợ PostgreSQL database cho AutoTester Framework` | `c71f75a` | Cấu hình hỗ trợ PostgreSQL database cho AutoTester Framework | `git checkout c71f75a`<br/>*(hoặc `git reset --hard c71f75a`)* |
| **8** | `Tích hợp SQLite Database & kết nối React Dashboard UX với backend Multi-Agent API` | `19484d3` | Tích hợp SQLite Database & kết nối React Dashboard UX với backend Multi-Agent API | `git checkout 19484d3`<br/>*(hoặc `git reset --hard 19484d3`)* |
| **7** | `Cập nhật TRACE_LOG.md cho phiên bản Multi-Agent v2.0.0` | `9976f47` | Cập nhật TRACE_LOG.md cho phiên bản Multi-Agent v2.0.0 | `git checkout 9976f47`<br/>*(hoặc `git reset --hard 9976f47`)* |
| **6** | `Triển khai kiến trúc Multi-Agent & Human-in-the-Loop Framework` | `6f59ca2` | Triển khai kiến trúc Multi-Agent & Human-in-the-Loop Framework | `git checkout 6f59ca2`<br/>*(hoặc `git reset --hard 6f59ca2`)* |
| **5** | `Remove demo_reports` | `b6fc36e` | Remove demo_reports | `git checkout b6fc36e`<br/>*(hoặc `git reset --hard b6fc36e`)* |
| **4** | `gộp tài liệu README.md và README-Docker.md` | `059ee6b` | gộp tài liệu README.md và README-Docker.md | `git checkout 059ee6b`<br/>*(hoặc `git reset --hard 059ee6b`)* |
| **3** | `bản thiết kế v1 của dự án` | `f1c79f2` | bản thiết kế v1 của dự án | `git checkout f1c79f2`<br/>*(hoặc `git reset --hard f1c79f2`)* |
| **1** | `bản thiết kế v1 của dự án` | `c343fc2` | Khởi tạo giao diện Landing Page Space Travel, bổ sung Auth Modal trượt 2 ô, đăng nhập `admin123/123`, chế độ White Mode (☀️/🌙) và toàn bộ AI Agent Tester Dashboard Workspace. | `git checkout c343fc2` <br/>*(hoặc `git reset --hard c343fc2`)* |
| **2** | `Initial commit` | `807f60a` | Khởi tạo dự án gốc backend & cấu trúc ban đầu. | `git checkout 807f60a` <br/>*(hoặc `git reset --hard 807f60a`)* |

---

### 📜 LỊCH SỬ THAY ĐỔI CHI TIẾT THEO PHIÊN BẢN (DETAILED CHANGELOG)

#### 📌 [v2.0.0] - Triển khai Kiến trúc Multi-Agent & Human-in-the-Loop Framework
- **Data Schemas & Protocols**:
  - Dựng giao thức tin nhắn `AgentMessage` (`TASK_PLAN`, `ACTION_REQUEST`, `SIMULATION_QUERY`, `HUMAN_INTERVENTION_NEEDED`, `EVALUATION_REQUEST`, v.v.).
  - Dựng bộ nhớ chia sẻ `SharedExecutionContext` lưu giữ sub-goals, DOM snapshots, logs và trạng thái làm việc.
- **Agent Event Bus & Base Engine**:
  - Xây dựng `AgentEventBus` xử lý routing tin nhắn bất đồng bộ qua `asyncio.Queue`.
  - Định nghĩa lớp trừu tượng `BaseAgent` chuẩn hóa phương thức xử lý tin nhắn.
- **4 Agent Chuyên biệt**:
  - `PlannerAgent`: Phân tích kịch bản test và sinh JSON sub-goals.
  - `BrowserExecutionAgent`: Tương tác UI Playwright / `browser-use`.
  - `UserSimulatorAgent`: Đóng vai người dùng sinh dữ liệu form / trả lời câu hỏi tự động.
  - `ReportEvaluatorAgent`: Đánh giá trace logs và sinh file báo cáo Markdown.
- **Orchestrator Manager Agent & Human Control**:
  - Xây dựng `Orchestrator` điều phối toàn bộ luồng công việc giữa 4 Agent.
  - Tích hợp cơ chế can thiệp con người thời gian thực (`provide_human_input`, `pause_task`, `resume_task`).
  - Thêm các API endpoints mới `/tasks/{task_id}/human-input`, `/tasks/{task_id}/pause`, `/tasks/{task_id}/resume` tại Task Controller.
- **Testing**:
  - Tạo bộ test tự động `src/tests/test_multi_agent_workflow.py` kiểm thử thành công 100% các thành phần của framework.

#### 📌 [v1.7.0] - Thêm Nút bấm Chuyển đổi Giao diện White Mode / Light Mode

- Thêm icon Mặt trời (☀️) / Mặt trăng (🌙) trên thanh Navigation.
- Chuyển đổi linh hoạt toàn bộ hệ thống sang **White / Light Mode** với bộ theme kính mờ nền sáng (`bg-slate-50`, `liquid-glass` viền mờ tối, chữ `text-slate-900` sắc nét).

#### 📌 [v1.6.0] - Xây dựng Toàn bộ AI Agent Tester Dashboard Workspace
Cấu trúc và triển khai 8 khu vực chức năng cốt lõi của Dashboard:
1. **Top Navigation Bar**: Thanh menu điều hướng module (`Dashboard`, `New Test`, `Test Runs`, `Test Cases`, `Comparisons`, `Reports`, `Environments`, `Settings`) + Đèn báo kết nối Real-time (`Agent Online`, `Playwright Connected`).
2. **Test Overview Metrics**: Thống kê chỉ số `Total Test Runs (1,284)`, `Passed (1,192)`, `Failed (64)`, `In Progress`, `Avg Duration (42.5s)`.
3. **Prompt-to-Test Generator**: Nhập prompt ngôn ngữ tự nhiên (ví dụ: *"Kiểm tra tính năng quên mật khẩu trên trang test.com"*) + các gợi ý sample prompt 1-click.
4. **Planner Agent Structured Test Plan**: Tự động sinh ra Kịch bản dạng JSON cấu trúc + Bộ công cụ chỉnh sửa kịch bản trực tiếp (Add, Edit, Delete, Reorder Steps).
5. **Playwright Live Browser Viewport Simulator**: Màn hình mô phỏng thao tác trình duyệt Playwright thời gian thực (`1920x1080`, 60 FPS, highlight DOM selector active) + Bộ điều khiển `Pause`, `Resume`, `Stop`.
6. **Agent Step Monitor**: Giám sát hành động của AI Agent theo thời gian thực (Step X/Y, Current Action, Observation, Next Step).
7. **Execution Timeline & Evidence Inspection**: Dòng thời gian các bước + Trình soi bằng chứng đa dạng (🌐 API Validation: POST endpoint, Status 200, 342ms latency, JSON Schema, 📸 Screenshot, 🤖 Agent Logs, 💻 Console Logs, 👁️ Visual Diff 0.01%).
8. **Recent Test Runs Table & System Footer**: Bảng lịch sử các đợt test gần nhất + Chân trang giám sát trạng thái hệ thống.

#### 📌 [v1.5.0] - Phân quyền Đăng nhập & Tích hợp Tài khoản Test (`admin123` / `123`)
- Cấu hình logic xác thực cho Modal Đăng nhập:
  - **Tài khoản**: `admin123`
  - **Mật khẩu**: `123`
- Bổ sung nút 1-click **"Fill Demo: admin123 / 123"** giúp đăng nhập thử nghiệm nhanh chóng.
- Kết nối thành công luồng Đăng nhập chuyển hướng trực tiếp vào **AI Agent Tester Dashboard Workspace**.

#### 📌 [v1.4.0] - Thiết kế Modal Đăng nhập / Đăng ký Trượt 2 Ô (Sliding Card Auth Modal)
- Xây dựng Modal Đăng nhập dạng thẻ kính mờ 2 nửa màn hình.
- Ứng dụng Framer Motion với vật lý lò xo (`spring physics stiffness: 220, damping: 26`): Khi ấn sang *Create Account*, thẻ hình ảnh bên phải trượt mượt mà sang trái che ô cũ và hiện form Đăng ký mới.
- Đổi nút bấm trên thanh Menu từ *Claim a Spot* thành **Sign In**.

#### 📌 [v1.3.0] - Định hình Nội dung Autonomous AI Testing Engine
- Cập nhật toàn bộ nội dung Hero Section sang thương hiệu **Autonomous AI Testing Platform**.
- Thay đổi thanh đối tác sang hệ sinh thái tích hợp DevOps / Testing chuyên nghiệp: **GitHub**, **GitLab**, **Playwright**, **Cypress**, **Jira**, **Jenkins**.
- Bổ sung các chỉ số ấn tượng: **99.8% Test Coverage** và **10x Release Velocity**.

#### 📌 [v1.2.0] - Khắc phục lỗi UMD Global Scope trên trình duyệt
- Phát hiện và xử lý xung đột tên biến toàn cục trong bản UMD của Framer Motion (`window.Motion` vs `window.FramerMotion`).
- Bổ sung cơ chế fallback tự động `window.Motion = window.Motion || window.FramerMotion` để tránh lỗi màn hình đen trên mọi trình duyệt.

#### 📌 [v1.1.0] - Xử lý Video lặp & Hiệu ứng Chữ BlurText
- Phát triển component `FadingVideo` xử lý mượt mà việc chuyển màu video nền tự động lặp (looping crossfade) bằng `requestAnimationFrame` (rAF) mà không dùng CSS transitions.
- Phát triển component `BlurText` kết hợp `IntersectionObserver` tự động hiện hiệu ứng làm mượt từng từ (word-by-word blur-in animation) khi cuộn tới màn hình.

#### 📌 [v1.0.0] - Khởi tạo Giao diện & Hệ thống Kính mờ (Liquid Glass System)
- Thiết lập cấu trúc Single Page Application (SPA) trên `index.html`.
- Cài đặt Font chữ Google Fonts: `Instrument Serif` (Headline nghiêng nghệ thuật) và `Barlow` (Nội dung chính) & `JetBrains Mono` (Mã nguồn / Log).
- Cấu hình Tailwind CSS tùy chỉnh bán kính bo tròn pill (`borderRadius.DEFAULT: "9999px"`).
- Xây dựng hệ thống class CSS kính mờ cao cấp: `.liquid-glass` (blur 4px, viền sáng mảnh) và `.liquid-glass-strong` (blur 50px, hiệu ứng đổ bóng mượt).

---

### 📂 CẤU TRÚC THƯ MỤC THƯỜNG TRỰC (FRONTEND FOLDER STRUCTURE)

```
frontend/
├── index.html        # Ứng dụng Single Page Application React (Landing Page + Sliding Auth Modal + Dashboard Workspace)
└── TRACE_LOG.md      # Nhật ký lưu trữ lịch sử thay đổi, bảng commit SHA và lệnh Revert
```


Nhập prompt → [Generate Plan] → POST /tasks/generate-plan → hiện Plan Review
    ↓
User edit/duyệt plan
    ↓
[Confirm & Run Test] → POST /tasks/run (chỉ gửi promptText, KHÔNG gửi steps đã review)
    ↓
Poll GET /tasks/{id} mỗi 2s → cập nhật executionStatus
    ↓
Khi done → refresh Recent Runs