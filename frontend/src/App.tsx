// @ts-nocheck
import React from 'react';
import { SunIcon, MoonIcon } from './components/Icons';
import AuthModal from './components/AuthModal';
import { LandingNavbar, LandingHero } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewTestPage } from './pages/NewTestPage';
import { TestRunsPage, RunDetailModal } from './pages/TestRunsPage';
import { EnvironmentsPage, SettingsPage, ReportsPage, ComparisonsPage } from './pages/ExtraModules';
import { InitialTestPlanData, FallbackPlanSteps } from './mockData';
import {
  fetchRunHistory,
  ApiError,
  generatePlan,
  listConversations,
  getConversation,
  updatePlanSteps,
  runTest,
  rerunTest,
  getTask,
  openTaskStream,
  cancelTask,
  pauseTask,
  resumeTask,
  sendHumanInput,
  submitFeedback,
  getMe,
  logout,
  setUnauthorizedHandler,
} from './api';

// Dashboard Workspace — navigation + state shared across modules (execution, runs, selected run)
const DashboardWorkspace = ({ user, onLogout, theme, onToggleTheme }) => {
  const [activeModule, setActiveModule] = React.useState('dashboard');
  const [promptText, setPromptText] = React.useState('Test the password reset feature on test.com');

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [testPlan, setTestPlan] = React.useState(InitialTestPlanData);
  const [hasPlanGenerated, setHasPlanGenerated] = React.useState(true);

  const [executionStatus, setExecutionStatus] = React.useState('Idle');
  const [currentStepIdx, setCurrentStepIdx] = React.useState(3);
  const [selectedEvidenceStepId, setSelectedEvidenceStepId] = React.useState(4);
  const [evidenceTab, setEvidenceTab] = React.useState('network');
  const [recentRuns, setRecentRuns] = React.useState([]); // run thật từ GET /test-runs (M5)
  const [runsVersion, setRunsVersion] = React.useState(0); // tăng khi 1 run kết thúc → trang Test Runs tải lại
  const [executionTimer, setExecutionTimer] = React.useState(18);
  const [selectedRun, setSelectedRun] = React.useState(null);
  const [feedbackRating, setFeedbackRating] = React.useState(0);
  const [feedbackCategory, setFeedbackCategory] = React.useState('Product experience');
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [feedbackNotice, setFeedbackNotice] = React.useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);

  const [activeTaskId, setActiveTaskId] = React.useState(null);
  const [planTaskId, setPlanTaskId] = React.useState(null); // task_id trả về từ generate-plan, dùng để run() tiếp tục đúng plan đó
  // Phiên chat với Planner Agent (M2): lưu ở backend, hiện trong Session History
  const [conversation, setConversation] = React.useState(null); // { id, seq_no, title, ... }
  const [messages, setMessages] = React.useState([]);
  const [planStatus, setPlanStatus] = React.useState(null); // 'draft' | 'approved' | null (plan mẫu, chưa lưu)
  const [planError, setPlanError] = React.useState('');
  const [conversations, setConversations] = React.useState([]);
  const [humanInputText, setHumanInputText] = React.useState('');
  // Run đang theo dõi (M3): trạng thái từng bước, câu hỏi Human Intervention, lỗi khi điều khiển
  const [runSteps, setRunSteps] = React.useState(null); // null = chưa có run thật
  const [humanPrompt, setHumanPrompt] = React.useState(null);
  const [isSimulatedRun, setIsSimulatedRun] = React.useState(false);
  const [runError, setRunError] = React.useState('');
  const [evidenceRunId, setEvidenceRunId] = React.useState(null); // run gần nhất, giữ lại sau khi chạy xong để xem evidence (M6)
  const conversationRef = React.useRef(null);
  conversationRef.current = conversation;
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const isLight = theme === 'light';

  // Recent Runs (Dashboard), danh sách run cho Reports/Comparisons: tải lại mỗi khi có run kết thúc
  React.useEffect(() => {
    fetchRunHistory()
      .then(setRecentRuns)
      .catch(err => console.log("Run history unavailable:", err));
  }, [runsVersion]);

  // Run từ API (GET /tasks/{id}, snapshot SSE, response pause/resume...) → state UI
  const applyRun = React.useCallback((run) => {
    if (!run) return;
    setExecutionStatus(run.status);
    setRunSteps(run.steps);
    setHumanPrompt(run.human_prompt || null);
    setIsSimulatedRun(run.runner === 'simulated');
    if (run.current_step > 0) setCurrentStepIdx(run.current_step - 1);
  }, []);

  const refreshMessages = React.useCallback(() => {
    const conv = conversationRef.current;
    if (!conv) return;
    getConversation(conv.id).then(res => setMessages(res.data.messages)).catch(() => {});
  }, []);

  // Realtime qua SSE /tasks/stream/{id}: snapshot trước, sau đó từng sự kiện step/status.
  // Mất kết nối thì EventSource tự nối lại và nhận snapshot mới, nên không cần poll.
  React.useEffect(() => {
    if (!activeTaskId) return;
    const eventSource = openTaskStream(activeTaskId);

    const finish = () => {
      eventSource.close();
      // Đọc lại 1 lần: bước bị Stop giữa chừng được backend đổi thành skipped mà không phát sự kiện
      getTask(activeTaskId).then(res => applyRun(res.data)).catch(() => {});
      setActiveTaskId(null);
      setRunsVersion(v => v + 1);
      refreshMessages();
    };

    eventSource.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (e) { return; }
      if (data.type === 'snapshot') {
        applyRun(data);
        if (['completed', 'failed', 'cancelled'].includes(data.status)) finish();
      } else if (data.type === 'step') {
        setRunSteps(prev => prev && prev.map(step => step.step_no === data.step_no
          ? { ...step, status: data.status, observation: data.observation ?? step.observation, duration_ms: data.duration_ms ?? step.duration_ms }
          : step));
        if (data.status === 'running') {
          setCurrentStepIdx(data.step_no - 1);
          setSelectedEvidenceStepId(data.step_no);
        }
      } else if (data.type === 'status') {
        setExecutionStatus(data.status);
        setHumanPrompt(data.human_prompt || null);
        if (['completed', 'failed', 'cancelled'].includes(data.status)) finish();
      }
    };
    eventSource.onerror = () => {
      // 404 (run không còn) → trình duyệt đóng hẳn stream; lấy trạng thái cuối bằng GET
      if (eventSource.readyState === EventSource.CLOSED) {
        getTask(activeTaskId).then(res => applyRun(res.data)).catch(() => {});
      }
    };

    return () => eventSource.close();
  }, [activeTaskId, applyRun, refreshMessages]);

  React.useEffect(() => {
    let timer;
    if (executionStatus === 'running') {
      timer = setInterval(() => {
        setExecutionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [executionStatus]);

  // Plan từ API (snake_case) → dạng UI đang dùng
  const applyPlan = (p) => {
    setPlanTaskId(p.task_id || p.plan_id || null);
    setPlanStatus(p.status || null);
    setTestPlan({
      objective: p.objective,
      targetUrl: p.target_url,
      preconditions: p.preconditions || [],
      testData: p.test_data || {},
      steps: p.steps || [],
      version: p.version,
    });
  };

  const loadConversations = React.useCallback((q) => {
    listConversations(q)
      .then(res => setConversations(res.data || []))
      .catch(err => console.log("Session history unavailable:", err));
  }, []);

  React.useEffect(() => { loadConversations(); }, [loadConversations]);

  const handleGeneratePlan = () => {
    if (!promptText.trim() || isGenerating) return;
    setIsGenerating(true);
    setPlanError('');

    generatePlan(promptText, conversation?.id)
      .then(res => {
        const p = res.data;
        applyPlan(p);
        const isNewConversation = !conversation || conversation.id !== p.conversation_id;
        setConversation(p.conversation);
        setMessages(prev => (isNewConversation ? p.messages : [...prev, ...p.messages]));
        setHasPlanGenerated(true);
        loadConversations();
      })
      .catch(err => {
        if (err instanceof ApiError) {
          // Backend có trả lời nhưng báo lỗi (LLM lỗi, thiếu key...): giữ plan hiện tại, báo rõ cho user
          setPlanError(err.message);
          return;
        }
        console.log("Backend offline, using fallback plan generator:", err);
        setPlanError('Backend is offline — showing a sample plan that is not saved.');
        setHasPlanGenerated(true);
        setPlanTaskId(null);
        setPlanStatus(null);
        setTestPlan({
          objective: `Test scenario derived from: "${promptText}"`,
          targetUrl: promptText.includes('test.com') ? "https://test.com/forgot-password" : "https://app.example.com",
          preconditions: ["Target app service online", "Session state initialized"],
          testData: { user: "demo_tester@test.com", inputPayload: "valid_request" },
          steps: FallbackPlanSteps
        });
      })
      .finally(() => setIsGenerating(false));
  };

  // Mở lại một phiên trong Session History: tin nhắn cũ + plan mới nhất
  const handleOpenConversation = (conversationId) => {
    setPlanError('');
    getConversation(conversationId)
      .then(res => {
        const { conversation: conv, messages: msgs, latest_plan } = res.data;
        setConversation(conv);
        setMessages(msgs);
        if (latest_plan) applyPlan(latest_plan);
        const lastUserMessage = [...msgs].reverse().find(m => m.role === 'user');
        if (lastUserMessage) setPromptText(lastUserMessage.content);
      })
      .catch(err => setPlanError(err.message || 'Unable to open this session.'));
  };

  const handleNewConversation = () => {
    setConversation(null);
    setMessages([]);
    setPlanError('');
    setPromptText('');
  };

  // Lưu bước sau khi sửa trực tiếp. Plan mẫu (chưa lưu backend) thì chỉ đổi ở trình duyệt.
  const handleSavePlanSteps = (steps) => {
    setTestPlan(prev => ({ ...prev, steps }));
    if (!planTaskId || planStatus !== 'draft') return;
    updatePlanSteps(planTaskId, steps)
      .then(res => applyPlan(res.data))
      .catch(err => setPlanError(err.message || 'Unable to save plan changes.'));
  };

  const handleConfirmAndRun = () => {
    if (activeTaskId) return; // đang có run chạy: không tạo run thứ hai khi bấm lại
    setRunError('');
    setExecutionStatus('queued');
    setCurrentStepIdx(0);
    setSelectedEvidenceStepId(1);
    setExecutionTimer(0);
    setHumanPrompt(null);
    setRunSteps(testPlan.steps.map(step => ({ ...step, status: 'pending', observation: null })));

    runTest(promptText, planTaskId, testPlan.steps)
      .then(taskId => {
        setActiveTaskId(taskId);
        setEvidenceRunId(taskId);
        setRunsVersion(v => v + 1); // run mới (queued) hiện ngay trong Test Runs / Recent Runs
        // Backend khoá plan khi chạy: muốn sửa tiếp thì gửi tin nhắn để tạo phiên bản mới
        if (planStatus === 'draft') {
          setPlanStatus('approved');
          loadConversations();
        }
        refreshMessages(); // tin "Test run … started" trong khung chat
      })
      .catch(err => {
        setExecutionStatus('Idle');
        setRunSteps(null);
        setRunError(err instanceof ApiError ? err.message : 'Backend is offline — cannot start the run.');
      });
  };

  // Re-run ở trang Test Runs: chạy lại đúng các bước của run cũ, rồi mở New Test để theo dõi
  const handleRerun = (run) => {
    setRunError('');
    rerunTest(run.id)
      .then(taskId => getTask(taskId).then(res => {
        const r = res.data;
        setTestPlan(prev => ({
          ...prev,
          objective: r.name,
          steps: r.steps.map(({ id, action, selector, expected }) => ({ id, action, selector, expected })),
        }));
        applyRun(r);
        setExecutionTimer(0);
        setActiveTaskId(taskId);
        setEvidenceRunId(taskId);
        setRunsVersion(v => v + 1);
      }))
      .catch(err => setRunError(err instanceof ApiError ? err.message : 'Backend is offline — cannot re-run.'))
      .finally(() => setActiveModule('new-test'));
  };

  // Lỗi điều khiển (vd: 409 vì run vừa kết thúc) → hiện lỗi, đồng bộ lại trạng thái thật
  const controlFailed = (err) => {
    setRunError(err.message || 'Unable to control this run.');
    if (activeTaskId) getTask(activeTaskId).then(res => applyRun(res.data)).catch(() => {});
  };

  const handleStopTest = () => {
    if (!activeTaskId) return;
    setRunError('');
    cancelTask(activeTaskId).then(res => applyRun(res.data)).catch(controlFailed);
  };

  const handlePauseTest = () => {
    if (!activeTaskId) return;
    setRunError('');
    (executionStatus === 'paused' ? resumeTask : pauseTask)(activeTaskId)
      .then(res => applyRun(res.data))
      .catch(controlFailed);
  };

  const handleSendHumanInput = () => {
    if (!activeTaskId || !humanInputText.trim()) return;
    setRunError('');
    sendHumanInput(activeTaskId, humanInputText.trim())
      .then(res => {
        setHumanInputText('');
        applyRun(res.data);
      })
      .catch(controlFailed);
  };

  const handleFeedbackSubmit = (event) => {
    event.preventDefault();
    if (isSubmittingFeedback) return;
    if (!feedbackRating || !feedbackMessage.trim()) {
      setFeedbackNotice('Please choose a rating and share a comment before sending.');
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackNotice('');
    submitFeedback({
      rating: feedbackRating,
      category: feedbackCategory,
      message: feedbackMessage.trim(),
      username: user?.username || ''
    })
      .then(() => {
        setFeedbackNotice('Thanks — your feedback has been received.');
        setFeedbackMessage('');
        setFeedbackRating(0);
      })
      .catch(error => {
        setFeedbackNotice(error.message || 'Unable to save feedback.');
      })
      .finally(() => setIsSubmittingFeedback(false));
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'} font-body flex flex-col transition-colors`}>
      {/* NAVIGATION BAR */}
      <header className={`sticky top-0 z-40 ${isLight ? 'bg-white/80 border-slate-200' : 'bg-black/80 border-white/10'} backdrop-blur-xl border-b px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center font-heading text-xl text-white pb-0.5">a</div>
            <span className={`font-heading text-xl tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Agent Tester</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1 liquid-glass rounded-full px-2 py-1">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'new-test', label: 'New Test' },
              { id: 'test-runs', label: 'Test Runs' },
              { id: 'test-cases', label: 'Test Cases' },
              { id: 'comparisons', label: 'Comparisons' },
              { id: 'reports', label: 'Reports' },
              { id: 'environments', label: 'Environments' },
              { id: 'settings', label: 'Settings' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${activeModule === item.id ? (isLight ? 'bg-slate-900 text-white font-semibold' : 'bg-white text-black font-semibold') : (isLight ? 'text-slate-700 hover:text-slate-950' : 'text-white/80 hover:text-white')}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Icon Button */}
          <button
            onClick={onToggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            className={`p-2 rounded-full ${isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'liquid-glass text-white hover:bg-white/20'} transition-colors cursor-pointer`}
          >
            {isLight ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4 text-amber-300" />}
          </button>


          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              aria-expanded={isUserMenuOpen}
              className={`text-xs font-medium cursor-pointer ${isLight ? 'text-slate-900' : 'text-white'}`}
            >
              User: {user.username}
            </button>
            {isUserMenuOpen && (
              <div className={`absolute right-0 top-full mt-3 z-50 w-56 rounded-2xl border p-3 shadow-xl ${isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/15 text-white'}`}>
                <div className={`border-b pb-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  <div className="text-sm font-semibold">{user.username}</div>
                  <div className={`mt-0.5 text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}>{user.name || 'Administrator'}</div>
                </div>
                <button
                  type="button"
                  className={`mt-2 w-full rounded-lg px-3 py-2 text-left text-xs cursor-pointer ${isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-white/80 hover:bg-white/10'}`}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-xs cursor-pointer ${isLight ? 'text-rose-600 hover:bg-rose-50' : 'text-rose-300 hover:bg-rose-500/10'}`}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN DASHBOARD BODY */}
      <main className="flex-1 p-6 max-w-[1600px] w-full mx-auto space-y-6">

        {activeModule === 'dashboard' && (
          <DashboardPage
            isLight={isLight}
            executionStatus={executionStatus}
            promptText={promptText}
            setPromptText={setPromptText}
            setActiveModule={setActiveModule}
            recentRuns={recentRuns}
            setSelectedRun={setSelectedRun}
            hasPlanGenerated={hasPlanGenerated}
            feedbackRating={feedbackRating}
            setFeedbackRating={setFeedbackRating}
            feedbackCategory={feedbackCategory}
            setFeedbackCategory={setFeedbackCategory}
            feedbackMessage={feedbackMessage}
            setFeedbackMessage={setFeedbackMessage}
            feedbackNotice={feedbackNotice}
            setFeedbackNotice={setFeedbackNotice}
            isSubmittingFeedback={isSubmittingFeedback}
            handleFeedbackSubmit={handleFeedbackSubmit}
          />
        )}

        {activeModule === 'new-test' && (
          <NewTestPage
            isLight={isLight}
            promptText={promptText}
            setPromptText={setPromptText}
            testPlan={testPlan}
            setTestPlan={setTestPlan}
            hasPlanGenerated={hasPlanGenerated}
            isGenerating={isGenerating}
            executionStatus={executionStatus}
            currentStepIdx={currentStepIdx}
            runSteps={runSteps}
            evidenceRunId={evidenceRunId}
            humanPrompt={humanPrompt}
            isSimulatedRun={isSimulatedRun}
            runError={runError}
            selectedEvidenceStepId={selectedEvidenceStepId}
            setSelectedEvidenceStepId={setSelectedEvidenceStepId}
            evidenceTab={evidenceTab}
            setEvidenceTab={setEvidenceTab}
            executionTimer={executionTimer}
            humanInputText={humanInputText}
            setHumanInputText={setHumanInputText}
            handleGeneratePlan={handleGeneratePlan}
            conversation={conversation}
            messages={messages}
            conversations={conversations}
            planStatus={planStatus}
            planError={planError}
            onSearchConversations={loadConversations}
            onOpenConversation={handleOpenConversation}
            onNewConversation={handleNewConversation}
            onSavePlanSteps={handleSavePlanSteps}
            handleConfirmAndRun={handleConfirmAndRun}
            handlePauseTest={handlePauseTest}
            handleStopTest={handleStopTest}
            handleSendHumanInput={handleSendHumanInput}
          />
        )}

        {activeModule === 'test-runs' && (
          <TestRunsPage
            isLight={isLight}
            setSelectedRun={setSelectedRun}
            setActiveModule={setActiveModule}
            onRerun={handleRerun}
            refreshKey={runsVersion}
          />
        )}

        {activeModule === 'environments' && <EnvironmentsPage isLight={isLight} />}

        {activeModule === 'settings' && <SettingsPage isLight={isLight} user={user} />}

        {activeModule === 'reports' && <ReportsPage isLight={isLight} recentRuns={recentRuns} />}

        {activeModule === 'comparisons' && <ComparisonsPage isLight={isLight} recentRuns={recentRuns} />}

        {!['dashboard', 'new-test', 'test-runs', 'environments', 'settings', 'reports', 'comparisons'].includes(activeModule) && (
          <section className={`liquid-glass-strong rounded-[1.5rem] p-12 ${isLight ? 'border-slate-200' : 'border-white/10'} border text-center space-y-2`}>
            <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider`}>// Coming Soon</div>
            <h3 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>This module is under construction</h3>
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-white/60'}`}>Return to Dashboard or New Test to continue.</p>
          </section>
        )}

      </main>

      <RunDetailModal
        isLight={isLight}
        run={selectedRun}
        onClose={() => setSelectedRun(null)}
        selectedEvidenceStepId={selectedEvidenceStepId}
        setSelectedEvidenceStepId={setSelectedEvidenceStepId}
        evidenceTab={evidenceTab}
        setEvidenceTab={setEvidenceTab}
      />
    </div>
  );
};

// Root Main App Component with Theme State
// User từ API (M7) → dạng header đang dùng: user.username, user.name
const toUiUser = (u) => ({ id: u.id, username: u.username, email: u.email, name: u.display_name });

export const App = () => {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isCheckingSession, setIsCheckingSession] = React.useState(true);
  const [authModalState, setAuthModalState] = React.useState({ isOpen: false, mode: 'signin' });

  // Mở trang / reload: còn phiên (cookie HttpOnly) thì vào thẳng Dashboard
  React.useEffect(() => {
    getMe()
      .then(u => setCurrentUser(toUiUser(u)))
      .catch(() => setCurrentUser(null))
      .finally(() => setIsCheckingSession(false));
  }, []);

  // API trả 401 giữa chừng (phiên hết hạn, đăng xuất ở tab khác) → về màn hình đăng nhập
  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      setCurrentUser(prev => {
        if (prev) setAuthModalState({ isOpen: true, mode: 'signin' });
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, []);
  const [theme, setTheme] = React.useState('light'); // 'dark' | 'light'

  React.useEffect(() => {
    document.body.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      return next;
    });
  };

  const handleOpenAuth = (mode = 'signin') => {
    setAuthModalState({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(toUiUser(user));
    setAuthModalState({ isOpen: false, mode: 'signin' });
  };

  const handleLogout = () => {
    logout().catch(() => {}).finally(() => setCurrentUser(null));
  };

  if (isCheckingSession) {
    return <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-50' : 'bg-black'}`} />;
  }

  if (currentUser) {
    return (
      <DashboardWorkspace
        user={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'} relative selection:bg-white selection:text-black transition-colors`}>
      <LandingNavbar
        onOpenAuth={handleOpenAuth}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
      <LandingHero
        onOpenAuth={handleOpenAuth}
        theme={theme}
      />
      <AuthModal
        isOpen={authModalState.isOpen}
        initialMode={authModalState.mode}
        onClose={handleCloseAuth}
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
};

export default App;
