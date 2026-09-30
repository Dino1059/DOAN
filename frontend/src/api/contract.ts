export type TaskStatus = 'queued' | 'running' | 'paused' | 'waiting_human_input' | 'waiting_human_approval' | 'completed' | 'failed' | 'cancelled';

export interface TestStep {
  id: number;
  action: string;
  selector: string;
  expected: string;
}

export interface TestPlan {
  objective: string;
  target_url: string;
  preconditions: string[];
  test_data: Record<string, unknown>;
  steps: TestStep[];
}

export type RunStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface RunStep extends TestStep {
  step_no: number;
  status: RunStepStatus;
  observation: string | null;
  started_at: string | null;
  duration_ms: number | null;
}

// GET /tasks/{id} và sự kiện "snapshot" của SSE
export interface TaskStatusResponse {
  id: string;
  task_id: string;
  status: TaskStatus;
  name: string;
  runner: 'simulated' | 'playwright';
  plan_id: string | null;
  rerun_of: string | null;
  current_step: number;
  total_steps: number;
  human_prompt: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  steps: RunStep[];
}

// Sự kiện SSE sau snapshot
export type RunEvent =
  | ({ type: 'snapshot' } & TaskStatusResponse)
  | { type: 'status'; task_id: string; status: TaskStatus; human_prompt?: string }
  | { type: 'step'; task_id: string; step_no: number; status: RunStepStatus; observation?: string; duration_ms?: number; current_step?: number };

export interface RunHistoryItem {
  run_id: string;
  task_id?: string;
  name: string;
  suite: string;
  env: string;
  browser: string;
  status: string;
  duration: string;
  created_at: string;
  passed_steps: number;
  failed_steps: number;
}

// GET /test-runs → { data: RunPage }
export interface RunPage {
  items: RunHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

// GET /test-runs/filters
export interface RunFilterOptions {
  statuses: string[];
  suites: string[];
  envs: string[];
  browsers: string[];
}

export interface RunIntervention {
  step_no: number | null;
  kind: 'input' | 'approval';
  question: string;
  answer: string | null; // đã che nếu là bí mật (OTP → "••••56")
  decision: 'approved' | 'rejected' | null;
  asked_at: string;
  answered_at: string | null;
}

// GET /test-runs/{id} — RunDetailModal
export interface RunDetail extends RunHistoryItem {
  runner: 'simulated' | 'playwright';
  plan_id: string | null;
  rerun_of: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  steps: RunStep[];
  interventions: RunIntervention[];
}
