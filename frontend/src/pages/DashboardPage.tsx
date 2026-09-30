// @ts-nocheck
import React from 'react';
import { runStatusClass } from '../components/runStatus';
import { PlusIcon } from '../components/Icons';

export const DashboardPage = ({
  isLight,
  executionStatus,
  promptText,
  setPromptText,
  setActiveModule,
  recentRuns,
  setSelectedRun,
  hasPlanGenerated,
  feedbackRating,
  setFeedbackRating,
  feedbackCategory,
  setFeedbackCategory,
  feedbackMessage,
  setFeedbackMessage,
  feedbackNotice,
  setFeedbackNotice,
  isSubmittingFeedback,
  handleFeedbackSubmit
}) => {
  return (
    <>
      {/* METRICS OVERVIEW */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="liquid-glass p-4 rounded-[1.25rem] flex flex-col justify-between">
          <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'} font-medium uppercase tracking-wider`}>// Total Test Runs</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl font-heading ${isLight ? 'text-slate-900' : 'text-white'} leading-none`}>1,284</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">+12% this week</span>
          </div>
        </div>

        <div className="liquid-glass p-4 rounded-[1.25rem] flex flex-col justify-between">
          <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'} font-medium uppercase tracking-wider`}>// Passed Tests</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-heading text-emerald-500 leading-none">1,192</span>
            <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-white/70'} font-mono`}>92.8% Pass Rate</span>
          </div>
        </div>

        <div className="liquid-glass p-4 rounded-[1.25rem] flex flex-col justify-between">
          <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'} font-medium uppercase tracking-wider`}>// Failed Tests</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-heading text-rose-500 leading-none">64</span>
            <span className="text-[11px] text-rose-500/80 font-mono">5.0% Failure Rate</span>
          </div>
        </div>

        <div className="liquid-glass p-4 rounded-[1.25rem] flex flex-col justify-between">
          <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'} font-medium uppercase tracking-wider`}>// Tests In Progress</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-heading text-amber-500 leading-none">
              {executionStatus === 'running' ? 1 : 0}
            </span>
            <span className="text-[11px] text-amber-500/80 font-mono">Live Execution</span>
          </div>
        </div>

        <div className="liquid-glass p-4 rounded-[1.25rem] flex flex-col justify-between col-span-2 md:col-span-1">
          <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/60'} font-medium uppercase tracking-wider`}>// Average Duration</span>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl font-heading ${isLight ? 'text-slate-900' : 'text-white'} leading-none`}>42.5s</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">-4.2s optimization</span>
          </div>
        </div>
      </section>

      {/* QUICK START */}
      <section className={`liquid-glass-strong p-6 rounded-[1.5rem] ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-1`}>// Quick Start</div>
            <h2 className={`font-heading text-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>What would you like to test today?</h2>
          </div>
          <button
            onClick={() => setActiveModule('new-test')}
            className={`${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'} rounded-full px-5 py-2.5 text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0`}
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Test</span>
          </button>
        </div>

        <input
          type="text"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          onFocus={() => setActiveModule('new-test')}
          placeholder="e.g., Test the password reset feature on test.com…"
          className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500' : 'bg-white/5 border-white/15 text-white placeholder-white/40 focus:border-white/40'} border rounded-2xl px-4 py-3.5 text-sm focus:outline-none font-body`}
        />
      </section>

      {/* RECENT RUNS SUMMARY + SYSTEM & AGENT ACTIVITY */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-8 liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-4`}>
          <div>
            <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-1`}>// Recent Activity</div>
            <h3 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>Recent Test Runs</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-white/10 text-white/50'} font-mono text-[11px]`}>
                  <th className="py-3 px-3">RUN ID</th>
                  <th className="py-3 px-3">NAME</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3">DURATION</th>
                  <th className="py-3 px-3">STARTED</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                {recentRuns.slice(0, 4).map((run) => (
                  <tr key={run.id} className={`${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'} transition-colors`}>
                    <td className="py-3.5 px-3 font-mono font-medium">
                      <button onClick={() => setSelectedRun(run)} className="text-emerald-500 hover:text-emerald-600 hover:underline cursor-pointer">{run.id}</button>
                    </td>
                    <td className="py-3.5 px-3 font-medium">{run.name}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono ${runStatusClass(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono opacity-70">{run.duration}</td>
                    <td className="py-3.5 px-3 opacity-70">{run.startTime}</td>
                  </tr>
                ))}
                {recentRuns.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm opacity-60">No test runs yet — start one from New Test.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => setActiveModule('test-runs')}
            className={`text-xs font-mono ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'} transition-colors cursor-pointer`}
          >
            → View all in Test Runs
          </button>
        </div>

        <div className={`lg:col-span-4 liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-4`}>
          <div>
            <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-1`}>// System</div>
            <h3 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>System & Agent Activity</h3>
          </div>

          <div className={`divide-y divide-dashed ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
            {[
              { name: 'Planner Agent', active: hasPlanGenerated },
              { name: 'Browser Executor', active: executionStatus === 'running' },
              { name: 'User Simulator', active: executionStatus === 'waiting_human_input' },
              { name: 'Evaluator Agent', active: executionStatus === 'completed' || executionStatus === 'failed' }
            ].map(agent => (
              <div key={agent.name} className="flex items-center justify-between py-3 text-sm">
                <span className={isLight ? 'text-slate-800' : 'text-white/90'}>{agent.name}</span>
                <span className={`text-[11px] font-mono px-3 py-1 rounded-full border ${agent.active ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30' : (isLight ? 'text-slate-500 border-slate-300' : 'text-white/50 border-white/20')}`}>
                  {agent.active ? 'Active' : 'Idle'}
                </span>
              </div>
            ))}
          </div>

          <div className={`border border-dashed ${isLight ? 'border-slate-300 text-slate-400' : 'border-white/20 text-white/40'} rounded-2xl h-40 flex items-center justify-center text-center text-xs font-mono px-4`}>
            Pass Rate Trend (7 days) — chart
          </div>
        </div>
      </section>

      {/* FEEDBACK FORM */}
      <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 items-start">
          <div>
            <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-1`}>// Product Feedback</div>
            <h3 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>Help us improve your testing workflow</h3>
            <p className={`mt-2 max-w-md text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-white/60'}`}>
              Tell us what is working well or where the experience could be smoother. Your feedback helps shape the next release.
            </p>
            <div className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/15 text-white/50'}`}>
              <span className="text-emerald-500">●</span> Takes less than a minute
            </div>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <span className={`block mb-2 text-sm font-medium ${isLight ? 'text-slate-800' : 'text-white/90'}`}>How was your experience?</span>
              <div className="flex items-center gap-2" role="group" aria-label="Feedback rating">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    type="button"
                    aria-label={`${rating} out of 5 stars`}
                    aria-pressed={feedbackRating === rating}
                    onClick={() => { setFeedbackRating(rating); setFeedbackNotice(''); }}
                    className={`w-10 h-10 rounded-xl border text-lg transition-colors cursor-pointer ${feedbackRating >= rating ? (isLight ? 'bg-slate-900 border-slate-900 text-amber-300' : 'bg-white border-white text-amber-500') : (isLight ? 'border-slate-300 text-slate-400 hover:border-slate-500 hover:text-amber-500' : 'border-white/20 text-white/40 hover:border-white/40 hover:text-amber-300')}`}
                  >★</button>
                ))}
                <span className={`ml-2 text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{feedbackRating ? `${feedbackRating}/5` : 'Select a rating'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="text-sm">
                <span className={`block mb-2 font-medium ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Feedback type</span>
                <select
                  value={feedbackCategory}
                  onChange={(event) => { setFeedbackCategory(event.target.value); setFeedbackNotice(''); }}
                  className={`w-full rounded-xl border px-3 py-3 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-white/5 border-white/15 text-white'}`}
                >
                  <option>Product experience</option>
                  <option>Bug report</option>
                  <option>Feature request</option>
                  <option>Other</option>
                </select>
              </label>

              <div className={`rounded-xl border border-dashed px-3 py-3 text-xs leading-relaxed ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/15 text-white/50'}`}>
                <span className="font-mono">Category:</span> {feedbackCategory}
                <br />We review every response.
              </div>
            </div>

            <label className="block text-sm">
              <span className={`block mb-2 font-medium ${isLight ? 'text-slate-800' : 'text-white/90'}`}>Share your thoughts</span>
              <textarea
                value={feedbackMessage}
                onChange={(event) => { setFeedbackMessage(event.target.value); setFeedbackNotice(''); }}
                placeholder="What should we keep, change, or build next?"
                rows="4"
                maxLength="500"
                required
                className={`w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500' : 'bg-white/5 border-white/15 text-white placeholder-white/40 focus:border-white/40'}`}
              />
              <span className={`mt-1 block text-right text-[11px] font-mono ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{feedbackMessage.length}/500</span>
            </label>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p aria-live="polite" className={`text-xs ${feedbackNotice.startsWith('Thanks') ? 'text-emerald-500' : 'text-rose-500'}`}>{feedbackNotice}</p>
              <button type="submit" disabled={isSubmittingFeedback} className={`${isLight ? 'bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400' : 'bg-white text-black hover:bg-white/90 disabled:bg-white/40'} rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer disabled:cursor-wait transition-colors sm:ml-auto`}>{isSubmittingFeedback ? 'Saving...' : 'Send feedback'}</button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default DashboardPage;
