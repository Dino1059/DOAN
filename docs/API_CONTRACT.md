# Frontend ↔ Backend API Contract

Base URL: VITE_API_BASE_URL in frontend/.env. Default: http://localhost:8081.
All JSON errors use `{ "detail": "Human-readable error message" }`.

## Health
`GET /health`

```json
{ "status": "ok", "service": "ai-agent-tester-api" }
```

## Generate plan
`POST /tasks/generate-plan`

Frontend request:
```json
{ "prompt": "Test the password reset feature on test.com", "llm_provider": "google", "llm_model": "gemini-2.0-flash" }
```

Response:
```json
{ "data": { "objective": "Verify password reset", "target_url": "https://test.com/forgot-password", "preconditions": [], "test_data": {}, "steps": [] } }
```

## Start task
`POST /tasks/run`

The frontend sends the prompt inside `tasks[0].prompt`:
```json
{ "tasks": [{ "name": "Dashboard Multi-Agent Execution", "prompt": "Test the password reset feature on test.com", "max_steps": 30, "llm_provider": "google", "llm_model": "gemini-2.0-flash" }], "session_id": "session_1710000000000", "simulator_task": "Test the password reset feature on test.com", "browser_config": { "keep_alive": false, "headless": false } }
```

Response:
```json
{ "data": { "message": "Task started. ID: TASK-ABC12345" } }
```

## Status and realtime events
`GET /tasks/{task_id}` returns `{ data: TaskStatus }`.
Task status values: `created`, `plan_ready`, `running`, `paused`, `waiting_human_input`, `waiting_human_approval`, `completed`, `failed`, `cancelled`.

`GET /tasks/stream/{task_id}` returns `text/event-stream`:
```text
data: {"status":"running","task_id":"TASK-ABC12345"}
```

## Controls
- `POST /tasks/{task_id}/pause`
- `POST /tasks/{task_id}/resume`
- `POST /tasks/{task_id}/cancel`

## Human input
`POST /tasks/{task_id}/human-input`
```json
{ "action": "provide_input", "input_text": "Use the test account" }
```

## Run history
`GET /tasks/history/runs` returns `{ data: RunHistoryItem[] }`.
Each item must contain: `run_id`, `task_id`, `name`, `suite`, `env`, `browser`, `status`, `duration`, `created_at`, `passed_steps`, `failed_steps`.

## Feedback
`POST /feedback`
```json
{ "rating": 5, "category": "Product experience", "message": "Useful", "username": "admin123" }
```

Response: `{ "status": "received" }`.

## Not API yet
Reports, Comparisons, Environments and Settings currently use frontend local state. Add endpoints later with the same flow: router → service → repository.
