// @ts-nocheck
import React from 'react';
import { deleteTestCase, listTestCases, runTestCase } from '../api';

export const TestCasesPage = ({ isLight, setActiveModule }) => {
  const [testCases, setTestCases] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [suiteFilter, setSuiteFilter] = React.useState('');
  const [tagFilter, setTagFilter] = React.useState('');
  const [expandedId, setExpandedId] = React.useState(null);
  const [notice, setNotice] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(() => {
    listTestCases({ q: search.trim(), suite: suiteFilter.trim(), tag: tagFilter.trim() })
      .then(setTestCases)
      .catch(err => setError(err.message));
  }, [search, suiteFilter, tagFilter]);

  React.useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const handleRun = (testCase) => {
    setBusy(true);
    setError('');
    runTestCase(testCase.id)
      .then(() => {
        setNotice(`Running "${testCase.name}" — check Test Runs for progress.`);
        setActiveModule('test-runs');
      })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  };

  const handleDelete = (testCase) => {
    setBusy(true);
    setError('');
    deleteTestCase(testCase.id)
      .then(() => { setNotice(`Deleted "${testCase.name}".`); load(); })
      .catch(err => setError(err.message))
      .finally(() => setBusy(false));
  };

  const inputClass = `rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`;

  return (
    <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Test Cases — Saved Scripts</h2>
          <p className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Use "Save as Test Case" on New Test to add to this library.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="⌕ Search name..." className={`${inputClass} w-full sm:w-56`} />
        <input value={suiteFilter} onChange={e => setSuiteFilter(e.target.value)} placeholder="Suite..." className={`${inputClass} w-full sm:w-40`} />
        <input value={tagFilter} onChange={e => setTagFilter(e.target.value)} placeholder="Tag..." className={`${inputClass} w-full sm:w-40`} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className={`border-b ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-white/50'} text-xs uppercase tracking-wide`}>
              <th className="py-3 px-2">Name</th><th className="py-3 px-2">Suite</th><th className="py-3 px-2">Tags</th><th className="py-3 px-2">Steps</th><th className="py-3 px-2"></th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
            {testCases.map(tc => (
              <React.Fragment key={tc.id}>
                <tr className={isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}>
                  <td className="py-4 px-2 font-medium">{tc.name}</td>
                  <td className="py-4 px-2">{tc.suite}</td>
                  <td className="py-4 px-2">{tc.tags.length ? tc.tags.map(t => <span key={t} className={`inline-block rounded-full border px-2 py-0.5 text-xs mr-1 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>{t}</span>) : <span className="opacity-40">—</span>}</td>
                  <td className="py-4 px-2">
                    <button onClick={() => setExpandedId(id => id === tc.id ? null : tc.id)} className="underline decoration-dotted cursor-pointer">{tc.steps.length} steps</button>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleRun(tc)} disabled={busy} className="rounded-xl border border-emerald-400/50 text-emerald-600 px-3 py-1.5 text-xs cursor-pointer hover:bg-emerald-500/10 disabled:opacity-50">Run</button>
                      <button onClick={() => handleDelete(tc)} disabled={busy} className="rounded-xl border border-rose-400/50 text-rose-600 px-3 py-1.5 text-xs cursor-pointer hover:bg-rose-500/10 disabled:opacity-50">Delete</button>
                    </div>
                  </td>
                </tr>
                {expandedId === tc.id && (
                  <tr>
                    <td colSpan={5} className={`px-2 pb-4 ${isLight ? 'bg-slate-50' : 'bg-white/5'}`}>
                      <table className="w-full text-xs">
                        <thead><tr className="opacity-60"><th className="text-left py-1 pr-3">#</th><th className="text-left py-1 pr-3">Action</th><th className="text-left py-1 pr-3">Selector</th><th className="text-left py-1">Expected</th></tr></thead>
                        <tbody>{tc.steps.map((s, i) => <tr key={i}><td className="py-1 pr-3 font-mono">{i + 1}</td><td className="py-1 pr-3">{s.action}</td><td className="py-1 pr-3 font-mono opacity-80">{s.selector}</td><td className="py-1">{s.expected}</td></tr>)}</tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {testCases.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm opacity-60">No test cases yet. Save one from the New Test page.</td></tr>}
          </tbody>
        </table>
      </div>

      {notice && <div className="text-sm text-emerald-600">{notice}</div>}
      {error && <div className="text-sm text-rose-600">{error}</div>}
    </section>
  );
};

export default TestCasesPage;
