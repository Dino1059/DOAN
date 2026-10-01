// @ts-nocheck
import React from 'react';
import { EvidencePanel, EVIDENCE_TABS } from '../components/EvidencePanel';
import {
  PlayIcon,
  ShieldCheckIcon,
  ZapIcon,
  PauseIcon,
  StopIcon,
  PlusIcon,
  TrashIcon,
  EditIcon,
} from '../components/Icons';

const SOURCE_LABELS = { original: 'Original', chat_edit: 'Chat edit', manual: 'Manual' };

// Session History: Today / Yesterday / Older theo last_message_at
const dayGroup = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (d >= startOfToday) return 'Today';
  if (d >= new Date(startOfToday.getTime() - 86400000)) return 'Yesterday';
  return 'Older';
};

const timeAgo = (iso) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// Execution state lives in the workspace (App.tsx) so polling/SSE keeps running when switching modules.
export const NewTestPage = ({
  isLight,
  promptText,
  setPromptText,
  testPlan,
  setTestPlan,
  hasPlanGenerated,
  isGenerating,
  executionStatus,
  currentStepIdx,
  runSteps,
  evidenceRunId,
  humanPrompt,
  isSimulatedRun,
  runError,
  selectedEvidenceStepId,
  setSelectedEvidenceStepId,
  evidenceTab,
  setEvidenceTab,
  executionTimer,
  humanInputText,
  setHumanInputText,
  handleGeneratePlan,
  conversation,
  messages,
  conversations,
  planStatus,
  planError,
  onSearchConversations,
  onOpenConversation,
  onNewConversation,
  onSavePlanSteps,
  handleConfirmAndRun,
  handlePauseTest,
  handleStopTest,
  handleSendHumanInput,
  onSaveAsTestCase,
  testCaseNotice
}) => {
  const [isEditingPlan, setIsEditingPlan] = React.useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = React.useState(false);
  const [chatHistorySearch, setChatHistorySearch] = React.useState('');
  const isPlanLocked = planStatus === 'approved';
  const chatEndRef = React.useRef(null);

  // Tìm kiếm Session History ở backend (theo tên, nội dung chat, URL), chờ 300ms sau khi ngừng gõ
  React.useEffect(() => {
    const timer = setTimeout(() => onSearchConversations(chatHistorySearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [chatHistorySearch, onSearchConversations]);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, isGenerating]);

  const renumber = (steps) => steps.map((step, i) => ({ ...step, id: i + 1, step_no: i + 1 }));

  // Gõ trong ô sửa: chỉ đổi ở trình duyệt; lưu backend khi bấm "Done Editing"
  const handleUpdateStep = (index, field, value) => {
    const updatedSteps = testPlan.steps.map((step, i) => (i === index ? { ...step, [field]: value } : step));
    setTestPlan({ ...testPlan, steps: updatedSteps });
  };

  const handleDeleteStep = (index) => {
    onSavePlanSteps(renumber(testPlan.steps.filter((_, i) => i !== index)));
  };

  const handleAddStep = () => {
    if (isPlanLocked) return;
    const newStep = { action: "New Action Step", selector: "#element-selector", expected: "Expected result outcome", source: 'manual' };
    onSavePlanSteps(renumber([...testPlan.steps, newStep]));
  };

  const handleToggleEdit = () => {
    if (isEditingPlan) onSavePlanSteps(testPlan.steps);
    setIsEditingPlan(!isEditingPlan);
  };

  const historyGroups = ['Today', 'Yesterday', 'Older']
    .map(group => ({ group, items: conversations.filter(c => dayGroup(c.last_message_at) === group) }))
    .filter(g => g.items.length);

  return (
    <>
    <div className="fixed left-0 top-16 bottom-0 z-50 w-3" onMouseEnter={() => setIsChatHistoryOpen(true)} aria-hidden="true" />
    <aside
      onMouseEnter={() => setIsChatHistoryOpen(true)}
      onMouseLeave={() => setIsChatHistoryOpen(false)}
      className={`fixed left-4 top-24 bottom-6 z-50 w-[min(360px,calc(100vw-2rem))] rounded-[1.5rem] border p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out ${isChatHistoryOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none'} ${isLight ? 'bg-white/95 border-slate-300 text-slate-900' : 'bg-slate-950/95 border-white/15 text-white'}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-medium uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Session History</h3>
        <button onClick={() => { onNewConversation(); setIsChatHistoryOpen(false); }} className={`ml-auto mr-2 rounded-xl border px-3 h-10 text-sm cursor-pointer ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/20 text-white/80 hover:bg-white/10'}`}>+ New</button>
        <button onClick={() => setIsChatHistoryOpen(false)} className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer ${isLight ? 'border-slate-300 text-slate-500 hover:bg-slate-100' : 'border-white/20 text-white/60 hover:bg-white/10'}`}>◂</button>
      </div>
      <input
        value={chatHistorySearch}
        onChange={(e) => setChatHistorySearch(e.target.value)}
        placeholder="⌕ Search by name / prompt / URL..."
        className={`w-full rounded-2xl border px-4 py-3 text-sm mb-5 focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`}
      />
      <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">
        {historyGroups.length === 0 && (
          <div className={`text-sm text-center py-8 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
            {chatHistorySearch ? 'No sessions match your search.' : 'No sessions yet. Describe a test to start one.'}
          </div>
        )}
        {historyGroups.map(({ group, items }) => (
          <div key={group}>
            <div className={`text-xs uppercase tracking-wide mb-2 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{group}</div>
            <div className="space-y-1">
              {items.map(item => {
                const isActive = conversation?.id === item.id;
                return (
                  <button key={item.id} onClick={() => { onOpenConversation(item.id); setIsChatHistoryOpen(false); }} className={`w-full rounded-2xl px-4 py-3 text-left cursor-pointer transition-colors ${isActive ? (isLight ? 'bg-slate-900 text-white' : 'bg-white text-black') : (isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10')}`}>
                    <div className="text-sm font-semibold truncate">{item.title}</div>
                    <div className={`mt-1 flex items-center gap-2 text-xs ${isActive ? 'opacity-80' : (isLight ? 'text-slate-500' : 'text-white/50')}`}>
                      <span className={`rounded-full border px-2 py-0.5 ${item.latest_plan_status === 'approved' ? 'border-emerald-400 text-emerald-600' : 'border-slate-400'}`}>{item.latest_plan_status === 'approved' ? 'Run' : 'Draft'}</span>
                      <span>#{item.seq_no} · {item.latest_plan_steps} steps · {timeAgo(item.last_message_at)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className={`border-t border-dashed mt-5 pt-4 text-center text-sm ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/15 text-white/50'}`}>→ View all in Test Runs</div>
    </aside>
    {/* NEW TEST WIREFRAME */}
    <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch xl:-mt-9 xl:h-[calc(100vh-8rem)] xl:min-h-[680px]">
      <div className={`xl:col-span-4 liquid-glass-strong rounded-[1.5rem] p-5 ${isLight ? 'border-slate-200' : 'border-white/10'} border flex flex-col h-full min-h-0`}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider`}>// Conversation</div>
            <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Test Assistant</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-3 py-1 rounded-full border ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/20 text-white/60'}`}>{conversation ? `Session #${conversation.seq_no}` : 'New session'}</span>
            {conversation && <button onClick={onNewConversation} title="Start a new session" className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer ${isLight ? 'border-slate-300 text-slate-600 hover:bg-slate-100' : 'border-white/20 text-white/70 hover:bg-white/10'}`}>+ New</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.length === 0 && !isGenerating && (
            <div className={`text-sm leading-relaxed rounded-2xl border border-dashed p-4 ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/20 text-white/60'}`}>
              Describe what you want to test — for example <em>"Test the password reset feature on test.com"</em>. The Planner Agent will turn it into step-by-step test plan you can edit before running.
            </div>
          )}

          {messages.map(message => (
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end">
                <div className={`${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'} max-w-[88%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap`}>
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={message.id} className={`${isLight ? 'bg-slate-200/80 text-slate-900' : 'bg-white/10 text-white'} rounded-2xl rounded-bl-md p-4 space-y-2`}>
                <div className={`text-[11px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{message.agent === 'planner' ? 'Planner Agent' : 'System'}</div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                {(message.kind === 'plan_created' || message.kind === 'plan_updated') && (
                  <div className={`border border-dashed rounded-xl px-3 py-2 text-xs ${isLight ? 'border-slate-400 text-slate-700' : 'border-white/25 text-white/80'}`}>
                    <span className="mr-1">📋</span>{message.kind === 'plan_created' ? 'Test plan created' : 'Test plan updated'} — see the panel on the right
                  </div>
                )}
              </div>
            )
          ))}

          {isGenerating && (
            <div className={`${isLight ? 'bg-slate-200/80 text-slate-600' : 'bg-white/10 text-white/70'} rounded-2xl rounded-bl-md p-4 text-sm flex items-center gap-2`}>
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Planner Agent is writing the test plan…
            </div>
          )}

          {planError && (
            <div role="alert" className="rounded-2xl border border-rose-400/50 bg-rose-500/10 text-rose-600 dark:text-rose-300 px-4 py-3 text-sm">
              {planError}
            </div>
          )}

          {executionStatus !== 'Idle' && (
            <div className="flex justify-end">
              <div className={`${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'} max-w-[88%] rounded-2xl rounded-br-md px-4 py-3 text-sm`}>
                Test status: {executionStatus}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="pt-4 mt-4 border-t border-slate-300/70 dark:border-white/10">
          <div className="flex gap-2 mb-3 flex-wrap">
            <button onClick={handleAddStep} disabled={isPlanLocked} title={isPlanLocked ? 'This plan has been run and is locked' : ''} className={`liquid-glass rounded-full px-3 py-1.5 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isLight ? 'text-slate-700' : 'text-white/80'}`}>+ Add Step</button>
            <button onClick={handleGeneratePlan} disabled={isGenerating} className={`liquid-glass rounded-full px-3 py-1.5 text-xs cursor-pointer disabled:opacity-40 ${isLight ? 'text-slate-700' : 'text-white/80'}`}>Run Again</button>
            <button onClick={onSaveAsTestCase} className={`liquid-glass rounded-full px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'text-slate-700' : 'text-white/80'}`}>Save as Test Case</button>
          </div>
          {testCaseNotice && <div className={`text-xs mb-3 ${testCaseNotice.startsWith('Saved') ? 'text-emerald-600' : 'text-rose-500'}`}>{testCaseNotice}</div>}
          <div className="flex gap-2">
            <input
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGeneratePlan(); } }}
              placeholder={'Describe a change or type "run test"...'}
              className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`}
            />
            <button onClick={handleGeneratePlan} disabled={isGenerating || !promptText.trim()} className={`${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'} rounded-2xl px-4 text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}>{isGenerating ? '…' : 'Send'}</button>
          </div>
        </div>
      </div>

      <div className="xl:col-span-8 h-full min-h-0 flex flex-col gap-6">
        <section className={`flex-1 min-h-0 liquid-glass-strong rounded-[1.5rem] p-5 ${isLight ? 'border-slate-200' : 'border-white/10'} border flex flex-col`}>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
            <div>
              <div className={`text-xs font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider`}>// AI Generated Structured Test Plan</div>
              <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{testPlan.objective} — {testPlan.steps.length} steps</h2>
              <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                {testPlan.version && <span className={`rounded-full border px-2 py-0.5 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>v{testPlan.version}</span>}
                {isPlanLocked && <span className="rounded-full border border-emerald-400/60 text-emerald-600 px-2 py-0.5">🔒 Locked — this version has been run</span>}
                {planStatus === null && <span className="rounded-full border border-amber-400/60 text-amber-600 px-2 py-0.5">Sample plan — not saved</span>}
                {testPlan.targetUrl && <span className="font-mono truncate max-w-[320px]">{testPlan.targetUrl}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleToggleEdit} disabled={isPlanLocked && !isEditingPlan} title={isPlanLocked ? 'Send a chat message to create a new editable version' : ''} className={`rounded-xl border px-4 py-2 text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'}`}>
                ✎ {isEditingPlan ? 'Done Editing' : 'Edit Directly'}
              </button>
              <button onClick={handleConfirmAndRun} className="bg-emerald-500 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-emerald-600 flex items-center gap-1.5">
                <PlayIcon className="w-4 h-4" /> Confirm & Run Test
              </button>
            </div>
          </div>

          <div className="overflow-auto scrollbar-hide overscroll-contain min-h-0">
            <div className={`min-w-[760px] grid grid-cols-[42px_1.1fr_1.45fr_1.55fr_110px] text-xs font-semibold uppercase tracking-wide border-b pb-3 px-2 ${isLight ? 'text-slate-500 border-slate-300' : 'text-white/50 border-white/10'}`}>
              <span>#</span><span>Action</span><span>Selector</span><span>Expected</span><span>Source</span>
            </div>
            {testPlan.steps.map((step, idx) => (
              <div key={step.id} className={`min-w-[760px] grid grid-cols-[42px_1.1fr_1.45fr_1.55fr_110px] items-center gap-0 text-sm border-b last:border-b-0 px-2 ${isLight ? 'text-slate-800 border-slate-200' : 'text-white/90 border-white/10'}`}>
                <span className="py-3 font-mono">{idx + 1}</span>
                {isEditingPlan ? <input value={step.action} onChange={(e) => handleUpdateStep(idx, 'action', e.target.value)} className={`my-1 mr-2 rounded-lg border px-2 py-2 text-sm ${isLight ? 'bg-white border-slate-300' : 'bg-white/10 border-white/20 text-white'}`} /> : <span className="py-3 font-medium">{step.action}</span>}
                {isEditingPlan ? <input value={step.selector} onChange={(e) => handleUpdateStep(idx, 'selector', e.target.value)} className={`my-1 mr-2 rounded-lg border px-2 py-2 text-sm font-mono ${isLight ? 'bg-white border-slate-300 text-emerald-700' : 'bg-white/10 border-white/20 text-emerald-300'}`} /> : <span className={`py-3 font-mono truncate pr-2 ${isLight ? 'text-slate-600' : 'text-white/70'}`}>{step.selector}</span>}
                {isEditingPlan ? <input value={step.expected} onChange={(e) => handleUpdateStep(idx, 'expected', e.target.value)} className={`my-1 mr-2 rounded-lg border px-2 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-white/10 border-white/20 text-white'}`} /> : <span className={`py-3 pr-2 ${isLight ? 'text-slate-800' : 'text-white/85'}`}>{step.expected}</span>}
                {isEditingPlan ? (
                  <button onClick={() => handleDeleteStep(idx)} disabled={testPlan.steps.length <= 1} className="my-1 rounded-lg px-2 py-2 text-xs text-rose-500 hover:bg-rose-500/10 cursor-pointer disabled:opacity-30 flex items-center gap-1"><TrashIcon className="w-3.5 h-3.5" /> Delete</button>
                ) : (
                  <span className={`my-1 rounded-lg px-2 py-2 text-xs ${step.source && step.source !== 'original' ? (isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-300') : (isLight ? 'text-slate-500' : 'text-white/50')}`}>{SOURCE_LABELS[step.source] || 'Original'}</span>
                )}
              </div>
            ))}
          </div>
          <div className={`mt-4 text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}><strong className={isLight ? 'text-slate-800' : 'text-white'}>Original</strong> = generated by Planner Agent &nbsp; <strong className={isLight ? 'text-slate-800' : 'text-white'}>Chat edit</strong> = updated from conversation &nbsp; <strong className={isLight ? 'text-slate-800' : 'text-white'}>Manual</strong> = edited directly</div>
        </section>

        <section className={`flex-1 min-h-0 liquid-glass-strong rounded-[1.5rem] p-5 ${isLight ? 'border-slate-200' : 'border-white/10'} border flex flex-col`}>
          <div className={`text-xs font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-3`}>// Live Playwright Viewport</div>
          <div className={`relative flex-1 min-h-0 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)] text-slate-500' : 'border-white/30 bg-[repeating-linear-gradient(45deg,#111,#111_14px,#181818_14px,#181818_28px)] text-white/60'}`}>
            <p className={`text-sm font-medium text-center px-5 ${executionStatus === 'running' ? 'text-emerald-500' : ''}`}>{executionStatus === 'Idle' ? 'Not running — the real browser will appear after clicking "Confirm & Run Test" or typing "run test" in chat.' : isSimulatedRun ? 'Simulated run — steps are executed on the server without a real browser (Playwright arrives in M4).' : 'Playwright browser is running.'}</p>
          </div>
        </section>
      </div>
    </section>

    <div className="hidden">
    {/* PROMPT-TO-TEST GENERATOR */}
    <section className={`liquid-glass-strong p-6 rounded-[1.5rem] ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-4`}>
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-xs font-body ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-1`}>// Prompt-to-Test Generator</div>
          <h2 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>Describe What You Want to Test</h2>
        </div>
        <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'} font-mono`}>Planner Agent AI v2.4</span>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="e.g., Test the password reset feature on test.com..."
          rows={2}
          className={`flex-1 ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500' : 'bg-white/5 border-white/15 text-white placeholder-white/40 focus:border-white/40'} border rounded-2xl p-3.5 text-sm focus:outline-none font-body resize-none`}
        />
        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className={`${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'} rounded-2xl px-6 py-3 font-medium text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50`}
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Generating Test Plan...</span>
            </>
          ) : (
            <>
              <span>Generate Plan</span>
              <ZapIcon className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Sample Prompts:</span>
        {[
          "Test the password reset feature on test.com",
          "Automate user checkout flow with discount coupon on store.com",
          "Validate user signup form inputs and email verification endpoint"
        ].map((sample, idx) => (
          <button
            key={idx}
            onClick={() => setPromptText(sample)}
            className={`text-[11px] liquid-glass rounded-full px-3 py-1 ${isLight ? 'text-slate-700 hover:text-slate-950' : 'text-white/80 hover:text-white'} transition-colors cursor-pointer`}
          >
            {sample}
          </button>
        ))}
      </div>

      {/* GENERATED TEST PLAN REVIEW */}
      {hasPlanGenerated && testPlan && (
        <div className={`mt-6 pt-6 border-t ${isLight ? 'border-slate-200' : 'border-white/10'} space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">// AI Generated Structured Test Plan</span>
              <h3 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>{testPlan.objective}</h3>
              <div className={`flex items-center gap-4 mt-1 text-xs ${isLight ? 'text-slate-600' : 'text-white/70'}`}>
                <span>Target: <code className={`${isLight ? 'text-slate-900 bg-slate-200' : 'text-white bg-white/10'} px-1.5 py-0.5 rounded font-mono`}>{testPlan.targetUrl}</code></span>
                <span>Steps: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{testPlan.steps.length}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsEditingPlan(!isEditingPlan)}
                className={`liquid-glass rounded-full px-4 py-2 text-xs font-medium ${isLight ? 'text-slate-800 hover:bg-slate-200' : 'text-white hover:bg-white/10'} transition-colors flex items-center gap-1.5 cursor-pointer`}
              >
                <EditIcon className="w-3.5 h-3.5" />
                <span>{isEditingPlan ? "Done Editing" : "Edit Plan"}</span>
              </button>

              <button
                onClick={handleConfirmAndRun}
                className="bg-emerald-500 text-white font-semibold rounded-full px-5 py-2 text-xs hover:bg-emerald-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                <span>Confirm & Run Test</span>
              </button>
            </div>
          </div>

          <div className="liquid-glass rounded-2xl p-4 overflow-x-auto space-y-2">
            <div className={`grid grid-cols-12 text-[11px] font-mono ${isLight ? 'text-slate-500 border-slate-200' : 'text-white/50 border-white/10'} pb-2 border-b px-2`}>
              <span className="col-span-1">#</span>
              <span className="col-span-3">ACTION</span>
              <span className="col-span-4">TARGET ELEMENT / SELECTOR</span>
              <span className="col-span-3">EXPECTED RESULT</span>
              <span className="col-span-1 text-right">MANAGE</span>
            </div>

            {testPlan.steps.map((step, idx) => (
              <div key={step.id} className={`grid grid-cols-12 items-center text-xs ${isLight ? 'text-slate-800 hover:bg-slate-100' : 'text-white/90 hover:bg-white/5'} px-2 py-2 rounded-xl transition-colors gap-2`}>
                <span className="col-span-1 font-mono opacity-60">Step {idx + 1}</span>

                {isEditingPlan ? (
                  <>
                    <input
                      type="text"
                      value={step.action}
                      onChange={(e) => handleUpdateStep(idx, 'action', e.target.value)}
                      className={`col-span-3 ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/10 border-white/20 text-white'} border rounded-lg px-2 py-1 text-xs focus:outline-none`}
                    />
                    <input
                      type="text"
                      value={step.selector}
                      onChange={(e) => handleUpdateStep(idx, 'selector', e.target.value)}
                      className={`col-span-4 ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/10 border-white/20 text-emerald-300'} border rounded-lg px-2 py-1 text-xs font-mono focus:outline-none`}
                    />
                    <input
                      type="text"
                      value={step.expected}
                      onChange={(e) => handleUpdateStep(idx, 'expected', e.target.value)}
                      className={`col-span-3 ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-white/10 border-white/20 text-white'} border rounded-lg px-2 py-1 text-xs focus:outline-none`}
                    />
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => handleDeleteStep(idx)}
                        className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="col-span-3 font-medium">{step.action}</span>
                    <span className="col-span-4 font-mono opacity-70 truncate">{step.selector}</span>
                    <span className="col-span-3 opacity-80">{step.expected}</span>
                    <span className="col-span-1 text-right text-emerald-500 font-mono text-[11px]">Ready</span>
                  </>
                )}
              </div>
            ))}

            {isEditingPlan && (
              <button
                onClick={handleAddStep}
                className={`mt-2 w-full border border-dashed ${isLight ? 'border-slate-300 text-slate-600 hover:border-slate-500' : 'border-white/20 text-white/70 hover:border-white/40'} rounded-xl py-2 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer`}
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add New Test Step</span>
              </button>
            )}
          </div>
        </div>
      )}
    </section>

    {/* LIVE TEST EXECUTION & AGENT INSPECTOR */}
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Playwright Viewport Canvas (7 Cols) */}
      <div className={`lg:col-span-7 liquid-glass-strong rounded-[1.5rem] p-5 ${isLight ? 'border-slate-200' : 'border-white/10'} border flex flex-col justify-between space-y-4`}>
        <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-white/10'} pb-3`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className={`text-xs font-mono ${isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-white/5 text-white/70 border-white/10'} px-3 py-1 rounded-full border`}>
              {testPlan.targetUrl}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full ${executionStatus === 'running' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' : executionStatus === 'waiting_human_input' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30' : 'bg-slate-200 dark:bg-white/10 opacity-70'}`}>
              {executionStatus}
            </span>
            <span className="text-xs font-mono opacity-60">{executionTimer}s</span>
          </div>
        </div>

        <div className={`relative w-full h-[320px] ${isLight ? 'bg-slate-900 text-white' : 'bg-neutral-950 text-white'} rounded-2xl border ${isLight ? 'border-slate-800' : 'border-white/10'} overflow-hidden flex flex-col items-center justify-center p-6 text-center select-none`}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative z-10 max-w-md w-full liquid-glass p-6 rounded-2xl border border-white/20 space-y-4">
            <div className="text-left space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase">// Playwright Browser Canvas</span>
              <h4 className="font-heading text-2xl text-white">Reset Your Password</h4>
              <p className="text-xs text-white/60 font-body">Enter your account email to receive a password reset link.</p>
            </div>

            <div className="space-y-2 text-left">
              <input
                type="text"
                readOnly
                value={testPlan.steps[currentStepIdx]?.selector === '#email-input' ? 'user@test.com' : ''}
                placeholder="user@test.com"
                className={`w-full bg-white/10 border ${currentStepIdx === 2 ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'border-white/20'} rounded-xl px-3 py-2 text-xs text-white font-mono`}
              />

              <button
                readOnly
                className={`w-full ${currentStepIdx === 3 ? 'bg-amber-400 text-black font-semibold shadow-[0_0_20px_rgba(251,191,36,0.5)]' : 'bg-white text-black'} rounded-xl py-2 text-xs font-medium transition-all flex items-center justify-center gap-2`}
              >
                <span>Send Reset Link</span>
                {currentStepIdx === 3 && <span className="w-2 h-2 rounded-full bg-black animate-ping" />}
              </button>
            </div>

            {currentStepIdx >= 4 && (
              <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs px-3 py-2 rounded-xl text-left flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Success! Password reset link sent to email.</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-6 right-6 flex items-center gap-2 text-[10px] font-mono opacity-40">
            <span>Viewport: 1920x1080</span>
            <span>•</span>
            <span>FPS: 60</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseTest}
              disabled={executionStatus !== 'running' && executionStatus !== 'paused'}
              className={`liquid-glass rounded-full px-3.5 py-1.5 text-xs hover:opacity-90 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer`}
            >
              <PauseIcon className="w-3.5 h-3.5" />
              <span>{executionStatus === 'paused' ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={handleStopTest}
              disabled={!['queued', 'running', 'paused', 'waiting_human_input'].includes(executionStatus)}
              className="liquid-glass rounded-full px-3.5 py-1.5 text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <StopIcon className="w-3.5 h-3.5" />
              <span>Stop Test</span>
            </button>
          </div>

          <span className="text-xs font-mono opacity-60">
            Executing Step {currentStepIdx + 1} of {testPlan.steps.length}
          </span>
        </div>
      </div>

      {/* Agent Status & Live Inspector (5 Cols) */}
      <div className={`lg:col-span-5 liquid-glass-strong rounded-[1.5rem] p-5 ${isLight ? 'border-slate-200' : 'border-white/10'} border flex flex-col justify-between space-y-4`}>
        <div>
          <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-white/10'} pb-3`}>
            <div>
              <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider`}>// Real-Time Agent Status</div>
              <h3 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>Agent Step Monitor</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {isSimulatedRun && (
                <span title="M3a: steps are simulated on the server; no real browser is opened yet" className="rounded-full px-2.5 py-1 text-[10px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                  Simulated run
                </span>
              )}
              <span className="liquid-glass rounded-full px-3 py-1 text-xs text-emerald-500 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{executionStatus}</span>
              </span>
            </div>
          </div>
          {runError && (
            <p className="mt-2 text-xs text-rose-500">{runError}</p>
          )}

          {/* ACTIVE MULTI-AGENT BADGES */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${hasPlanGenerated ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' : 'bg-slate-200 dark:bg-white/10 opacity-50'}`}>
              🟢 Planner Agent
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${executionStatus === 'running' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 animate-pulse' : 'bg-slate-200 dark:bg-white/10 opacity-50'}`}>
              🔵 Browser Executor
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${executionStatus === 'waiting_human_input' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 animate-pulse' : 'bg-slate-200 dark:bg-white/10 opacity-50'}`}>
              🟣 User Simulator
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${executionStatus === 'completed' || executionStatus === 'failed' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30' : 'bg-slate-200 dark:bg-white/10 opacity-50'}`}>
              🟡 Evaluator Agent
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div className="liquid-glass p-4 rounded-2xl border border-slate-200/50 dark:border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs opacity-60 font-mono">
                <span>CURRENT STEP</span>
                <span>{currentStepIdx + 1} / {testPlan.steps.length}</span>
              </div>
              <div className="text-base font-semibold">
                {testPlan.steps[currentStepIdx]?.action}
              </div>
              <div className="text-xs font-mono text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 inline-block">
                Target: {testPlan.steps[currentStepIdx]?.selector}
              </div>
            </div>

            <div className="liquid-glass p-4 rounded-2xl border border-slate-200/50 dark:border-white/10 space-y-1">
              <span className="text-[11px] font-mono opacity-50">// AGENT OBSERVATION</span>
              <p className="text-xs opacity-90 leading-relaxed font-body">
                {runSteps?.[currentStepIdx]?.observation
                  || (runSteps ? 'Waiting for the agent to finish this step…' : 'No observation yet — start a run to see what the agent observes.')}
              </p>
            </div>

            {/* HUMAN-IN-THE-LOOP INTERVENTION PANEL */}
            {executionStatus === 'waiting_human_input' && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-amber-600 dark:text-amber-300 font-semibold">
                  <span>⚠️ HUMAN INTERVENTION REQUIRED</span>
                </div>
                <p className="text-xs opacity-80">{humanPrompt || 'System requires user input or approval to proceed to the next step.'}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={humanInputText}
                    onChange={(e) => setHumanInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendHumanInput(); }}
                    placeholder="Enter response or instruction..."
                    className={`flex-1 ${isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-black/50 text-white border-white/20'} border rounded-xl px-3 py-1.5 text-xs focus:outline-none`}
                  />
                  <button
                    onClick={handleSendHumanInput}
                    className="bg-amber-500 text-black font-semibold px-4 py-1.5 rounded-xl text-xs hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}

            <div className="liquid-glass p-4 rounded-2xl border border-slate-200/50 dark:border-white/10 space-y-1">
              <span className="text-[11px] font-mono opacity-50">// NEXT UPCOMING STEP</span>
              <div className="text-xs font-medium opacity-80">
                {testPlan.steps[currentStepIdx + 1] ? testPlan.steps[currentStepIdx + 1].action : "Test Run Completion & Final Report"}
              </div>
            </div>
          </div>
        </div>

        <div className={`pt-2 text-center text-xs font-mono opacity-40 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          Playwright Automation Engine • Uptime 99.99%
        </div>
      </div>


    </section>

    {/* TEST TIMELINE & EVIDENCE INSPECTOR */}
    <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-6`}>
      <div>
        <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-1`}>// Step Timeline & Evidence Inspection</div>
        <h3 className={`font-heading text-3xl ${isLight ? 'text-slate-900' : 'text-white'}`}>Execution Timeline & Evidence Viewer</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Timeline Step List (4 Cols) */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-mono opacity-50 uppercase tracking-wider block mb-2">Test Steps Timeline</span>
          {testPlan.steps.map((step, idx) => {
            const isSelected = selectedEvidenceStepId === step.id;
            // Có dữ liệu run từ backend → dùng trạng thái thật của từng bước
            const runStatus = runSteps?.[idx]?.status;
            const isPassed = runSteps ? runStatus === 'passed' : idx < currentStepIdx || executionStatus === 'completed';
            const isCurrent = runSteps ? runStatus === 'running' : idx === currentStepIdx && executionStatus === 'running';
            const isFailed = runStatus === 'failed';
            const isSkipped = runStatus === 'skipped';
            
            return (
              <div
                key={step.id}
                onClick={() => setSelectedEvidenceStepId(step.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${isSelected ? (isLight ? 'bg-slate-200 border-slate-400 shadow-md' : 'bg-white/15 border-white/40 shadow-lg') : (isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'liquid-glass border-white/10 hover:border-white/20')}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${isPassed ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40' : isFailed ? 'bg-rose-500/20 text-rose-500 border border-rose-500/40' : isCurrent ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse' : 'bg-slate-200 dark:bg-white/10 opacity-50'}`}>
                    {isPassed ? '✓' : isFailed ? '✕' : isCurrent ? '⚡' : step.id}
                  </span>
                  <div>
                    <div className="text-xs font-semibold">{step.action}</div>
                    <div className="text-[11px] font-mono opacity-60 truncate max-w-[180px]">{step.selector}</div>
                  </div>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isPassed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : isFailed ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : isCurrent ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'bg-slate-200 dark:bg-white/5 opacity-40'}`}>
                  {isPassed ? 'Passed' : isFailed ? 'Failed' : isSkipped ? 'Skipped' : isCurrent ? 'Running' : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Evidence Viewer Panel (8 Cols) */}
        <div className={`lg:col-span-8 liquid-glass p-5 rounded-2xl ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-4`}>
          <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-white/10'} pb-3 flex-wrap gap-2`}>
            <span className="text-xs font-mono opacity-70">
              Step {selectedEvidenceStepId} Evidence Inspector
            </span>

            <div className={`flex items-center gap-1 ${isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-white/5 border-white/10'} p-1 rounded-full border`}>
              {EVIDENCE_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setEvidenceTab(tab.id)}
                  className={`px-3 py-1 text-[11px] font-medium rounded-full transition-colors cursor-pointer ${evidenceTab === tab.id ? (isLight ? 'bg-slate-900 text-white font-semibold' : 'bg-white text-black font-semibold') : 'opacity-70 hover:opacity-100'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[220px]">
            {/* Bằng chứng thật của bước đang chọn (M6). Tải lại khi bước đổi trạng thái (vừa chạy xong). */}
            <EvidencePanel
              isLight={isLight}
              runId={evidenceRunId}
              stepNo={selectedEvidenceStepId}
              tab={evidenceTab}
              refreshKey={runSteps?.find(step => step.step_no === selectedEvidenceStepId)?.status}
            />
          </div>
        </div>

      </div>
    </section>
    </div>
    </>
  );
};

export default NewTestPage;
