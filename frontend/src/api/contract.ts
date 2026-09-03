export type TaskStatus = 'created' | 'generating' | 'plan_ready' | 'approved' | 'queued' | 'running' | 'paused' | 'waiting_human_input' | 'completed' | 'failed' | 'cancelled';

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

export interface TaskStatusResponse {
  id: string;
  status: TaskStatus;
  prompt_text: string;
  plan: TestPlan | null;
  created_at: string;
}

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
