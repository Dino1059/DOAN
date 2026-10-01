// @ts-nocheck
import React from 'react';
import {
  API_BASE, changePassword, createEnvironment, deleteApiKey, deleteComparison, deleteEnvironment, deleteReport,
  diffRuns, downloadReport, generateReport, getProfile, getReport, listApiKeys, listComparisons, listEnvironments,
  listReports, saveComparison, setApiKey, shareComparison, shareReport, testEnvironmentConnection, unshareComparison,
  unshareReport, updateEnvironment, updateProfile,
} from '../api';

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

const PROVIDER_LABELS = {
  google: 'GOOGLE_API_KEY (Gemini)', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY',
  openrouter: 'OPENROUTER_API_KEY', deepseek: 'DEEPSEEK_API_KEY', azure: 'AZURE_API_KEY', hub1: 'HUB1_API_KEY',
};

export const SettingsPage = ({ isLight, user, theme, onThemeChange }) => {
  const [settingsTab, setSettingsTab] = React.useState('Profile');
  const [settingsNotice, setSettingsNotice] = React.useState('');
  const [settingsError, setSettingsError] = React.useState('');

  const [profile, setProfile] = React.useState(null);
  const [profileForm, setProfileForm] = React.useState({ display_name: '', email: '' });
  const [passwordForm, setPasswordForm] = React.useState({ current: '', next: '', confirm: '' });

  const [apiKeys, setApiKeys] = React.useState([]);
  const [keyDrafts, setKeyDrafts] = React.useState({});
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    getProfile().then(p => { setProfile(p); setProfileForm({ display_name: p.display_name, email: p.email }); }).catch(err => setSettingsError(err.message));
    listApiKeys().then(setApiKeys).catch(err => setSettingsError(err.message));
  }, []);

  const notify = (fn, ...args) => {
    setBusy(true);
    setSettingsError('');
    return fn(...args).finally(() => setBusy(false));
  };

  const saveProfile = () => {
    notify(updateProfile, profileForm)
      .then(p => { setProfile(p); setSettingsNotice('Profile changes saved.'); })
      .catch(err => setSettingsError(err.message));
  };

  const savePassword = () => {
    if (!passwordForm.next || passwordForm.next !== passwordForm.confirm) {
      setSettingsError('New password and confirmation do not match.');
      return;
    }
    notify(changePassword, passwordForm.current, passwordForm.next)
      .then(() => { setPasswordForm({ current: '', next: '', confirm: '' }); setSettingsNotice('Password changed. Other devices were signed out.'); })
      .catch(err => setSettingsError(err.message));
  };

  const saveApiKey = (provider) => {
    const value = keyDrafts[provider];
    if (!value || value.trim().length < 8) { setSettingsError('API key looks too short.'); return; }
    notify(setApiKey, provider, value.trim())
      .then(updated => {
        setApiKeys(keys => keys.map(k => k.provider === provider ? updated : k));
        setKeyDrafts(d => ({ ...d, [provider]: '' }));
        setSettingsNotice(`${PROVIDER_LABELS[provider]} saved.`);
      })
      .catch(err => setSettingsError(err.message));
  };

  const removeApiKey = (provider) => {
    notify(deleteApiKey, provider)
      .then(() => {
        setApiKeys(keys => keys.map(k => k.provider === provider ? { ...k, configured: false, last4: null } : k));
        setSettingsNotice(`${PROVIDER_LABELS[provider]} removed.`);
      })
      .catch(err => setSettingsError(err.message));
  };

  const inputClass = `w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`;

  return (
    <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border grid grid-cols-1 lg:grid-cols-12 gap-8`}>
      <aside className={`lg:col-span-3 lg:border-r lg:pr-6 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
        <nav className="space-y-1">{['Profile', 'API Keys & LLM Providers', 'Team & Members', 'Notifications', 'Appearance', 'Integrations'].map(tab => <button key={tab} onClick={() => { setSettingsTab(tab); setSettingsNotice(''); setSettingsError(''); }} className={`w-full rounded-xl px-4 py-3 text-left text-sm cursor-pointer ${settingsTab === tab ? (isLight ? 'bg-slate-200 text-slate-900 font-semibold' : 'bg-white/10 text-white font-semibold') : (isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-white/60 hover:bg-white/5')}`}>{tab}</button>)}</nav>
      </aside>
      <div className="lg:col-span-9">
        <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Settings</div>
        <h2 className={`font-heading text-2xl font-semibold mb-6 ${isLight ? 'text-slate-900' : 'text-white'}`}>{settingsTab}</h2>

        {settingsTab === 'Profile' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="text-sm"><span className="block mb-1 opacity-70">Username</span><input disabled value={user.username} className={`${inputClass} opacity-60`} /></label>
                <label className="text-sm"><span className="block mb-1 opacity-70">Display Name</span><input value={profileForm.display_name} onChange={e => setProfileForm({ ...profileForm, display_name: e.target.value })} className={inputClass} /></label>
                <label className="text-sm md:col-span-2"><span className="block mb-1 opacity-70">Email</span><input value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} className={inputClass} /></label>
              </div>
              <button onClick={saveProfile} disabled={busy || !profile} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50">Save Changes</button>
            </div>
            <div className={`space-y-4 border-t pt-6 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <h3 className="text-sm font-semibold opacity-80">Change Password</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="text-sm"><span className="block mb-1 opacity-70">Current Password</span><input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} placeholder="••••••••" className={inputClass} /></label>
                <label className="text-sm"><span className="block mb-1 opacity-70">New Password</span><input type="password" value={passwordForm.next} onChange={e => setPasswordForm({ ...passwordForm, next: e.target.value })} placeholder="••••••••" className={inputClass} /></label>
                <label className="text-sm"><span className="block mb-1 opacity-70">Confirm Password</span><input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })} placeholder="••••••••" className={inputClass} /></label>
              </div>
              <button onClick={savePassword} disabled={busy || !passwordForm.current || !passwordForm.next} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50">Change Password</button>
            </div>
          </div>
        )}

        {settingsTab === 'API Keys & LLM Providers' && (
          <div className="space-y-3">
            {apiKeys.map(({ provider, configured, last4 }) => (
              <div key={provider} className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dashed py-4 ${isLight ? 'border-slate-300' : 'border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-sm opacity-80">{PROVIDER_LABELS[provider] || provider}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs ${configured ? 'border-emerald-400/50 text-emerald-600 bg-emerald-500/10' : 'border-slate-400 text-slate-500'}`}>{configured ? `Configured (…${last4})` : 'Not configured'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input value={keyDrafts[provider] || ''} onChange={e => setKeyDrafts({ ...keyDrafts, [provider]: e.target.value })} placeholder={configured ? 'Replace key…' : 'sk-…'} className={`rounded-xl border px-3 py-2 text-xs w-48 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} />
                  <button onClick={() => saveApiKey(provider)} disabled={busy} className="rounded-xl border px-3 py-1.5 text-xs cursor-pointer disabled:opacity-50">Save</button>
                  {configured && <button onClick={() => removeApiKey(provider)} disabled={busy} className="rounded-xl border border-rose-400/50 text-rose-600 px-3 py-1.5 text-xs cursor-pointer disabled:opacity-50">Remove</button>}
                </div>
              </div>
            ))}
          </div>
        )}

        {settingsTab === 'Appearance' && (
          <div className="space-y-4">
            <p className="text-sm opacity-70">Theme applies immediately and is remembered for your account.</p>
            <div className="flex gap-3">
              {['light', 'dark'].map(t => (
                <button key={t} onClick={() => onThemeChange(t)} className={`rounded-xl border px-5 py-2.5 text-sm capitalize cursor-pointer ${theme === t ? (isLight ? 'bg-slate-900 text-white' : 'bg-white text-black') : (isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10')}`}>{t} mode</button>
              ))}
            </div>
          </div>
        )}

        {!['Profile', 'API Keys & LLM Providers', 'Appearance'].includes(settingsTab) && <div className={`rounded-2xl border border-dashed p-10 text-center text-sm ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/20 text-white/50'}`}>{settingsTab} settings are ready to configure.</div>}

        {settingsNotice && <div className="mt-4 text-sm text-emerald-600">{settingsNotice}</div>}
        {settingsError && <div className="mt-4 text-sm text-rose-600">{settingsError}</div>}
      </div>
    </section>
  );
};

