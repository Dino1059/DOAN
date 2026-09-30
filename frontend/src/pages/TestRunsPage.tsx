// @ts-nocheck
import React from 'react';
import { listTestRuns, getTestRunFilters, getTestRun, formatStarted } from '../api';
import { runStatusClass, stepStatusClass, stepIcon } from '../components/runStatus';
import { EvidencePanel, EVIDENCE_TABS } from '../components/EvidencePanel';

const runPageSize = 8;
const DATE_RANGES = { 'All time': '', 'Last 24 hours': '24h', 'Last 7 days': '7d', 'Last 30 days': '30d' };

// Lọc, tìm kiếm và phân trang làm ở server (GET /test-runs, M5).
// refreshKey đổi (vd: 1 run vừa kết thúc) → tải lại trang hiện tại.
export const TestRunsPage = ({ isLight, setSelectedRun, setActiveModule, onRerun, refreshKey }) => {
  const [runSearch, setRunSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [runStatusFilter, setRunStatusFilter] = React.useState('All');
  const [runSuiteFilter, setRunSuiteFilter] = React.useState('All');
  const [runEnvironmentFilter, setRunEnvironmentFilter] = React.useState('All');
  const [runBrowserFilter, setRunBrowserFilter] = React.useState('All');
  const [runDateFilter, setRunDateFilter] = React.useState('All time');
  const [runPage, setRunPage] = React.useState(1);
  const [selectedRunIds, setSelectedRunIds] = React.useState([]);

  const [runs, setRuns] = React.useState([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');
  const [options, setOptions] = React.useState({ statuses: [], suites: [], envs: [], browsers: [] });

  // Gõ tìm kiếm: chờ 300ms mới gọi API
  React.useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(runSearch.trim()); setRunPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [runSearch]);

  React.useEffect(() => {
    getTestRunFilters().then(setOptions).catch(() => {});
  }, [refreshKey]);

  React.useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listTestRuns({
      q: debouncedSearch,
      status: runStatusFilter === 'All' ? '' : runStatusFilter,
      suite: runSuiteFilter === 'All' ? '' : runSuiteFilter,
      env: runEnvironmentFilter === 'All' ? '' : runEnvironmentFilter,
      browser: runBrowserFilter === 'All' ? '' : runBrowserFilter,
      date_range: DATE_RANGES[runDateFilter],
      page: runPage,
      page_size: runPageSize,
    })
      .then(page => {
        if (cancelled) return;
        setRuns(page.items);
        setTotal(page.total);
        setLoadError('');
      })
      .catch(err => { if (!cancelled) setLoadError(err.message || 'Backend is offline — cannot load test runs.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, runStatusFilter, runSuiteFilter, runEnvironmentFilter, runBrowserFilter, runDateFilter, runPage, refreshKey]);

  const runPageCount = Math.max(1, Math.ceil(total / runPageSize));
  const allVisibleRunsSelected = runs.length > 0 && runs.every(run => selectedRunIds.includes(run.id));

  return (
    <>
    {/* TEST RUNS MANAGEMENT */}
    <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}>
      <div className="flex items-center justify-between gap-4">
        <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Test Runs — Execution History</h2>
        <button onClick={() => setActiveModule('new-test')} className="bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-slate-800">+ New Test</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 justify-between">
        <input
          value={runSearch}
          onChange={(e) => setRunSearch(e.target.value)}
          placeholder="⌕ Search by name / Run ID..."
          className={`w-full lg:max-w-xs rounded-full border px-4 py-2.5 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`}
        />
        <div className="flex flex-wrap gap-2">
          {[
            ['Status', runStatusFilter, setRunStatusFilter, ['All', ...options.statuses]],
            ['Suite', runSuiteFilter, setRunSuiteFilter, ['All', ...options.suites]],
            ['Environment', runEnvironmentFilter, setRunEnvironmentFilter, ['All', ...options.envs]],
            ['Browser', runBrowserFilter, setRunBrowserFilter, ['All', ...options.browsers]]
          ].map(([label, value, setter, choices]) => (
            <select key={label} value={value} onChange={(e) => { setter(e.target.value); setRunPage(1); }} className={`rounded-xl border px-3 py-2 text-sm cursor-pointer ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}>
              {choices.map(option => <option key={option} value={option}>{label}: {option}</option>)}
            </select>
          ))}
          <select value={runDateFilter} onChange={(e) => { setRunDateFilter(e.target.value); setRunPage(1); }} className={`rounded-xl border px-3 py-2 text-sm cursor-pointer ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}>
            {Object.keys(DATE_RANGES).map(label => <option key={label}>{label}</option>)}
          </select>
        </div>
      </div>

      {loadError && <p className="text-sm text-rose-500">{loadError}</p>}

      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full min-w-[1100px] text-left text-sm border-collapse">
          <thead>
            <tr className={`border-b ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-white/50'} font-mono text-[11px]`}>
              <th className="py-3 px-3"><input type="checkbox" checked={allVisibleRunsSelected} onChange={(e) => setSelectedRunIds(e.target.checked ? [...new Set([...selectedRunIds, ...runs.map(run => run.id)])] : selectedRunIds.filter(id => !runs.some(run => run.id === id)))} className="h-4 w-4 cursor-pointer" /></th>
              <th className="py-3 px-3">RUN ID</th><th className="py-3 px-3">NAME</th><th className="py-3 px-3">SUITE</th><th className="py-3 px-3">ENV</th><th className="py-3 px-3">BROWSER</th><th className="py-3 px-3">STATUS</th><th className="py-3 px-3">DURATION</th><th className="py-3 px-3">STEPS P/F</th><th className="py-3 px-3">STARTED</th><th className="py-3 px-3 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
            {runs.map((run) => (
              <tr key={run.id} className={`${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'} transition-colors`}>
                <td className="py-3.5 px-3"><input type="checkbox" checked={selectedRunIds.includes(run.id)} onChange={(e) => setSelectedRunIds(e.target.checked ? [...selectedRunIds, run.id] : selectedRunIds.filter(id => id !== run.id))} className="h-4 w-4 cursor-pointer" /></td>
                <td className="py-3.5 px-3 font-mono font-medium"><button onClick={() => setSelectedRun(run)} className="text-emerald-500 hover:text-emerald-600 hover:underline cursor-pointer">{run.id}</button></td>
                <td className="py-3.5 px-3 font-medium">{run.name}</td><td className="py-3.5 px-3 opacity-70">{run.suite}</td><td className="py-3.5 px-3 opacity-70 font-mono text-xs">{run.env}</td><td className="py-3.5 px-3 opacity-70">{run.browser}</td>
                <td className="py-3.5 px-3"><span className={`px-2.5 py-1 rounded-full text-xs font-mono ${runStatusClass(run.status)}`}>{run.status}</span></td>
                <td className="py-3.5 px-3 font-mono opacity-70">{run.duration || '—'}</td><td className="py-3.5 px-3 font-mono">{run.passedSteps}/{run.failedSteps}</td><td className="py-3.5 px-3 opacity-70">{run.startTime}</td>
                <td className="py-3.5 px-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelectedRun(run)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/20 text-white/80 hover:bg-white/10'}`}>View</button><button onClick={() => onRerun(run)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/20 text-white/80 hover:bg-white/10'}`}>Re-run</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && runs.length === 0 && !loadError && (
          <div className={`py-12 text-center text-sm ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            {total === 0 && !debouncedSearch && runStatusFilter === 'All' && runSuiteFilter === 'All' && runEnvironmentFilter === 'All' && runBrowserFilter === 'All' && runDateFilter === 'All time'
              ? 'No test runs yet — generate a plan in New Test and click "Confirm & Run".'
              : 'No test runs match the selected filters.'}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <span className={isLight ? 'text-slate-500' : 'text-white/60'}>Showing {total === 0 ? 0 : (runPage - 1) * runPageSize + 1}–{Math.min(runPage * runPageSize, total)} / {total}</span>
        <div className="flex items-center gap-2"><button disabled={runPage === 1} onClick={() => setRunPage(page => Math.max(1, page - 1))} className={`rounded-xl border px-3 py-2 cursor-pointer disabled:opacity-40 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>‹ Prev</button><span className="px-2 font-mono">{runPage} / {runPageCount}</span><button disabled={runPage >= runPageCount} onClick={() => setRunPage(page => Math.min(runPageCount, page + 1))} className={`rounded-xl border px-3 py-2 cursor-pointer disabled:opacity-40 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>Next ›</button></div>
      </div>
    </section>
    </>
  );
};

// Run detail modal — mở từ Dashboard và Test Runs. Đọc GET /test-runs/{id}: bước thật, observation, OTP đã hỏi.
export const RunDetailModal = ({
  isLight,
  run,
  onClose,
  selectedEvidenceStepId,
  setSelectedEvidenceStepId,
  evidenceTab,
  setEvidenceTab
}) => {
  const [detail, setDetail] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!run) return;
    let cancelled = false;
    setDetail(null);
    setError('');
    getTestRun(run.id)
      .then(data => {
        if (cancelled) return;
        setDetail(data);
        setEvidenceTab('agent');
        // Mặc định chọn bước lỗi đầu tiên, không có thì bước 1
        const firstFailed = data.steps.find(s => s.status === 'failed');
        setSelectedEvidenceStepId((firstFailed || data.steps[0])?.id ?? 1);
      })
      .catch(err => { if (!cancelled) setError(err.message || 'Unable to load this run.'); });
    return () => { cancelled = true; };
  }, [run?.id]);

  if (!run) return null;

  const steps = detail?.steps || [];
  const selectedStep = steps.find(s => s.id === selectedEvidenceStepId);
  const stepInterventions = (detail?.interventions || []).filter(i => i.step_no === selectedStep?.step_no);
  const muted = isLight ? 'text-slate-500' : 'text-white/60';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Run details for ${run.id}`}
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[1.5rem] border p-6 shadow-2xl ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-white/15 text-white'}`}
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className={`text-xs font-mono uppercase tracking-wider ${muted}`}>// Run Details</div>
            <h2 className="font-heading text-2xl font-semibold">{detail?.name || run.name}</h2>
            <div className={`mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono ${muted}`}>
              <span>{run.id}</span>
              {detail && <span className={`px-2 py-0.5 rounded-full ${runStatusClass(detail.status)}`}>{detail.status}</span>}
              <span>{detail?.env || run.env}</span>
              <span>{detail?.browser || run.browser}</span>
              <span>{detail?.duration || run.duration}</span>
              {detail && <span>Started {formatStarted(detail.created_at)}</span>}
              {detail?.runner === 'simulated' && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">Simulated run</span>}
              {detail?.rerun_of && <span>Re-run of {detail.rerun_of}</span>}
            </div>
            {detail?.error_message && <p className="mt-2 text-sm text-rose-500">{detail.error_message}</p>}
          </div>
          <button onClick={onClose} className={`rounded-full px-3 py-1 text-sm cursor-pointer ${isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}>✕ Close</button>
        </div>

        {error && <p className="text-sm text-rose-500 mb-4">{error}</p>}
        {!detail && !error && <p className={`text-sm mb-4 ${muted}`}>Loading run details…</p>}

        {detail && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3">
            <div className={`text-xs font-mono uppercase tracking-wider ${muted}`}>// Step Timeline ({detail.passed_steps} passed / {detail.failed_steps} failed)</div>
            {steps.map((step) => {
              const isSelected = selectedEvidenceStepId === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setSelectedEvidenceStepId(step.id)}
                  className={`w-full p-3 rounded-2xl border text-left cursor-pointer transition-colors flex items-center justify-between gap-3 ${isSelected ? (isLight ? 'border-slate-700 bg-white' : 'border-white/50 bg-white/10') : (isLight ? 'border-slate-300 bg-white hover:bg-slate-100' : 'border-white/15 bg-white/5 hover:bg-white/10')}`}
                >
                  <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-mono border ${stepStatusClass(step.status)}`}>
                    {stepIcon(step.status, step.step_no)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{step.action}</span>
                    <span className={`block text-[11px] font-mono truncate ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{step.selector}</span>
                  </span>
                  <span className={`shrink-0 text-[11px] rounded-full px-2 py-1 capitalize ${stepStatusClass(step.status)}`}>{step.status}</span>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8">
            <div className={`inline-flex items-center gap-1 rounded-full p-1 mb-4 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}>
              {EVIDENCE_TABS.map(tab => (
                <button key={tab.id} onClick={() => setEvidenceTab(tab.id)} className={`rounded-full px-3 py-2 text-xs cursor-pointer ${evidenceTab === tab.id ? (isLight ? 'bg-slate-900 text-white' : 'bg-white text-black') : (isLight ? 'text-slate-600' : 'text-white/60')}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className={`min-h-[360px] rounded-2xl border p-6 ${isLight ? 'border-slate-300 bg-white' : 'border-white/15 bg-white/5'}`}>
              {selectedStep && evidenceTab === 'agent' && (
                <div className="space-y-4 text-sm">
                  <div>
                    <div className={`text-xs font-mono mb-1 ${muted}`}>STEP {selectedStep.step_no} · {selectedStep.action}</div>
                    <div className="font-mono text-xs break-all">Target: {selectedStep.selector || '—'}</div>
                    <div className="font-mono text-xs">Expected: {selectedStep.expected || '—'}</div>
                    {selectedStep.duration_ms != null && <div className={`font-mono text-xs ${muted}`}>Duration: {(selectedStep.duration_ms / 1000).toFixed(1)}s</div>}
                  </div>
                  <div>
                    <div className={`text-xs font-mono mb-1 ${muted}`}>// AGENT OBSERVATION</div>
                    <p className="leading-relaxed">{selectedStep.observation || (selectedStep.status === 'skipped' ? 'Step was skipped (run stopped or failed earlier).' : 'No observation recorded for this step.')}</p>
                  </div>
                  {stepInterventions.map((i, idx) => (
                    <div key={idx} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                      <div className="text-xs font-mono text-amber-600 mb-1">⚠️ HUMAN INTERVENTION</div>
                      <p>{i.question}</p>
                      <p className={`text-xs font-mono mt-1 ${muted}`}>
                        {i.answered_at ? `Answer: ${i.answer ?? (i.decision || 'closed without an answer')}` : 'Still waiting for an answer'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {selectedStep && evidenceTab === 'agent' && <div className="mt-4" />}
              {selectedStep && (
                <EvidencePanel isLight={isLight} runId={run.id} stepNo={selectedStep.step_no} tab={evidenceTab} refreshKey={selectedStep.status} />
              )}
              {!selectedStep && <span className={`text-sm ${muted}`}>This run has no steps.</span>}
            </div>
          </div>
        </div>
        )}
      </section>
    </div>
  );
};

export default TestRunsPage;
