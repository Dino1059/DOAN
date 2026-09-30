// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import { SunIcon, MoonIcon, ArrowUpRightIcon, ShieldCheckIcon } from './Icons';
import { FadingVideo } from './FadingVideo';
import { login, register, ApiError } from '../api';

// Sliding Card Auth Modal
const AuthModal = ({ isOpen, onClose, onLoginSuccess, initialMode = 'signin', theme, onToggleTheme }) => {
  const [isSignUp, setIsSignUp] = React.useState(initialMode === 'signup');
  const [emailInput, setEmailInput] = React.useState('admin123');
  const [passwordInput, setPasswordInput] = React.useState('123');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [signUp, setSignUp] = React.useState({ displayName: '', email: '', password: '', confirmPassword: '' });
  const [signUpError, setSignUpError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setIsSignUp(initialMode === 'signup');
    setErrorMessage('');
    setSignUpError('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  // Backend trả lỗi (sai mật khẩu, email trùng, 422...) → hiện nguyên văn; không kết nối được → báo backend tắt
  const describeError = (err) => (err instanceof ApiError ? err.message : 'Cannot reach the server. Is the backend running?');

  // M7: đăng nhập thật qua POST /auth/login — backend đặt cookie phiên HttpOnly
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    login(emailInput.trim(), passwordInput)
      .then(onLoginSuccess)
      .catch(err => setErrorMessage(describeError(err)))
      .finally(() => setIsSubmitting(false));
  };

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (signUp.password !== signUp.confirmPassword) {
      setSignUpError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setSignUpError('');
    register(signUp)
      .then(onLoginSuccess)
      .catch(err => setSignUpError(describeError(err)))
      .finally(() => setIsSubmitting(false));
  };

  const updateSignUp = (field) => (e) => setSignUp(prev => ({ ...prev, [field]: e.target.value }));

  const fillDemoCredentials = () => {
    setEmailInput('admin123');
    setPasswordInput('123');
    setErrorMessage('');
  };

  const MotionDiv = motion.div || 'div';
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4 transition-all select-none">
      <div className="absolute inset-0" onClick={onClose} />

      <MotionDiv
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`relative w-full max-w-4xl h-[540px] rounded-[2rem] ${isLight ? 'bg-white/95 text-slate-900 border-slate-200 shadow-2xl' : 'liquid-glass-strong text-white border-white/15 shadow-2xl'} overflow-hidden flex border z-10`}
      >
        {/* Theme Toggle & Close Buttons */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            className={`w-9 h-9 rounded-full ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'liquid-glass text-white/80 hover:text-white'} flex items-center justify-center transition-colors cursor-pointer`}
          >
            {isLight ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4 text-amber-300" />}
          </button>

          <button
            onClick={onClose}
            className={`w-9 h-9 rounded-full ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'liquid-glass text-white/70 hover:text-white'} flex items-center justify-center transition-colors cursor-pointer`}
          >
            ✕
          </button>
        </div>

        {/* Form Panels Container */}
        <div className="relative w-full h-full flex">
          {/* Sign In Form (Left side) */}
          <div className={`w-1/2 h-full p-8 md:p-12 flex flex-col justify-between transition-all duration-300 ${isSignUp ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-body ${isLight ? 'text-slate-500' : 'text-white/60'} tracking-wider uppercase`}>// Sign In</span>
                <button 
                  onClick={fillDemoCredentials}
                  type="button"
                  className={`text-[11px] ${isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'liquid-glass text-white/80 hover:text-white'} rounded-full px-2.5 py-0.5 cursor-pointer`}
                >
                  Fill Demo: admin123 / 123
                </button>
              </div>
              <h2 className={`font-heading text-4xl ${isLight ? 'text-slate-900' : 'text-white'}`}>Welcome Back</h2>
              <p className={`mt-1.5 text-xs ${isLight ? 'text-slate-600' : 'text-white/70'} font-body`}>Enter credentials to access your autonomous testing workspace.</p>
              
              {errorMessage && (
                <div className="mt-3 text-xs bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-200 px-3 py-1.5 rounded-full font-body">
                  {errorMessage}
                </div>
              )}

              <form className="mt-4 flex flex-col gap-3.5" onSubmit={handleLoginSubmit}>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Username / Email</label>
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="admin123"
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500' : 'bg-white/5 border-white/15 text-white placeholder-white/30 focus:border-white/50'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="123"
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-slate-500' : 'bg-white/5 border-white/15 text-white placeholder-white/30 focus:border-white/50'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`mt-2 ${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'} rounded-full py-2.5 text-sm font-semibold transition-colors font-body flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60`}
                >
                  <span>{isSubmitting ? 'Signing in…' : 'Sign In to Dashboard'}</span>
                  <ArrowUpRightIcon className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className={`text-center text-xs ${isLight ? 'text-slate-600' : 'text-white/70'} font-body pt-2`}>
              Don't have an account?{' '}
              <button
                onClick={() => setIsSignUp(true)}
                className={`${isLight ? 'text-slate-900 font-bold' : 'text-white font-semibold'} underline hover:opacity-80 transition-colors ml-1 cursor-pointer`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Sign Up Form (Right side) */}
          <div className={`w-1/2 h-full p-8 md:p-12 flex flex-col justify-between transition-all duration-300 ml-auto ${!isSignUp ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div>
              <div className={`text-xs font-body ${isLight ? 'text-slate-500' : 'text-white/60'} tracking-wider uppercase mb-2`}>// Create Account</div>
              <h2 className={`font-heading text-4xl ${isLight ? 'text-slate-900' : 'text-white'}`}>Join Platform</h2>
              <p className={`mt-2 text-xs ${isLight ? 'text-slate-600' : 'text-white/70'} font-body`}>Create an account to save your test sessions and runs.</p>
              
              {signUpError && (
                <div className="mt-3 text-xs bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-200 px-3 py-1.5 rounded-2xl font-body">
                  {signUpError}
                </div>
              )}

              <form className="mt-4 flex flex-col gap-2.5" onSubmit={handleSignUpSubmit}>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={signUp.displayName}
                    onChange={updateSignUp('displayName')}
                    placeholder="Alex Morgan"
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/30'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Work Email</label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={signUp.email}
                    onChange={updateSignUp('email')}
                    placeholder="you@company.com"
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/30'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Password (at least 8 characters)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={signUp.password}
                    onChange={updateSignUp('password')}
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/30'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={signUp.confirmPassword}
                    onChange={updateSignUp('confirmPassword')}
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/30'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`mt-1 ${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'} rounded-full py-2.5 text-sm font-semibold transition-colors font-body flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60`}
                >
                  <span>{isSubmitting ? 'Creating account…' : 'Create Account'}</span>
                  <ArrowUpRightIcon className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div className={`text-center text-xs ${isLight ? 'text-slate-600' : 'text-white/70'} font-body`}>
              Already have an account?{' '}
              <button
                onClick={() => setIsSignUp(false)}
                className={`${isLight ? 'text-slate-900 font-bold' : 'text-white font-semibold'} underline hover:opacity-80 transition-colors ml-1 cursor-pointer`}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Sliding Image Panel (z-20) */}
        <MotionDiv
          animate={{ x: isSignUp ? '-100%' : '0%' }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className={`absolute top-0 right-0 w-1/2 h-full z-20 overflow-hidden ${isLight ? 'border-x border-slate-200' : 'border-x border-white/10'}`}
        >
          <div className="relative w-full h-full bg-gradient-to-br from-neutral-900 via-black to-neutral-950 flex flex-col justify-between p-8 text-white select-none">
            <FadingVideo
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4"
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-40 mix-blend-screen pointer-events-none"
            />

            <div className="relative z-10">
              <span className="liquid-glass rounded-full px-3 py-1 text-[11px] font-body text-white/90 inline-block">
                AI Autonomous QA
              </span>
              <h3 className="font-heading text-3xl mt-4 leading-tight">
                {isSignUp ? "Accelerate Your Release Velocity" : "Experience Testing at AI Speed"}
              </h3>
              <p className="mt-2 text-xs text-white/70 font-body leading-relaxed max-w-[28ch]">
                {isSignUp 
                  ? "Join top engineering teams deploying autonomous self-healing test suites."
                  : "Monitor autonomous test runs, inspect visual regressions, and deploy with total confidence."}
              </p>
            </div>

            <div className="relative z-10 liquid-glass p-4 rounded-[1.25rem] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center shrink-0">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-semibold font-body text-white">99.8% Test Precision</div>
                <div className="text-[10px] text-white/70 font-body">Demo account: admin123 / 123</div>
              </div>
            </div>
          </div>
        </MotionDiv>
      </MotionDiv>
    </div>
  );
};

export default AuthModal;