export const ReportsPage = ({ isLight, recentRuns }) => {
  const [reports, setReports] = React.useState([]);
  const [reportSearch, setReportSearch] = React.useState('');
  const [reportFormatFilter, setReportFormatFilter] = React.useState('All');
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [preview, setPreview] = React.useState('');
  const [genRunId, setGenRunId] = React.useState('');
  const [genFormat, setGenFormat] = React.useState('markdown');
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    listReports({ format: reportFormatFilter === 'All' ? undefined : reportFormatFilter.toLowerCase() })
      .then(setReports).catch(err => setError(err.message));
  }, [reportFormatFilter]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { if (!genRunId && recentRuns[0]) setGenRunId(recentRuns[0].id); }, [recentRuns, genRunId]);

  const query = reportSearch.trim().toLowerCase();
  const filteredReports = reports.filter(r => !query || `${r.id} ${r.run_id} ${r.name}`.toLowerCase().includes(query));

  const handleGenerate = () => {
    if (!genRunId) { setError('Pick a run to generate a report from.'); return; }
    setBusy(true); setError('');
    generateReport(genRunId, genFormat)
      .then(report => { setNotice(`Report ${report.id} generated.`); load(); })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  };

  const openReport = (row) => {
    setError('');
    getReport(row.id).then(report => {
      setSelectedReport(report);
      setPreview('');
      if (report.format === 'markdown') {
        fetch(`${API_BASE}/reports/${report.id}/download`, { credentials: 'include' })
          .then(res => res.text()).then(setPreview).catch(() => {});
      }
    }).catch(err => setError(err.message));
  };

  const handleDownload = (row) => downloadReport(row.id, `${row.id}.${row.format === 'pdf' ? 'pdf' : 'md'}`).catch(err => setError(err.message));

  const handleShare = () => {
    shareReport(selectedReport.id)
      .then(({ share_path }) => {
        const url = `${API_BASE}${share_path}`;
        navigator.clipboard?.writeText(url).catch(() => {});
        setNotice(`Share link copied: ${url}`);
        setSelectedReport(r => ({ ...r, shared: true }));
      })
      .catch(err => setError(err.message));
  };

  const handleUnshare = () => {
    unshareReport(selectedReport.id)
      .then(() => { setNotice('Report is no longer shared.'); setSelectedReport(r => ({ ...r, shared: false })); })
      .catch(err => setError(err.message));
  };

  const handleDelete = (row) => {
    deleteReport(row.id).then(() => {
      setNotice(`Deleted ${row.id}.`);
      if (selectedReport?.id === row.id) setSelectedReport(null);
      load();
    }).catch(err => setError(err.message));
  };

  return (
    <>
      <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Reports — Test Reports</h2>
          <div className="flex items-center gap-2">
            <select value={genRunId} onChange={e => setGenRunId(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>
              {recentRuns.length === 0 && <option value="">No runs yet</option>}
              {recentRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {run.name}</option>)}
            </select>
            <select value={genFormat} onChange={e => setGenFormat(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>
              <option value="markdown">Markdown</option><option value="pdf">PDF</option>
            </select>
            <button onClick={handleGenerate} disabled={busy} className="bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-slate-800 disabled:opacity-50">+ Generate Report</button>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 justify-between">
          <input value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="⌕ Search reports..." className={`w-full lg:max-w-xs rounded-full border px-4 py-2.5 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`} />
          <select value={reportFormatFilter} onChange={(e) => setReportFormatFilter(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}><option>All</option><option>Markdown</option><option>Pdf</option></select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className={`border-b ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-white/50'} text-xs uppercase tracking-wide`}><th className="py-3 px-3">Report ID</th><th className="py-3 px-3">Linked Run</th><th className="py-3 px-3">Format</th><th className="py-3 px-3">Created</th><th className="py-3 px-3 text-right">Actions</th></tr></thead><tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>{filteredReports.map(report => <tr key={report.id} className={`${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}><td className="py-4 px-3 font-mono font-medium">{report.id}</td><td className="py-4 px-3 text-emerald-500">{report.run_id}</td><td className="py-4 px-3 capitalize">{report.format}</td><td className="py-4 px-3 opacity-70">{new Date(report.created_at).toLocaleString()}</td><td className="py-4 px-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => openReport(report)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>View</button><button onClick={() => handleDownload(report)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Download</button><button onClick={() => handleDelete(report)} className="rounded-xl border border-rose-400/50 text-rose-600 px-3 py-1.5 text-xs cursor-pointer hover:bg-rose-500/10">Delete</button></div></td></tr>)}</tbody></table>{filteredReports.length === 0 && <div className="py-10 text-center text-sm opacity-60">No reports match the selected filters.</div>}</div>
        {notice && <div className="text-sm text-emerald-600">{notice}</div>}
        {error && <div className="text-sm text-rose-600">{error}</div>}
      </section>
      {selectedReport && <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
        <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Report Detail</div>
        <h3 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedReport.id} · {selectedReport.name}</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Result</span><span className={selectedReport.result === 'Passed' ? 'text-emerald-600' : 'text-rose-600'}>{selectedReport.result}</span></div>
            <div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Duration</span><span>{selectedReport.duration}</span></div>
            <div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Failed Step</span><span>{selectedReport.failed_step}</span></div>
            <button onClick={() => handleDownload(selectedReport)} className="rounded-xl border px-4 py-2 cursor-pointer">Download {selectedReport.format}</button>
            {selectedReport.shared
              ? <button onClick={handleUnshare} className="rounded-xl border px-4 py-2 ml-2 cursor-pointer">Unshare</button>
              : <button onClick={handleShare} className="rounded-xl border px-4 py-2 ml-2 cursor-pointer">Share</button>}
          </div>
          <div className={`lg:col-span-2 min-h-[240px] max-h-[420px] overflow-auto rounded-2xl border p-4 text-xs font-mono whitespace-pre-wrap ${isLight ? 'border-slate-300 bg-white text-slate-700' : 'border-white/15 bg-black/30 text-white/80'}`}>
            {selectedReport.format === 'pdf' ? 'PDF format — click Download to view.' : (preview || 'Loading preview…')}
          </div>
        </div>
      </section>}
    </>
  );
};

export const ComparisonsPage = ({ isLight, recentRuns }) => {
  const [runA, setRunA] = React.useState('');
  const [runB, setRunB] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [saved, setSaved] = React.useState([]);
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const loadSaved = React.useCallback(() => { listComparisons().then(setSaved).catch(() => {}); }, []);
  React.useEffect(() => { loadSaved(); }, [loadSaved]);

  React.useEffect(() => {
    if (!runA && recentRuns[0]) setRunA(recentRuns[0].id);
    if (!runB && recentRuns[1]) setRunB(recentRuns[1].id);
  }, [recentRuns, runA, runB]);

  const handleCompare = () => {
    if (!runA || !runB) return;
    setBusy(true); setError(''); setNotice('');
    diffRuns(runA, runB).then(setResult).catch(err => { setError(err.message); setResult(null); }).finally(() => setBusy(false));
  };

  const handleSave = () => {
    saveComparison(runA, runB)
      .then(c => { setNotice(`Saved comparison ${c.id}.`); loadSaved(); })
      .catch(err => setError(err.message));
  };

  const handleOpenSaved = (c) => {
    setRunA(c.run_a_id); setRunB(c.run_b_id); setError(''); setNotice('');
    diffRuns(c.run_a_id, c.run_b_id).then(setResult).catch(err => setError(err.message));
  };

  const handleShareSaved = (c) => {
    shareComparison(c.id).then(({ share_path }) => {
      const url = `${API_BASE}${share_path}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      setNotice(`Share link copied: ${url}`);
      loadSaved();
    }).catch(err => setError(err.message));
  };

  const handleUnshareSaved = (c) => {
    unshareComparison(c.id).then(() => { setNotice('No longer shared.'); loadSaved(); }).catch(err => setError(err.message));
  };

  const handleDeleteSaved = (c) => {
    deleteComparison(c.id).then(() => { setNotice(`Deleted ${c.id}.`); loadSaved(); }).catch(err => setError(err.message));
  };

  const stepBadge = (status) => {
    if (!status) return <span className="opacity-40">—</span>;
    const ok = status === 'passed';
    return <span className={`rounded-xl px-2 py-1 ${ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{status}</span>;
  };

  return (
    <>
      <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}>
        <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Comparisons — Compare Two Runs</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="text-sm"><span className="block mb-1 opacity-70">Run A (Baseline)</span><select value={runA} onChange={(e) => { setRunA(e.target.value); setResult(null); }} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{recentRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {run.name}</option>)}</select></label>
          <label className="text-sm"><span className="block mb-1 opacity-70">Run B (Candidate)</span><select value={runB} onChange={(e) => { setRunB(e.target.value); setResult(null); }} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{recentRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {run.name}</option>)}</select></label>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleCompare} disabled={busy || !runA || !runB || runA === runB} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer disabled:opacity-50">Compare</button>
          {result && <button onClick={handleSave} className={`rounded-xl border px-5 py-2.5 text-sm cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Save Comparison</button>}
        </div>
        {runA === runB && runA && <div className="text-sm text-rose-600">Pick two different runs.</div>}
        {notice && <div className="text-sm text-emerald-600">{notice}</div>}
        {error && <div className="text-sm text-rose-600">{error}</div>}
      </section>

      {saved.length > 0 && (
        <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
          <div className={`text-xs font-mono uppercase tracking-wider mb-4 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Saved Comparisons</div>
          <div className="space-y-2">
            {saved.map(c => (
              <div key={c.id} className={`flex flex-wrap items-center justify-between gap-2 border-b border-dashed py-3 text-sm ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <div><span className="font-mono">{c.id}</span>{c.name && <span className="opacity-70"> · {c.name}</span>}<span className="opacity-50 ml-2 text-xs">{c.run_a_id} vs {c.run_b_id}</span></div>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenSaved(c)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Open</button>
                  {c.shared
                    ? <button onClick={() => handleUnshareSaved(c)} className="rounded-xl border px-3 py-1.5 text-xs cursor-pointer">Unshare</button>
                    : <button onClick={() => handleShareSaved(c)} className="rounded-xl border px-3 py-1.5 text-xs cursor-pointer">Share</button>}
                  <button onClick={() => handleDeleteSaved(c)} className="rounded-xl border border-rose-400/50 text-rose-600 px-3 py-1.5 text-xs cursor-pointer hover:bg-rose-500/10">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {result && <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[['Result', result.result], ['Time Difference', result.time_difference], ['Changed Steps', result.changed_steps], ['Visual Difference', result.visual_difference]].map(([label, value]) => (
            <div key={label} className={`liquid-glass-strong rounded-2xl border p-5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}><div className="text-xs uppercase tracking-wide opacity-60">{label}</div><div className="font-heading text-xl mt-2">{value}</div></div>
          ))}
        </div>
        <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
          <div className={`text-xs font-mono uppercase tracking-wider mb-4 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Step Differences</div>
          <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className={`border-b text-xs uppercase tracking-wide opacity-70 ${isLight ? 'border-slate-300' : 'border-white/10'}`}><th className="py-3 px-3">#</th><th className="py-3 px-3">Action</th><th className="py-3 px-3">Run A</th><th className="py-3 px-3">Run B</th><th className="py-3 px-3">Status</th></tr></thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>{result.steps.map(s => <tr key={s.step_no}><td className="py-4 px-3">{s.step_no}</td><td className="py-4 px-3">{s.action || '—'}</td><td className="py-4 px-3">{stepBadge(s.a_status)}</td><td className="py-4 px-3">{stepBadge(s.b_status)}</td><td className={`py-4 px-3 ${s.changed ? 'text-rose-600' : 'opacity-60'}`}>{s.changed ? '⚠ Difference' : 'No change'}</td></tr>)}</tbody>
          </table></div>
        </section>
        <section className={`liquid-glass-strong rounded-[1.5rem] p-6 border ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-3">// API Response Diff</div>
          {result.api_diff.length === 0 ? (
            <div className={`h-32 rounded-2xl border-2 border-dashed flex items-center justify-center text-sm opacity-60 ${isLight ? 'border-slate-400' : 'border-white/30'}`}>No API response checks recorded for these runs.</div>
          ) : (
            <div className="space-y-3 text-xs font-mono">
              {result.api_diff.map(d => (
                <div key={d.step_no} className={`rounded-xl border p-3 ${d.changed ? 'border-rose-400/50' : (isLight ? 'border-slate-200' : 'border-white/10')}`}>
                  <div className="mb-2 font-sans text-sm font-semibold">Step {d.step_no} {d.changed ? <span className="text-rose-600">⚠ changed</span> : <span className="opacity-60">no change</span>}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><div className="opacity-60 mb-1">Run A — {d.a?.status_code ?? '—'}</div><pre className="whitespace-pre-wrap break-all">{JSON.stringify(d.a?.response_body ?? null, null, 2)}</pre></div>
                    <div><div className="opacity-60 mb-1">Run B — {d.b?.status_code ?? '—'}</div><pre className="whitespace-pre-wrap break-all">{JSON.stringify(d.b?.response_body ?? null, null, 2)}</pre></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </>}
    </>
  );
};
