// Màu badge trạng thái run, dùng chung cho Dashboard, Test Runs và RunDetailModal.
const ACTIVE = ['queued', 'running', 'paused', 'waiting_human_input', 'waiting_human_approval'];

export const runStatusClass = (status: string): string => {
  if (status === 'completed') return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30';
  if (ACTIVE.includes(status)) return 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30';
  if (status === 'cancelled') return 'bg-slate-400/20 text-slate-600 dark:text-slate-300 border border-slate-400/30';
  return 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'; // failed
};

export const stepStatusClass = (status: string): string => {
  if (status === 'passed') return 'text-emerald-600 bg-emerald-500/10 border-emerald-400';
  if (status === 'failed') return 'text-rose-600 bg-rose-500/10 border-rose-400';
  if (status === 'running') return 'text-amber-600 bg-amber-500/10 border-amber-400';
  return 'text-slate-500 bg-slate-200/70 border-slate-400'; // pending, skipped
};

export const stepIcon = (status: string, stepNo: number): string =>
  status === 'passed' ? '✓' : status === 'failed' ? '✕' : status === 'running' ? '⚡' : status === 'skipped' ? '–' : String(stepNo);
