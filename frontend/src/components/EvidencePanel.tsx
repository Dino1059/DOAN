// @ts-nocheck
import React from 'react';
import { getStepEvidence, evidenceFileUrl } from '../api';

// 5 tab Evidence Inspector (M6) — dùng chung cho New Test và RunDetailModal.
// refreshKey đổi (vd: bước vừa chạy xong) → tải lại bằng chứng của bước đó.
export const EVIDENCE_TABS = [
  { id: 'network', label: 'API Validation' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'agent', label: 'Agent Log' },
  { id: 'console', label: 'Console' },
  { id: 'visual', label: 'Visual Diff' }
];

const LEVEL_COLOR = {
  SUCCESS: 'text-emerald-400', ERROR: 'text-rose-400', ACTION: 'text-sky-300', TRACE: 'opacity-60', INFO: 'text-white',
};
const CONSOLE_COLOR = { error: 'text-rose-400', warning: 'text-amber-300', warn: 'text-amber-300' };

const formatT = (ms) => {
  const s = (ms || 0) / 1000;
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};

const statusTone = (code) => (code >= 200 && code < 300 ? 'text-emerald-500' : code >= 400 ? 'text-rose-500' : 'text-amber-500');

export const EvidencePanel = ({ isLight, runId, stepNo, tab, refreshKey }) => {
  const [items, setItems] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!runId || !stepNo) { setItems(null); return; }
    let cancelled = false;
    setError('');
    getStepEvidence(runId, stepNo)
      .then(data => { if (!cancelled) setItems(data.items); })
      .catch(err => { if (!cancelled) { setItems([]); setError(err.message || 'Unable to load evidence.'); } });
    return () => { cancelled = true; };
  }, [runId, stepNo, refreshKey]);

  const muted = isLight ? 'text-slate-500' : 'text-white/60';
  const card = `rounded-xl border p-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`;
  const Empty = ({ children }) => (
    <div className={`min-h-[200px] flex items-center justify-center text-center text-sm px-6 ${muted}`}>{children}</div>
  );

  if (!runId) return <Empty>Run the test to collect evidence for each step.</Empty>;
  if (error) return <Empty><span className="text-rose-500">{error}</span></Empty>;
  if (items === null) return <Empty>Loading evidence…</Empty>;

  const byKind = (kind) => items.find(i => i.kind === kind);
  const none = (what) => <Empty>No {what} was captured for step {stepNo}.</Empty>;

  if (tab === 'network') {
    const net = byKind('network')?.payload;
    if (!net) return none('network traffic');
    const api = net.api_check;
    return (
      <div className="space-y-3 font-mono text-xs">
        {api && (
          <>
            <div className={`flex items-center justify-between gap-3 ${card}`}>
              <div className="min-w-0 truncate"><span className="text-emerald-500 font-bold mr-2">{api.method}</span><span>{api.url}</span></div>
              <span className={`shrink-0 ${statusTone(api.status_code)}`}>HTTP {api.status_code} ({api.response_ms}ms)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={card}><span className={`text-[10px] block mb-1 ${muted}`}>EXPECTED</span><div>{api.expected || '—'}</div></div>
              <div className={card}><span className={`text-[10px] block mb-1 ${muted}`}>ACTUAL</span><div className={statusTone(api.status_code)}>Status Code: {api.status_code}</div><div className={muted}>Response Time: {api.response_ms}ms</div></div>
            </div>
            {api.response_body && <pre className="bg-neutral-950 text-emerald-300 p-3 rounded-xl border border-slate-800 overflow-auto max-h-60 whitespace-pre-wrap">{api.response_body}</pre>}
          </>
        )}
        {net.requests?.length > 0 && (
          <div className={card}>
            <span className={`text-[10px] block mb-2 ${muted}`}>REQUESTS DURING THIS STEP ({net.requests.length})</span>
            <div className="space-y-1 max-h-60 overflow-auto">
              {net.requests.map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 font-bold">{r.method}</span>
                  <span className={`w-10 shrink-0 ${statusTone(r.status_code)}`}>{r.status_code}</span>
                  <span className="min-w-0 flex-1 truncate" title={r.url}>{r.url}</span>
                  <span className={`shrink-0 ${muted}`}>{r.resource_type}{r.response_ms != null ? ` · ${r.response_ms}ms` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (tab === 'screenshot') {
    const shot = byKind('screenshot');
    if (!shot) return none('screenshot');
    return (
      <div className="space-y-2">
        <img src={evidenceFileUrl(shot.file_url)} alt={`Screenshot after step ${stepNo}`} className="w-full rounded-xl border border-slate-700/40" />
        <div className={`text-[11px] font-mono flex flex-wrap gap-x-4 ${muted}`}>
          {shot.payload?.highlight_selector && <span>Element: {shot.payload.highlight_selector}</span>}
          {shot.payload?.page_url && <span className="truncate">Page: {shot.payload.page_url}</span>}
        </div>
      </div>
    );
  }

  if (tab === 'agent') {
    const lines = byKind('agent_log')?.payload?.lines;
    if (!lines?.length) return none('agent log');
    return (
      <div className="bg-neutral-950 text-white p-3.5 rounded-xl border border-slate-800 font-mono text-xs space-y-1 max-h-72 overflow-auto">
        {lines.map((l, i) => (
          <div key={i} className={LEVEL_COLOR[l.level] || ''}>
            [{formatT(l.t_ms)}] {l.level} <span className="opacity-60">{l.agent}</span>: {l.message}
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'console') {
    const lines = byKind('console')?.payload?.lines;
    if (!lines?.length) return <Empty>The browser printed nothing to the console during step {stepNo}.</Empty>;
    return (
      <div className="bg-neutral-950 text-emerald-300 p-3.5 rounded-xl border border-slate-800 font-mono text-xs space-y-1 max-h-72 overflow-auto">
        {lines.map((l, i) => <div key={i} className={CONSOLE_COLOR[l.level] || ''}>[{l.level}] {l.text}</div>)}
      </div>
    );
  }

  // Visual Diff: chỉ có khi run là Re-run (so với ảnh cùng bước của run gốc)
  const diff = byKind('visual_diff');
  if (!diff) {
    return <Empty>Visual diff appears when you Re-run a test: each step's screenshot is compared with the same step of the original run.</Empty>;
  }
  const p = diff.payload || {};
  const same = p.diff_percent === 0;
  return (
    <div className="space-y-2 text-xs">
      <div className={`font-mono ${same ? 'text-emerald-500' : 'text-amber-500'}`}>
        {same ? 'No visual change' : `${p.diff_percent}% of pixels changed`} vs {p.baseline_run_id}{p.size_changed ? ' (page size changed)' : ''}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><span className={`text-[10px] font-mono ${muted}`}>BASELINE ({p.baseline_run_id})</span><img src={evidenceFileUrl(`/evidence/files/${p.baseline_artifact_id}`)} alt="Baseline screenshot" className="w-full rounded-lg border border-slate-700/40" /></div>
        <div className="space-y-1"><span className={`text-[10px] font-mono ${muted}`}>DIFF (changed pixels in red)</span><img src={evidenceFileUrl(diff.file_url)} alt="Visual diff" className="w-full rounded-lg border border-slate-700/40" /></div>
      </div>
    </div>
  );
};

export default EvidencePanel;
