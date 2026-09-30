// @ts-nocheck
import React from 'react';
import { InitialReports } from '../mockData';
import { createEnvironment, deleteEnvironment, listEnvironments, testEnvironmentConnection, updateEnvironment } from '../api';

// Temporary home for modules without backend APIs yet — split into pages/XxxPage.tsx once each gets an API.

const BROWSER_OPTIONS = [['chromium', 'Chromium'], ['firefox', 'Firefox'], ['webkit', 'WebKit'], ['headless_node', 'Headless Node']];
const LLM_OPTIONS = [['openai', 'OpenAI'], ['google', 'Gemini'], ['anthropic', 'Anthropic'], ['openrouter', 'OpenRouter'], ['deepseek', 'DeepSeek'], ['azure', 'Azure'], ['hub1', 'Hub1']];
const EMPTY_FORM = { name: '', base_url: '', browser: 'chromium', headless: true, llm_provider: 'openai', llm_model: 'gpt-4o-mini' };

export const EnvironmentsPage = ({ isLight }) => {
  const [environments, setEnvironments] = React.useState([]);
  const [environmentForm, setEnvironmentForm] = React.useState(EMPTY_FORM);
  const [editingEnvironmentId, setEditingEnvironmentId] = React.useState(null);
  const [environmentNotice, setEnvironmentNotice] = React.useState('');
  const [environmentError, setEnvironmentError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const loadEnvironments = () => listEnvironments().then(setEnvironments).catch(err => setEnvironmentError(err.message));

  React.useEffect(() => { loadEnvironments(); }, []);

  const openEnvironmentForm = (environment = null) => {
    setEditingEnvironmentId(environment?.id || null);
    setEnvironmentForm(environment ? {
      name: environment.name, base_url: environment.base_url, browser: environment.browser,
      headless: environment.headless, llm_provider: environment.llm_provider, llm_model: environment.llm_model,
    } : EMPTY_FORM);
    setEnvironmentNotice('');
    setEnvironmentError('');
  };

  const saveEnvironment = async () => {
    if (!environmentForm.name.trim() || !environmentForm.base_url.trim()) return;
    setBusy(true);
    setEnvironmentError('');
    try {
      if (editingEnvironmentId) {
        await updateEnvironment(editingEnvironmentId, environmentForm);
        setEnvironmentNotice('Environment updated successfully.');
      } else {
        await createEnvironment(environmentForm);
        setEnvironmentNotice('Environment added successfully.');
        openEnvironmentForm();
      }
      await loadEnvironments();
    } catch (err) {
      setEnvironmentError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeEnvironment = async (id) => {
    setBusy(true);
    setEnvironmentError('');
    try {
      await deleteEnvironment(id);
      if (editingEnvironmentId === id) openEnvironmentForm();
      await loadEnvironments();
    } catch (err) {
      setEnvironmentError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const runTestConnection = async () => {
    if (!editingEnvironmentId) {
      setEnvironmentError('Save the environment first, then Test Connection.');
      return;
    }
    setBusy(true);
    try {
      const result = await testEnvironmentConnection(editingEnvironmentId);
      setEnvironmentNotice(`${result.status === 'connected' ? 'Connected' : 'Connection failed'}: ${result.detail}`);
      await loadEnvironments();
    } catch (err) {
      setEnvironmentError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
      <div className={`xl:col-span-7 liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Environments — Target Environments</h2>
          <button onClick={() => openEnvironmentForm()} className="bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-slate-800">+ Add Environment</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr className={`border-b ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-white/50'} text-xs uppercase tracking-wide`}><th className="py-3 px-2">Name</th><th className="py-3 px-2">Base URL</th><th className="py-3 px-2">Browser</th><th className="py-3 px-2">LLM Provider</th><th className="py-3 px-2">Status</th><th className="py-3 px-2"></th></tr></thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
              {environments.map(environment => (
                <tr key={environment.id} className={`${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}>
                  <td className="py-4 px-2 font-medium">{environment.name}</td><td className="py-4 px-2 font-mono text-xs opacity-70">{environment.base_url.replace(/^https?:\/\//, '')}</td><td className="py-4 px-2">{BROWSER_OPTIONS.find(([v]) => v === environment.browser)?.[1] || environment.browser}</td><td className="py-4 px-2">{LLM_OPTIONS.find(([v]) => v === environment.llm_provider)?.[1] || environment.llm_provider}</td>
                  <td className="py-4 px-2">{environment.last_check_status ? <span className={`rounded-full border px-2.5 py-1 text-xs ${environment.last_check_status === 'connected' ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-600' : 'border-rose-400/50 bg-rose-500/10 text-rose-600'}`}>{environment.last_check_status === 'connected' ? 'Connected' : 'Connection Error'}</span> : <span className="text-xs opacity-50">Not tested</span>}</td>
                  <td className="py-4 px-2 text-right"><div className="flex justify-end gap-2"><button onClick={() => openEnvironmentForm(environment)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Edit</button><button onClick={() => removeEnvironment(environment.id)} disabled={busy} className="rounded-xl border border-rose-400/50 text-rose-600 px-3 py-1.5 text-xs cursor-pointer hover:bg-rose-500/10 disabled:opacity-50">Delete</button></div></td>
                </tr>
              ))}
              {environments.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm opacity-60">No environments yet. Add one to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`xl:col-span-5 liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
        <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Add / Edit Environment</div>
        <h3 className={`font-heading text-2xl font-semibold mb-5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{editingEnvironmentId ? 'Edit Environment' : 'Add Environment'}</h3>
        <div className="space-y-4">
          <label className="block text-sm"><span className="block mb-1 opacity-70">Environment Name</span><input value={environmentForm.name} onChange={(e) => setEnvironmentForm({ ...environmentForm, name: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label>
          <label className="block text-sm"><span className="block mb-1 opacity-70">Base URL</span><input value={environmentForm.base_url} onChange={(e) => setEnvironmentForm({ ...environmentForm, base_url: e.target.value })} placeholder="https://test.com" className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm"><span className="block mb-1 opacity-70">Browser</span><select value={environmentForm.browser} onChange={(e) => setEnvironmentForm({ ...environmentForm, browser: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{BROWSER_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
            <label className="block text-sm"><span className="block mb-1 opacity-70">Headless</span><select value={environmentForm.headless ? 'on' : 'off'} onChange={(e) => setEnvironmentForm({ ...environmentForm, headless: e.target.value === 'on' })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}><option value="on">On</option><option value="off">Off</option></select></label>
          </div>
          <label className="block text-sm"><span className="block mb-1 opacity-70">Default LLM Provider</span><select value={environmentForm.llm_provider} onChange={(e) => setEnvironmentForm({ ...environmentForm, llm_provider: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{LLM_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
          <div className="flex items-center gap-3 pt-2"><button onClick={saveEnvironment} disabled={busy} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50">Save</button><button onClick={runTestConnection} disabled={busy} className={`rounded-xl border px-5 py-2.5 text-sm cursor-pointer disabled:opacity-50 ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Test Connection</button></div>
          {environmentNotice && <div className="text-sm text-emerald-600">{environmentNotice}</div>}
          {environmentError && <div className="text-sm text-rose-600">{environmentError}</div>}
        </div>
      </div>
    </section>
  );
};

export const SettingsPage = ({ isLight, user }) => {
  const [settingsTab, setSettingsTab] = React.useState('Profile');
  const [settingsNotice, setSettingsNotice] = React.useState('');

  return (
    <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border grid grid-cols-1 lg:grid-cols-12 gap-8`}>
      <aside className={`lg:col-span-3 lg:border-r lg:pr-6 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
        <nav className="space-y-1">{['Profile', 'API Keys & LLM Providers', 'Team & Members', 'Notifications', 'Appearance', 'Integrations'].map(tab => <button key={tab} onClick={() => setSettingsTab(tab)} className={`w-full rounded-xl px-4 py-3 text-left text-sm cursor-pointer ${settingsTab === tab ? (isLight ? 'bg-slate-200 text-slate-900 font-semibold' : 'bg-white/10 text-white font-semibold') : (isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-white/60 hover:bg-white/5')}`}>{tab}</button>)}</nav>
      </aside>
      <div className="lg:col-span-9">
        <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Settings</div>
        <h2 className={`font-heading text-2xl font-semibold mb-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>{settingsTab}</h2>
        {settingsTab === 'Profile' && <div className="space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><label className="text-sm"><span className="block mb-1 opacity-70">Username</span><input defaultValue={user.username} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label><label className="text-sm"><span className="block mb-1 opacity-70">Email</span><input defaultValue="admin@example.com" className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label><label className="text-sm"><span className="block mb-1 opacity-70">New Password</span><input type="password" placeholder="••••••••" className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label><label className="text-sm"><span className="block mb-1 opacity-70">Confirm Password</span><input type="password" placeholder="••••••••" className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label></div><button onClick={() => setSettingsNotice('Profile changes saved.')} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer">Save Changes</button></div>}
        {settingsTab === 'API Keys & LLM Providers' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[['GOOGLE_API_KEY (Gemini)', true], ['OPENAI_API_KEY', false], ['ANTHROPIC_API_KEY', false], ['HUB1_API_KEY', true]].map(([key, configured]) => <div key={key} className={`flex items-center justify-between gap-3 border-b border-dashed py-4 ${isLight ? 'border-slate-300' : 'border-white/10'}`}><span className="text-sm opacity-80">{key}</span><span className={`rounded-full border px-3 py-1 text-xs ${configured ? 'border-emerald-400/50 text-emerald-600 bg-emerald-500/10' : 'border-slate-400 text-slate-500'}`}>{configured ? 'Configured' : 'Not configured'}</span></div>)}</div>}
        {settingsTab !== 'Profile' && settingsTab !== 'API Keys & LLM Providers' && <div className={`rounded-2xl border border-dashed p-10 text-center text-sm ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/20 text-white/50'}`}>{settingsTab} settings are ready to configure.</div>}
        {settingsNotice && <div className="mt-4 text-sm text-emerald-600">{settingsNotice}</div>}
      </div>
    </section>
  );
};

export const ReportsPage = ({ isLight, recentRuns }) => {
  const [reports, setReports] = React.useState(InitialReports);
  const [reportSearch, setReportSearch] = React.useState('');
  const [reportFormatFilter, setReportFormatFilter] = React.useState('All');
  const [reportSuiteFilter, setReportSuiteFilter] = React.useState('All');
  const [reportDateFilter, setReportDateFilter] = React.useState('All time');
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [reportNotice, setReportNotice] = React.useState('');

  const reportSuites = ['All', ...new Set(reports.map(report => report.name.includes('Registration') ? 'Authentication' : 'E-Commerce'))];
  const filteredReports = reports.filter(report => {
    const query = reportSearch.trim().toLowerCase();
    const matchesDate = reportDateFilter === 'All time' || (reportDateFilter === 'Last 24 hours' && report.created.includes('min')) || (reportDateFilter === 'Last 7 days' && !report.created.includes('Yesterday')) || reportDateFilter === 'Last 30 days';
    return (!query || `${report.id} ${report.runId} ${report.name}`.toLowerCase().includes(query))
      && (reportFormatFilter === 'All' || report.format === reportFormatFilter)
      && (reportSuiteFilter === 'All' || (reportSuiteFilter === 'Authentication' ? report.name.includes('Registration') : report.name.includes('Coupon')))
      && matchesDate;
  });

  const generateReport = () => {
    const nextReport = { id: `RPT-${2202 + reports.length}`, runId: recentRuns[0]?.id || 'RUN-9421', format: 'Markdown', created: 'Just now', name: recentRuns[0]?.name || 'New Test Report', status: recentRuns[0]?.status || 'Passed', duration: recentRuns[0]?.duration || '12.5s', failedStep: '—' };
    setReports(items => [nextReport, ...items]);
    setReportNotice('Report generated successfully.');
  };

  return (
    <>
      <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}>
        <div className="flex items-center justify-between gap-4"><h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Reports — Test Reports</h2><button onClick={generateReport} className="bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-slate-800">+ Generate Report</button></div>
        <div className="flex flex-col lg:flex-row gap-3 justify-between"><input value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="⌕ Search reports..." className={`w-full lg:max-w-xs rounded-full border px-4 py-2.5 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`} /><div className="flex flex-wrap gap-2"><select value={reportFormatFilter} onChange={(e) => setReportFormatFilter(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}><option>All</option><option>Markdown</option><option>PDF</option></select><select value={reportSuiteFilter} onChange={(e) => setReportSuiteFilter(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}>{reportSuites.map(suite => <option key={suite}>{suite}</option>)}</select><select value={reportDateFilter} onChange={(e) => setReportDateFilter(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}><option>All time</option><option>Last 24 hours</option><option>Last 7 days</option><option>Last 30 days</option></select></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className={`border-b ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-white/50'} text-xs uppercase tracking-wide`}><th className="py-3 px-3">Report ID</th><th className="py-3 px-3">Linked Run</th><th className="py-3 px-3">Format</th><th className="py-3 px-3">Created</th><th className="py-3 px-3 text-right">Actions</th></tr></thead><tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>{filteredReports.map(report => <tr key={report.id} className={`${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}><td className="py-4 px-3 font-mono font-medium">{report.id}</td><td className="py-4 px-3 text-emerald-500">{report.runId}</td><td className="py-4 px-3">{report.format}</td><td className="py-4 px-3 opacity-70">{report.created}</td><td className="py-4 px-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelectedReport(report)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>View</button><button onClick={() => setReportNotice(`${report.format} report ${report.id} is ready to download.`)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Download</button></div></td></tr>)}</tbody></table>{filteredReports.length === 0 && <div className="py-10 text-center text-sm opacity-60">No reports match the selected filters.</div>}</div>
        {reportNotice && <div className="text-sm text-emerald-600">{reportNotice}</div>}
      </section>
      {selectedReport && <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}><div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Report Detail</div><h3 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedReport.id} · {selectedReport.name}</h3><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5"><div className="space-y-3 text-sm"><div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Result</span><span className={selectedReport.status === 'Passed' ? 'text-emerald-600' : 'text-rose-600'}>{selectedReport.status}</span></div><div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Duration</span><span>{selectedReport.duration}</span></div><div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Failed Step</span><span>{selectedReport.failedStep}</span></div><button onClick={() => setReportNotice(`PDF export started for ${selectedReport.id}.`)} className="rounded-xl border px-4 py-2 cursor-pointer">Download PDF</button><button onClick={() => setReportNotice('Report share link copied.')} className="rounded-xl border px-4 py-2 ml-2 cursor-pointer">Share</button></div><div className={`lg:col-span-2 min-h-[240px] rounded-2xl border-2 border-dashed flex items-center justify-center text-center p-5 ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)] text-slate-500' : 'border-white/30 text-white/60'}`}>Markdown/PDF report preview with summary and evidence library</div></div></section>}
    </>
  );
};

export const ComparisonsPage = ({ isLight, recentRuns }) => {
  const [comparisonRunA, setComparisonRunA] = React.useState('RUN-9419');
  const [comparisonRunB, setComparisonRunB] = React.useState('RUN-9420');
  const [comparisonReady, setComparisonReady] = React.useState(false);

  return (
    <>
      <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}><h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Comparisons — Compare Two Runs</h2><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><label className="text-sm"><span className="block mb-1 opacity-70">Run A (Baseline)</span><select value={comparisonRunA} onChange={(e) => { setComparisonRunA(e.target.value); setComparisonReady(false); }} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{recentRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {run.name}</option>)}</select></label><label className="text-sm"><span className="block mb-1 opacity-70">Run B (Candidate)</span><select value={comparisonRunB} onChange={(e) => { setComparisonRunB(e.target.value); setComparisonReady(false); }} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{recentRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {run.name}</option>)}</select></label></div><button onClick={() => setComparisonReady(true)} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer">Compare</button></section>
      {comparisonReady && <><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[['Result', 'Pass → Pass'], ['Time Difference', '+3.2s'], ['Changed Steps', '2 / 8'], ['Visual Difference', '1 region']].map(([label, value]) => <div key={label} className={`liquid-glass-strong rounded-2xl border p-5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}><div className="text-xs uppercase tracking-wide opacity-60">{label}</div><div className="font-heading text-2xl mt-2">{value}</div></div>)}</div><section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}><div className={`text-xs font-mono uppercase tracking-wider mb-4 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Step Differences</div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-slate-300 text-xs uppercase tracking-wide opacity-70"><th className="py-3 px-3">#</th><th className="py-3 px-3">Action</th><th className="py-3 px-3">Run A</th><th className="py-3 px-3">Run B</th><th className="py-3 px-3">Status</th></tr></thead><tbody><tr className="border-b border-slate-200"><td className="py-4 px-3">1</td><td className="py-4 px-3">Open URL</td><td className="py-4 px-3 rounded-xl bg-emerald-500/10 text-emerald-600">Passed</td><td className="py-4 px-3 rounded-xl bg-emerald-500/10 text-emerald-600">Passed</td><td className="py-4 px-3">No change</td></tr><tr><td className="py-4 px-3">5</td><td className="py-4 px-3">Apply Coupon</td><td className="py-4 px-3 rounded-xl bg-emerald-500/10 text-emerald-600">Passed · $10 off</td><td className="py-4 px-3 rounded-xl bg-rose-500/10 text-rose-600">Failed · $0 off</td><td className="py-4 px-3 text-rose-600">⚠ Difference</td></tr></tbody></table></div></section><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><section className={`liquid-glass-strong rounded-[1.5rem] p-6 border ${isLight ? 'border-slate-200' : 'border-white/10'}`}><div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-3">// Visual Diff</div><div className={`h-56 rounded-2xl border-2 border-dashed flex items-center justify-center text-sm opacity-60 ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)]' : 'border-white/30'}`}>Run A / Run B overlay comparison</div></section><section className={`liquid-glass-strong rounded-[1.5rem] p-6 border ${isLight ? 'border-slate-200' : 'border-white/10'}`}><div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-3">// API Response Diff</div><div className={`h-56 rounded-2xl border-2 border-dashed flex items-center justify-center text-sm opacity-60 ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)]' : 'border-white/30'}`}>JSON diff — highlight changed fields</div></section></div></>}
    </>
  );
};
