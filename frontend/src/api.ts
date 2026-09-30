// @ts-nocheck
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

// M7: mọi request gửi kèm cookie phiên đăng nhập (HttpOnly, JavaScript không đọc được)
const apiFetch = (path, init = {}) => apiFetch(`${path}`, { credentials: 'include', ...init });

// Phiên hết hạn / bị đăng xuất ở tab khác → App đưa người dùng về màn hình đăng nhập
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler; };

export type { TaskStatus, TestStep, TestPlan, TaskStatusResponse, RunHistoryItem } from './api/contract';

const postJson = (path, body) => apiFetch(`${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

// "2026-10-01T08:05:00Z" → giờ địa phương dễ đọc (cột STARTED)
export const formatStarted = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

// Map backend RunHistoryItem (snake_case) → UI run row (camelCase)
export const toRunRow = (item) => ({
  id: item.run_id || item.task_id,
  name: item.name,
  suite: item.suite,
  env: item.env,
  browser: item.browser,
  status: item.status || "queued",
  duration: item.duration ?? "0.0s",
  createdAt: item.created_at,
  startTime: formatStarted(item.created_at),
  passedSteps: item.passed_steps ?? 0,
  failedSteps: item.failed_steps ?? 0
});

// Lỗi HTTP có response từ backend (4xx/5xx) — khác với lỗi mạng khi backend tắt (fetch tự ném TypeError).
export class ApiError extends Error {
  constructor(status, detail, code) {
    super(detail || `Request failed (HTTP ${status})`);
    this.status = status;
    this.code = code;
  }
}

const jsonOrThrow = async (res) => {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && body.code === 'NOT_AUTHENTICATED' && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, body.detail, body.code);
  }
  return body;
};

const sendJson = (method, path, body) => apiFetch(`${path}`, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
}).then(jsonOrThrow);

// ---------- Đăng nhập (M7) ----------

// → user { id, username, email, display_name } hoặc ApiError 401 nếu chưa đăng nhập
export const getMe = () => apiFetch('/auth/me').then(jsonOrThrow).then(body => body.data);

// login: username hoặc email. Sai → ApiError 401 "Invalid username or password"
export const login = (loginName, password) =>
  sendJson('POST', '/auth/login', { login: loginName, password }).then(body => body.data);

export const register = ({ displayName, email, password, confirmPassword }) =>
  sendJson('POST', '/auth/register', {
    display_name: displayName, email, password, confirm_password: confirmPassword,
  }).then(body => body.data);

export const logout = () => apiFetch('/auth/logout', { method: 'POST' });

// ---------- Test Runs (M5): lọc, tìm kiếm, phân trang ở server ----------

// params: { q, status, suite, env, browser, date_range: '24h'|'7d'|'30d', page, page_size }
// → { items: UI run rows, total, page, page_size }
export const listTestRuns = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  return apiFetch(`/test-runs?${query}`)
    .then(jsonOrThrow)
    .then(body => ({ ...body.data, items: body.data.items.map(toRunRow) }));
};

// Recent Runs (Dashboard) và danh sách run cho Reports/Comparisons
export const fetchRunHistory = (pageSize = 20) =>
  listTestRuns({ page_size: pageSize }).then(page => page.items);

// → { statuses, suites, envs, browsers }: chỉ các giá trị có thật trong DB
export const getTestRunFilters = () =>
  apiFetch(`/test-runs/filters`).then(jsonOrThrow).then(body => body.data);

// → chi tiết run: steps[] (status, observation), interventions[], error_message, runner…
export const getTestRun = (runId) =>
  apiFetch(`/test-runs/${runId}`).then(jsonOrThrow).then(body => body.data);

// ---------- Evidence (M6): bằng chứng của 1 bước ----------

// → { run_id, step_no, items: [{ id, kind, payload, file_url, created_at }] }
export const getStepEvidence = (runId, stepNo) =>
  apiFetch(`/evidence/${runId}/steps/${stepNo}`).then(jsonOrThrow).then(body => body.data);

// file_url backend trả về là đường dẫn tương đối ("/evidence/files/EVD-…")
export const evidenceFileUrl = (path) => (path ? `${API_BASE}${path}` : null);

// POST /tasks/generate-plan → { data: plan + conversation + messages }. Backend dùng OpenAI gpt-4o-mini.
// conversationId: có → tiếp tục phiên chat (sửa plan qua chat / Run Again); không → tạo phiên mới.
export const generatePlan = (prompt, conversationId) =>
  sendJson('POST', '/tasks/generate-plan', {
    prompt,
    conversation_id: conversationId || undefined,
  });

// Session History
export const listConversations = (q) =>
  apiFetch(`/conversations${q ? `?q=${encodeURIComponent(q)}` : ''}`).then(jsonOrThrow);

export const getConversation = (conversationId) =>
  apiFetch(`/conversations/${conversationId}`).then(jsonOrThrow);

export const updateConversation = (conversationId, patch) =>
  sendJson('PATCH', `/conversations/${conversationId}`, patch);

// Lưu bước sau Edit Directly / + Add Step / xoá bước. Plan đã chạy (approved) → ApiError 409.
export const updatePlanSteps = (planId, steps) =>
  sendJson('PUT', `/plans/${planId}/steps`, {
    steps: steps.map(({ action, selector, expected }) => ({ action, selector, expected })),
  });

// POST /tasks/run (202) → task_id "RUN-…". Backend lưu run vào PostgreSQL rồi chạy nền, theo dõi qua SSE.
// planTaskId: plan_id từ generatePlan() — backend khoá plan đó và chép đúng các bước của nó.
// steps: gửi kèm để plan mẫu (chưa lưu backend) vẫn chạy được.
export const runTest = (promptText, planTaskId, steps) =>
  sendJson('POST', '/tasks/run', {
    task_id: planTaskId || undefined,
    steps: planTaskId ? undefined : steps?.map(({ action, selector, expected }) => ({ action, selector, expected })),
    name: planTaskId ? undefined : promptText,
    tasks: [{
      name: "Dashboard Multi-Agent Execution",
      prompt: promptText,
      max_steps: 30,
    }],
    browser_config: { keep_alive: false, headless: false }
  }).then(body => body.data.task_id);

// Re-run: chạy lại ĐÚNG các bước của run cũ → task_id của run mới
export const rerunTest = (runId) =>
  sendJson('POST', `/test-runs/${runId}/rerun`, {}).then(body => body.data.task_id);

// GET /tasks/{id} → { data: Run } (status, steps[] kèm status/observation, human_prompt)
export const getTask = (taskId) =>
  apiFetch(`/tasks/${taskId}`).then(jsonOrThrow);

// SSE: sự kiện đầu là { type: "snapshot", ...Run }, sau đó { type: "step" | "status", ... }
export const openTaskStream = (taskId) => new EventSource(`${API_BASE}/tasks/stream/${taskId}`, { withCredentials: true });

// Pause/Resume/Stop → { data: Run }. Sai trạng thái (vd: pause run đã xong) → ApiError 409.
export const cancelTask = (taskId) => sendJson('POST', `/tasks/${taskId}/cancel`, {});

export const pauseTask = (taskId) => sendJson('POST', `/tasks/${taskId}/pause`, {});

export const resumeTask = (taskId) => sendJson('POST', `/tasks/${taskId}/resume`, {});

export const sendHumanInput = (taskId, inputText) =>
  sendJson('POST', `/tasks/${taskId}/human-input`, { action: "provide_input", input_text: inputText });

// ---------- Environments (M8) ----------

export const listEnvironments = () => apiFetch('/environments').then(jsonOrThrow).then(body => body.data);

export const createEnvironment = (payload) => sendJson('POST', '/environments', payload).then(body => body.data);

export const updateEnvironment = (id, payload) => sendJson('PUT', `/environments/${id}`, payload).then(body => body.data);

export const deleteEnvironment = (id) => apiFetch(`/environments/${id}`, { method: 'DELETE' }).then(jsonOrThrow);

export const testEnvironmentConnection = (id) =>
  sendJson('POST', `/environments/${id}/test-connection`, {}).then(body => body.data);

// ---------- Settings (M9) ----------

export const getProfile = () => apiFetch('/settings/profile').then(jsonOrThrow).then(body => body.data);

export const updateProfile = (patch) => sendJson('PUT', '/settings/profile', patch).then(body => body.data);

export const changePassword = (currentPassword, newPassword) =>
  sendJson('PUT', '/settings/password', { current_password: currentPassword, new_password: newPassword });

export const listApiKeys = () => apiFetch('/settings/api-keys').then(jsonOrThrow).then(body => body.data);

export const setApiKey = (provider, apiKey) =>
  sendJson('PUT', `/settings/api-keys/${provider}`, { api_key: apiKey }).then(body => body.data);

export const deleteApiKey = (provider) => apiFetch(`/settings/api-keys/${provider}`, { method: 'DELETE' }).then(jsonOrThrow);

export const getPreferences = () => apiFetch('/settings/preferences').then(jsonOrThrow).then(body => body.data);

export const updatePreferences = (patch) => sendJson('PUT', '/settings/preferences', patch).then(body => body.data);

export const submitFeedback = ({ rating, category, message, username }) =>
  postJson('/feedback', { rating, category, message, username })
    .then(async response => {
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.detail || 'Unable to save feedback.');
      }
      return responseData;
    });
