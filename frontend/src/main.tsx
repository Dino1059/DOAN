// @ts-nocheck
import React from 'react';
import * as ReactDOM from 'react-dom/client';
import { motion } from 'framer-motion';
import './index.css';

// Suppress benign Framer Motion dev warnings about list keys
const origError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && (args[0].includes('Warning: Each child in a list') || args[0].includes('Framer Motion'))) return;
  origError(...args);
};

// SVG Icons
const ArrowUpRightIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

const PlayIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4" />
  </svg>
);

const ShieldCheckIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ZapIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SunIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const PauseIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const StopIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

// FadingVideo component (custom JS crossfade, no CSS transitions)
const FadingVideo = ({ src, className, style }) => {
  const videoRef = React.useRef(null);
  const rafIdRef = React.useRef(null);
  const fadingOutRef = React.useRef(false);

  const FADE_MS = 500;
  const FADE_OUT_LEAD = 0.55;

  const fadeTo = React.useCallback((target, duration) => {
    const video = videoRef.current;
    if (!video) return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const currentOpacity = parseFloat(video.style.opacity) || 0;
    const startOpacity = currentOpacity;
    const opacityDiff = target - startOpacity;
    if (Math.abs(opacityDiff) < 0.001) {
      video.style.opacity = target.toString();
      return;
    }

    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newOpacity = startOpacity + opacityDiff * progress;
      if (videoRef.current) {
        videoRef.current.style.opacity = newOpacity.toString();
      }

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(step);
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      video.style.opacity = '0';
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      fadeTo(1, FADE_MS);
    };

    const handleTimeUpdate = () => {
      if (!video.duration || isNaN(video.duration)) return;
      const remaining = video.duration - video.currentTime;
      if (!fadingOutRef.current && remaining <= FADE_OUT_LEAD && remaining > 0) {
        fadingOutRef.current = true;
        fadeTo(0, FADE_MS);
      }
    };

    const handleEnded = () => {
      video.style.opacity = '0';
      setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
        fadingOutRef.current = false;
        fadeTo(1, FADE_MS);
      }, 100);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    if (video.readyState >= 2) {
      handleLoadedData();
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [fadeTo, src]);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={className}
      style={{ opacity: 0, ...style }}
    />
  );
};

// BlurText Component
const BlurText = ({ text, className = '' }) => {
  const containerRef = React.useRef(null);
  const [isInView, setIsInView] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const words = text.split(' ');
  const MotionSpan = motion.span || 'span';

  return (
    <p
      ref={containerRef}
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', rowGap: '0.1em' }}
    >
      {words.map((word, i) => (
        <MotionSpan
          key={i}
          initial={{ filter: 'blur(10px)', opacity: 0, y: 50 }}
          animate={
            isInView
              ? {
                  filter: ['blur(10px)', 'blur(5px)', 'blur(0px)'],
                  opacity: [0, 0.5, 1],
                  y: [50, -5, 0],
                }
              : { filter: 'blur(10px)', opacity: 0, y: 50 }
          }
          transition={{
            duration: 0.7,
            times: [0, 0.5, 1],
            ease: 'easeOut',
            delay: (i * 100) / 1000,
          }}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
        >
          {word}
        </MotionSpan>
      ))}
    </p>
  );
};

// Sliding Card Auth Modal
const AuthModal = ({ isOpen, onClose, onLoginSuccess, initialMode = 'signin', theme, onToggleTheme }) => {
  const [isSignUp, setIsSignUp] = React.useState(initialMode === 'signup');
  const [emailInput, setEmailInput] = React.useState('admin123');
  const [passwordInput, setPasswordInput] = React.useState('123');
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    setIsSignUp(initialMode === 'signup');
    setErrorMessage('');
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    const pass = passwordInput.trim();

    if ((email === 'admin123' || email === 'admin123@example.com') && pass === '123') {
      setErrorMessage('');
      onLoginSuccess({ username: 'admin123', name: 'Administrator' });
    } else {
      setErrorMessage('Invalid username or password! (Use: admin123 / 123)');
    }
  };

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
                  className={`mt-2 ${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'} rounded-full py-2.5 text-sm font-semibold transition-colors font-body flex items-center justify-center gap-1.5 cursor-pointer`}
                >
                  <span>Sign In to Dashboard</span>
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
              <p className={`mt-2 text-xs ${isLight ? 'text-slate-600' : 'text-white/70'} font-body`}>Start your 14-day free trial of autonomous testing.</p>
              
              <form className="mt-5 flex flex-col gap-3.5" onSubmit={(e) => { e.preventDefault(); onLoginSuccess({ username: 'admin123', name: 'Administrator' }); }}>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Full Name</label>
                  <input
                    type="text"
                    placeholder="Alex Morgan"
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/30'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Work Email</label>
                  <input
                    type="email"
                    placeholder="admin123@example.com"
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/30'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-body ${isLight ? 'text-slate-700' : 'text-white/80'} mb-1`}>Password</label>
                  <input
                    type="password"
                    placeholder="123"
                    className={`w-full ${isLight ? 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/30'} border rounded-full px-4 py-2 text-sm focus:outline-none font-body`}
                  />
                </div>
                <button
                  type="submit"
                  className={`mt-1 ${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'} rounded-full py-2.5 text-sm font-semibold transition-colors font-body flex items-center justify-center gap-1.5 cursor-pointer`}
                >
                  <span>Create Account</span>
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
                <div className="text-[10px] text-white/70 font-body">Login credentials: admin123 / 123</div>
              </div>
            </div>
          </div>
        </MotionDiv>
      </MotionDiv>
    </div>
  );
};

// Landing Page Navbar
const LandingNavbar = ({ onOpenAuth, theme, onToggleTheme }) => {
  const isLight = theme === 'light';
  return (
    <header className="fixed top-4 left-0 right-0 px-8 lg:px-16 z-40 flex items-center justify-between pointer-events-none">
      <div 
        onClick={() => onOpenAuth('signin')}
        className="w-12 h-12 rounded-full liquid-glass flex items-center justify-center pointer-events-auto cursor-pointer"
      >
        <span className={`font-heading ${isLight ? 'text-slate-900' : 'text-white'} text-2xl pb-1 select-none`}>a</span>
      </div>

      <nav className="hidden md:flex items-center liquid-glass rounded-full px-1.5 py-1.5 gap-1.5 pointer-events-auto">
        {['Platform', 'Agents', 'Suites', 'Integrations', 'Pricing'].map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase().replace(/\s+/g, '-')}`}
            className={`px-3 py-2 text-sm font-medium ${isLight ? 'text-slate-700 hover:text-slate-950' : 'text-white/90 hover:text-white'} font-body transition-colors cursor-pointer`}
          >
            {link}
          </a>
        ))}

        {/* Theme Toggle Icon Button */}
        <button
          onClick={onToggleTheme}
          title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          className={`p-2 rounded-full ${isLight ? 'bg-slate-200/80 text-slate-800 hover:bg-slate-300' : 'bg-white/10 text-white hover:bg-white/20'} transition-colors cursor-pointer ml-1`}
        >
          {isLight ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4 text-amber-300" />}
        </button>

        <button 
          onClick={() => onOpenAuth('signin')}
          className={`${isLight ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-white text-black hover:bg-white/90'} rounded-full px-4 py-2 text-sm font-medium flex items-center gap-1.5 font-body cursor-pointer transition-colors whitespace-nowrap ml-1`}
        >
          <span>Sign In</span>
          <ArrowUpRightIcon className="h-4 w-4" />
        </button>
      </nav>

      <div className="w-12 h-12 invisible" aria-hidden="true" />
    </header>
  );
};

// Landing Hero Section
const LandingHero = ({ onOpenAuth, theme }) => {
  const MotionDiv = motion.div || 'div';
  const MotionP = motion.p || 'p';
  const isLight = theme === 'light';

  return (
    <section className={`relative min-h-screen w-full ${isLight ? 'bg-slate-50 text-slate-900' : 'bg-black text-white'} flex flex-col justify-between overflow-hidden select-none`}>
      <FadingVideo
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4"
        className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0 opacity-80"
        style={{ width: "120%", height: "120%" }}
      />

      <div className="relative z-10 flex flex-col min-h-screen justify-between pt-24">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 pt-12 pb-8">
          <MotionDiv
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
            onClick={() => onOpenAuth('signin')}
            className="liquid-glass rounded-full p-1 pr-3 flex items-center gap-2.5 cursor-pointer hover:bg-white/20 transition-colors"
          >
            <span className={`${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'} rounded-full px-3 py-1 text-xs font-semibold font-body`}>New</span>
            <span className={`text-sm ${isLight ? 'text-slate-800' : 'text-white/90'} font-body`}>Autonomous AI Testing Engine 2.0 Released (Login: admin123 / 123)</span>
          </MotionDiv>

          <BlurText
            text="Autonomous Testing Powered by AI"
            className={`text-6xl md:text-7xl lg:text-[5.5rem] font-heading ${isLight ? 'text-slate-950' : 'text-white'} leading-[0.8] max-w-2xl justify-center tracking-[-4px] mt-6`}
          />

          <MotionP
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
            className={`mt-4 text-sm md:text-base ${isLight ? 'text-slate-700 font-normal' : 'text-white font-light'} max-w-2xl font-body leading-tight`}
          >
            Deliver flawless software faster than ever. Our autonomous AI agents auto-discover user journeys, generate self-healing test suites, and execute continuous QA across web and mobile platforms effortlessly.
          </MotionP>

          <MotionDiv
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease: 'easeOut' }}
            className="flex items-center gap-6 mt-6"
          >
            <button 
              onClick={() => onOpenAuth('signin')}
              className={`liquid-glass-strong rounded-full px-5 py-2.5 text-sm font-medium ${isLight ? 'text-slate-900 bg-white/90 hover:bg-white' : 'text-white hover:bg-white/10'} flex items-center gap-2 cursor-pointer transition-colors font-body`}
            >
              <span>Start Free Trial</span>
              <ArrowUpRightIcon className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onOpenAuth('signin')}
              className={`flex items-center gap-2 text-sm font-medium ${isLight ? 'text-slate-800 hover:text-slate-950' : 'text-white/90 hover:text-white'} transition-colors cursor-pointer font-body`}
            >
              <span>Watch AI Demo</span>
              <PlayIcon className="h-4 w-4" />
            </button>
          </MotionDiv>

          <MotionDiv
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3, ease: 'easeOut' }}
            className="flex items-stretch gap-4 mt-8"
          >
            <div className="liquid-glass p-5 w-[220px] rounded-[1.25rem] flex flex-col justify-between items-start text-left">
              <ShieldCheckIcon className={`w-[28px] h-[28px] ${isLight ? 'text-slate-800' : 'text-white'}`} />
              <div className="mt-4">
                <div className={`text-4xl font-heading tracking-[-1px] leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>99.8%</div>
                <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-white'} font-body font-light mt-2`}>Automated Test Coverage</div>
              </div>
            </div>
            <div className="liquid-glass p-5 w-[220px] rounded-[1.25rem] flex flex-col justify-between items-start text-left">
              <ZapIcon className={`w-[28px] h-[28px] ${isLight ? 'text-slate-800' : 'text-white'}`} />
              <div className="mt-4">
                <div className={`text-4xl font-heading tracking-[-1px] leading-none ${isLight ? 'text-slate-900' : 'text-white'}`}>10x</div>
                <div className={`text-xs ${isLight ? 'text-slate-600' : 'text-white'} font-body font-light mt-2`}>Faster Release Velocity</div>
              </div>
            </div>
          </MotionDiv>
        </div>

        <MotionDiv
          initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
          animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 pb-8"
        >
          <div className={`liquid-glass rounded-full px-3.5 py-1 text-xs font-medium ${isLight ? 'text-slate-800' : 'text-white'} font-body`}>
            Seamlessly integrates with your modern DevOps stack
          </div>
          <div className={`font-heading ${isLight ? 'text-slate-900' : 'text-white'} text-2xl md:text-3xl tracking-tight flex items-center justify-center gap-10 md:gap-16 flex-wrap`}>
            <span>GitHub</span>
            <span>GitLab</span>
            <span>Playwright</span>
            <span>Cypress</span>
            <span>Jira</span>
            <span>Jenkins</span>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
};

// Dashboard Workspace
const InitialTestPlanData = {
  objective: "Verify Forgot Password flow on target web application",
  targetUrl: "https://test.com/forgot-password",
  preconditions: ["Target app test.com server online", "Valid user email registered in test database"],
  testData: { email: "user@test.com", expectedToast: "Password reset link sent" },
  steps: [
    { id: 1, action: "Open URL", selector: "https://test.com/login", expected: "Login page loaded with email input" },
    { id: 2, action: "Click Element", selector: "#forgot-password-link", expected: "Navigate to /forgot-password page" },
    { id: 3, action: "Fill Form Input", selector: "#email-input", expected: "Email 'user@test.com' entered" },
    { id: 4, action: "Click Submit Button", selector: "#send-reset-btn", expected: "API POST /api/auth/forgot-password triggered" },
    { id: 5, action: "Verify Toast Notification", selector: ".toast-success", expected: "Success notification displayed" },
    { id: 6, action: "Verify Email Response API", selector: "POST /api/auth/forgot-password", expected: "HTTP 200 with reset token payload" },
  ]
};

const InitialRecentRuns = [
  { id: "RUN-9421", name: "Forgot Password E2E Flow", suite: "Authentication", env: "Staging (test.com)", browser: "Chromium v124", status: "completed", duration: "18.4s", startTime: "10 mins ago", passedSteps: 6, failedSteps: 0 },
  { id: "RUN-9420", name: "Checkout Coupon Discount", suite: "E-Commerce", env: "Staging (test.com)", browser: "Firefox v123", status: "completed", duration: "42.1s", startTime: "1 hour ago", passedSteps: 8, failedSteps: 0 },
  { id: "RUN-9419", name: "User Registration Validation", suite: "Authentication", env: "Production Pre-release", browser: "WebKit v17.4", status: "failed", duration: "24.6s", startTime: "3 hours ago", passedSteps: 4, failedSteps: 1 },
  { id: "RUN-9418", name: "Profile Avatar Upload", suite: "User Settings", env: "Staging (test.com)", browser: "Chromium v124", status: "completed", duration: "14.2s", startTime: "5 hours ago", passedSteps: 5, failedSteps: 0 },
  { id: "RUN-9417", name: "API Rate Limiting Test", suite: "Security API", env: "Sandbox Engine", browser: "Headless Node API", status: "completed", duration: "08.9s", startTime: "Yesterday", passedSteps: 3, failedSteps: 0 }
];

// Backend API Base URL
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const DashboardWorkspace = ({ user, onLogout, theme, onToggleTheme }) => {
  const [activeModule, setActiveModule] = React.useState('dashboard');
  const [promptText, setPromptText] = React.useState('Test the password reset feature on test.com');
  
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [testPlan, setTestPlan] = React.useState(InitialTestPlanData);
  const [hasPlanGenerated, setHasPlanGenerated] = React.useState(true);
  const [isEditingPlan, setIsEditingPlan] = React.useState(false);

  const [executionStatus, setExecutionStatus] = React.useState('Idle');
  const [currentStepIdx, setCurrentStepIdx] = React.useState(3);
  const [selectedEvidenceStepId, setSelectedEvidenceStepId] = React.useState(4);
  const [evidenceTab, setEvidenceTab] = React.useState('network');
  const [recentRuns, setRecentRuns] = React.useState(InitialRecentRuns);
  const [executionTimer, setExecutionTimer] = React.useState(18);
  const [selectedRun, setSelectedRun] = React.useState(null);
  const [runSearch, setRunSearch] = React.useState('');
  const [runStatusFilter, setRunStatusFilter] = React.useState('All');
  const [runSuiteFilter, setRunSuiteFilter] = React.useState('All');
  const [runEnvironmentFilter, setRunEnvironmentFilter] = React.useState('All');
  const [runBrowserFilter, setRunBrowserFilter] = React.useState('All');
  const [runDateFilter, setRunDateFilter] = React.useState('All time');
  const [runPage, setRunPage] = React.useState(1);
  const [selectedRunIds, setSelectedRunIds] = React.useState([]);
  const [environments, setEnvironments] = React.useState([
    { id: 1, name: 'Staging', baseUrl: 'https://test.com', browser: 'Chromium', llm: 'Gemini 2.0 Flash', status: 'Connected', headless: 'On' },
    { id: 2, name: 'Production Pre-release', baseUrl: 'https://app.prod.com', browser: 'WebKit', llm: 'OpenAI GPT-4o', status: 'Connection Error', headless: 'Off' },
    { id: 3, name: 'Sandbox Engine', baseUrl: 'https://internal.sandbox', browser: 'Headless Node', llm: 'Hub1', status: 'Connected', headless: 'On' }
  ]);
  const [environmentForm, setEnvironmentForm] = React.useState({ name: 'Staging', baseUrl: 'https://test.com', browser: 'Chromium', headless: 'On', llm: 'Gemini' });
  const [editingEnvironmentId, setEditingEnvironmentId] = React.useState(null);
  const [environmentNotice, setEnvironmentNotice] = React.useState('');
  const [settingsTab, setSettingsTab] = React.useState('Profile');
  const [settingsNotice, setSettingsNotice] = React.useState('');
  const [reports, setReports] = React.useState([
    { id: 'RPT-2201', runId: 'RUN-9421', format: 'Markdown', created: '10 mins ago', name: 'Forgot Password E2E Flow', status: 'Passed', duration: '18.4s', failedStep: '—' },
    { id: 'RPT-2200', runId: 'RUN-9419', format: 'PDF', created: '3 hours ago', name: 'User Registration Validation', status: 'Failed', duration: '24.6s', failedStep: 'Step 4 / 4' }
  ]);
  const [reportSearch, setReportSearch] = React.useState('');
  const [reportFormatFilter, setReportFormatFilter] = React.useState('All');
  const [reportSuiteFilter, setReportSuiteFilter] = React.useState('All');
  const [reportDateFilter, setReportDateFilter] = React.useState('All time');
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [comparisonRunA, setComparisonRunA] = React.useState('RUN-9419');
  const [comparisonRunB, setComparisonRunB] = React.useState('RUN-9420');
  const [comparisonReady, setComparisonReady] = React.useState(false);
  const [reportNotice, setReportNotice] = React.useState('');
  const [feedbackRating, setFeedbackRating] = React.useState(0);
  const [feedbackCategory, setFeedbackCategory] = React.useState('Product experience');
  const [feedbackMessage, setFeedbackMessage] = React.useState('');
  const [feedbackNotice, setFeedbackNotice] = React.useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = React.useState(false);
  const [chatHistorySearch, setChatHistorySearch] = React.useState('');
  const [chatHistory] = React.useState([
    { id: 1, title: 'Forgot Password E2E Flow', prompt: 'Test the password reset feature on test.com', time: 'Just now', steps: 5, status: 'Passed', group: 'Today' },
    { id: 2, title: 'Checkout Coupon Discount', prompt: 'Automate user checkout flow with discount coupon on store.com', time: '2 hours ago', steps: 8, status: 'Passed', group: 'Today' },
    { id: 3, title: 'User Registration Validation', prompt: 'Validate user signup form inputs and email verification endpoint', time: 'Yesterday', steps: 4, status: 'Failed', group: 'Yesterday' },
    { id: 4, title: 'Profile Avatar Upload', prompt: 'Test profile avatar upload on test.com', time: 'Yesterday', steps: 5, status: 'Passed', group: 'Yesterday' },
    { id: 5, title: 'API Rate Limiting Test', prompt: 'Validate API rate limiting behavior', time: '5 days ago', steps: 3, status: 'Passed', group: 'Older' }
  ]);

  const [activeTaskId, setActiveTaskId] = React.useState(null);
  const [humanInputText, setHumanInputText] = React.useState('');
  const [humanInputVisible, setHumanInputVisible] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const isLight = theme === 'light';

  // Load persistent test runs from database on mount
  React.useEffect(() => {
    fetch(`${API_BASE}/tasks/history/runs`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          const formatted = data.data.map(item => ({
            id: item.run_id || item.task_id,
            name: item.name || "Multi-Agent Automation Run",
            suite: item.suite || "E2E Test Suite",
            env: item.env || "Staging Engine",
            browser: item.browser || "Chromium v124",
            status: item.status || "created",
            duration: item.duration || "12.5s",
            startTime: item.created_at || "Just now",
            passedSteps: item.passed_steps || 1,
            failedSteps: item.failed_steps || 0
          }));
          setRecentRuns(formatted);
        }
      })
      .catch(err => console.log("Using local default test runs history:", err));
  }, []);

  // Real-time backend task polling & Playwright SSE stream (Task 1.5)
  React.useEffect(() => {
    if (!activeTaskId || (executionStatus !== 'running' && executionStatus !== 'paused' && executionStatus !== 'waiting_human_input')) return;

    // Connect to real-time SSE stream endpoint /tasks/stream/{task_id}
    let eventSource;
    try {
      eventSource = new EventSource(`${API_BASE}/tasks/stream/${activeTaskId}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'completed') {
            setExecutionStatus('completed');
          } else if (data.status === 'failed') {
            setExecutionStatus('failed');
          }
        } catch (e) {}
      };
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
      };
    } catch (err) {
      console.log("SSE Stream connection error:", err);
    }

    const pollInterval = setInterval(() => {
      fetch(`${API_BASE}/tasks/${activeTaskId}`)
        .then(res => res.json())
        .then(resData => {
          if (resData && resData.data) {
            const taskData = resData.data;
            const status = taskData.status;
            if (status === 'completed') {
              setExecutionStatus('completed');
              setActiveTaskId(null);
              fetch(`${API_BASE}/tasks/history/runs`)
                .then(r => r.json())
                .then(d => {
                  if (d && d.data && Array.isArray(d.data)) {
                    setRecentRuns(d.data.map(item => ({
                      id: item.run_id || item.task_id,
                      name: item.name,
                      suite: item.suite,
                      env: item.env,
                      browser: item.browser,
                      status: item.status,
                      duration: item.duration,
                      startTime: item.created_at,
                      passedSteps: item.passed_steps,
                      failedSteps: item.failed_steps
                    })));
                  }
                }).catch(() => {});
            } else if (status === 'failed') {
              setExecutionStatus('failed');
              setActiveTaskId(null);
            } else if (status === 'waiting_human_input' || status === 'waiting_human_approval') {
              setExecutionStatus('waiting_human_input');
              setHumanInputVisible(true);
            } else if (status === 'paused') {
              setExecutionStatus('paused');
            } else if (status === 'running') {
              setExecutionStatus('running');
              setHumanInputVisible(false);
            }
          }
        })
        .catch(err => console.log("Polling error:", err));
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      if (eventSource) eventSource.close();
    };
  }, [activeTaskId, executionStatus]);

  React.useEffect(() => {
    let timer;
    if (executionStatus === 'running') {
      timer = setInterval(() => {
        setExecutionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [executionStatus]);

  const handleGeneratePlan = () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setHasPlanGenerated(false);

    fetch(`${API_BASE}/tasks/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: promptText,
        llm_provider: 'google',
        llm_model: 'gemini-2.0-flash'
      })
    })
      .then(res => res.json())
      .then(resData => {
        setIsGenerating(false);
        setHasPlanGenerated(true);
        if (resData && resData.data) {
          const p = resData.data;
          setTestPlan({
            objective: p.objective || `Test scenario derived from: "${promptText}"`,
            targetUrl: p.target_url || "https://test.com/forgot-password",
            preconditions: p.preconditions || ["Target app service online", "Session state initialized"],
            testData: p.test_data || { user: "demo_tester@test.com", inputPayload: "valid_request" },
            steps: p.steps || [
              { id: 1, action: "Open URL", selector: "https://test.com/login", expected: "Target page loaded successfully" },
              { id: 2, action: "Click Element", selector: "#forgot-password-link", expected: "Navigation to reset form" },
              { id: 3, action: "Fill Input Field", selector: "#email-input", expected: "Test email inserted" },
              { id: 4, action: "Click Send Link Button", selector: "#send-reset-btn", expected: "POST /api/auth/forgot-password 200 OK" },
              { id: 5, action: "Verify Success Toast", selector: ".toast-success", expected: "Confirmation toast displayed" },
              { id: 6, action: "Validate API Response", selector: "POST /api/auth/forgot-password", expected: "JSON response payload valid" }
            ]
          });
        }
      })
      .catch(err => {
        console.log("Backend offline, using fallback plan generator:", err);
        setIsGenerating(false);
        setHasPlanGenerated(true);
        setTestPlan({
          objective: `Test scenario derived from: "${promptText}"`,
          targetUrl: promptText.includes('test.com') ? "https://test.com/forgot-password" : "https://app.example.com",
          preconditions: ["Target app service online", "Session state initialized"],
          testData: { user: "demo_tester@test.com", inputPayload: "valid_request" },
          steps: [
            { id: 1, action: "Open URL", selector: "https://test.com/login", expected: "Target page loaded successfully" },
            { id: 2, action: "Click Element", selector: "#forgot-password-link", expected: "Navigation to reset form" },
            { id: 3, action: "Fill Input Field", selector: "#email-input", expected: "Test email inserted" },
            { id: 4, action: "Click Send Link Button", selector: "#send-reset-btn", expected: "POST /api/auth/forgot-password 200 OK" },
            { id: 5, action: "Verify Success Toast", selector: ".toast-success", expected: "Confirmation toast displayed" },
            { id: 6, action: "Validate API Response", selector: "POST /api/auth/forgot-password", expected: "JSON response payload valid" }
          ]
        });
      });
  };

  const handleConfirmAndRun = () => {
    setExecutionStatus('running');
    setCurrentStepIdx(0);
    setSelectedEvidenceStepId(1);
    setExecutionTimer(0);

    const payload = {
      tasks: [{
        name: "Dashboard Multi-Agent Execution",
        prompt: promptText,
        max_steps: 30,
        llm_provider: "google",
        llm_model: "gemini-2.0-flash"
      }],
      session_id: `session_${Date.now()}`,
      simulator_provider: "google",
      simulator_model: "gemini-2.0-flash",
      simulator_temperature: 0.0,
      simulator_task: promptText,
      browser_config: { keep_alive: false, headless: false }
    };

    fetch(`${API_BASE}/tasks/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.data && data.data.message) {
          const msg = data.data.message;
          const taskId = msg.includes('ID: ') ? msg.split('ID: ')[1] : msg;
          setActiveTaskId(taskId);
        }
      })
      .catch(err => {
        console.log("Backend offline, running local test simulation:", err);
        let step = 0;
        const stepInterval = setInterval(() => {
          step++;
          if (step < testPlan.steps.length) {
            setCurrentStepIdx(step);
            setSelectedEvidenceStepId(testPlan.steps[step].id);
          } else {
            clearInterval(stepInterval);
            setExecutionStatus('completed');
          }
        }, 2500);
      });
  };

  const handleStopTest = () => {
    if (activeTaskId) {
      fetch(`${API_BASE}/tasks/${activeTaskId}/cancel`, { method: 'POST' }).catch(() => {});
    }
    setExecutionStatus('cancelled');
  };

  const handlePauseTest = () => {
    if (activeTaskId) {
      const endpoint = executionStatus === 'paused' ? 'resume' : 'pause';
      fetch(`${API_BASE}/tasks/${activeTaskId}/${endpoint}`, { method: 'POST' }).catch(() => {});
    }
    setExecutionStatus(prev => prev === 'paused' ? 'running' : 'paused');
  };

  const handleSendHumanInput = () => {
    if (!activeTaskId || !humanInputText) return;
    fetch(`${API_BASE}/tasks/${activeTaskId}/human-input`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: "provide_input", input_text: humanInputText })
    })
      .then(() => {
        setHumanInputText('');
        setHumanInputVisible(false);
        setExecutionStatus('running');
      })
      .catch(err => console.log("Failed sending human input:", err));
  };



  const handleUpdateStep = (index, field, value) => {
    const updatedSteps = [...testPlan.steps];
    updatedSteps[index][field] = value;
    setTestPlan({ ...testPlan, steps: updatedSteps });
  };

  const handleDeleteStep = (index) => {
    const updatedSteps = testPlan.steps.filter((_, i) => i !== index);
    setTestPlan({ ...testPlan, steps: updatedSteps });
  };

  const handleAddStep = () => {
    const newId = testPlan.steps.length + 1;
    const newStep = { id: newId, action: "New Action Step", selector: "#element-selector", expected: "Expected result outcome" };
    setTestPlan({ ...testPlan, steps: [...testPlan.steps, newStep] });
  };

  const openEnvironmentForm = (environment = null) => {
    setEditingEnvironmentId(environment?.id || null);
    setEnvironmentForm(environment ? { name: environment.name, baseUrl: environment.baseUrl, browser: environment.browser, headless: environment.headless, llm: environment.llm } : { name: '', baseUrl: '', browser: 'Chromium', headless: 'On', llm: 'Gemini' });
    setEnvironmentNotice('');
  };

  const saveEnvironment = () => {
    if (!environmentForm.name.trim() || !environmentForm.baseUrl.trim()) return;
    if (editingEnvironmentId) {
      setEnvironments(items => items.map(item => item.id === editingEnvironmentId ? { ...item, ...environmentForm, status: item.status } : item));
      setEnvironmentNotice('Environment updated successfully.');
    } else {
      setEnvironments(items => [...items, { ...environmentForm, id: Date.now(), status: 'Connected' }]);
      setEnvironmentNotice('Environment added successfully.');
    }
  };

  const testEnvironmentConnection = () => {
    setEnvironmentNotice(`Connection to ${environmentForm.baseUrl || 'the environment'} verified successfully.`);
  };

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

  const handleFeedbackSubmit = (event) => {
    event.preventDefault();
    if (isSubmittingFeedback) return;
    if (!feedbackRating || !feedbackMessage.trim()) {
      setFeedbackNotice('Please choose a rating and share a comment before sending.');
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackNotice('');
    fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: feedbackRating,
        category: feedbackCategory,
        message: feedbackMessage.trim(),
        username: user?.username || ''
      })
    })
      .then(async response => {
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(responseData.detail || 'Unable to save feedback.');
        }
        return responseData;
      })
      .then(() => {
        setFeedbackNotice('Thanks — your feedback has been saved on this machine.');
        setFeedbackMessage('');
        setFeedbackRating(0);
      })
      .catch(error => {
        setFeedbackNotice(error.message || 'Unable to save feedback.');
      })
      .finally(() => setIsSubmittingFeedback(false));
  };

  const runSuites = [...new Set(recentRuns.map(run => run.suite).filter(Boolean))];
  const runEnvironments = [...new Set(recentRuns.map(run => run.env).filter(Boolean))];
  const runBrowsers = [...new Set(recentRuns.map(run => run.browser).filter(Boolean))];
  const filteredRuns = recentRuns.filter(run => {
    const query = runSearch.trim().toLowerCase();
    const started = String(run.startTime || '').toLowerCase();
    const matchesDate = runDateFilter === 'All time'
      || (runDateFilter === 'Last 24 hours' && (started.includes('now') || started.includes('min') || started.includes('hour')))
      || (runDateFilter === 'Last 7 days' && !started.includes('yesterday'))
      || runDateFilter === 'Last 30 days';
    return (!query || `${run.id} ${run.name}`.toLowerCase().includes(query))
      && (runStatusFilter === 'All' || run.status === runStatusFilter)
      && (runSuiteFilter === 'All' || run.suite === runSuiteFilter)
      && (runEnvironmentFilter === 'All' || run.env === runEnvironmentFilter)
      && (runBrowserFilter === 'All' || run.browser === runBrowserFilter)
      && matchesDate;
  });
  const runPageSize = 8;
  const runPageCount = Math.max(1, Math.ceil(filteredRuns.length / runPageSize));
  const visibleRuns = filteredRuns.slice((runPage - 1) * runPageSize, runPage * runPageSize);
  const allVisibleRunsSelected = visibleRuns.length > 0 && visibleRuns.every(run => selectedRunIds.includes(run.id));

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
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono ${run.status === 'completed' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' : run.status === 'running' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-600 dark:text-red-300 border border-red-500/30'}`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono opacity-70">{run.duration}</td>
                          <td className="py-3.5 px-3 opacity-70">{run.startTime}</td>
                        </tr>
                      ))}
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
        )}

        {activeModule === 'new-test' && (
        <>
        <div className="fixed left-0 top-16 bottom-0 z-50 w-3" onMouseEnter={() => setIsChatHistoryOpen(true)} aria-hidden="true" />
        <aside
          onMouseEnter={() => setIsChatHistoryOpen(true)}
          onMouseLeave={() => setIsChatHistoryOpen(false)}
          className={`fixed left-4 top-24 bottom-6 z-50 w-[min(360px,calc(100vw-2rem))] rounded-[1.5rem] border p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out ${isChatHistoryOpen ? 'translate-x-0 opacity-100' : '-translate-x-[calc(100%+1rem)] opacity-0 pointer-events-none'} ${isLight ? 'bg-white/95 border-slate-300 text-slate-900' : 'bg-slate-950/95 border-white/15 text-white'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-medium uppercase tracking-wide ${isLight ? 'text-slate-500' : 'text-white/60'}`}>Session History</h3>
            <button onClick={() => setIsChatHistoryOpen(false)} className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer ${isLight ? 'border-slate-300 text-slate-500 hover:bg-slate-100' : 'border-white/20 text-white/60 hover:bg-white/10'}`}>◂</button>
          </div>
          <input
            value={chatHistorySearch}
            onChange={(e) => setChatHistorySearch(e.target.value)}
            placeholder="⌕ Search by name / prompt / URL..."
            className={`w-full rounded-2xl border px-4 py-3 text-sm mb-5 focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`}
          />
          <div className="space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">
            {['Today', 'Yesterday', 'Older'].map(group => {
              const items = chatHistory.filter(item => item.group === group && `${item.title} ${item.prompt}`.toLowerCase().includes(chatHistorySearch.toLowerCase()));
              if (!items.length) return null;
              return <div key={group}><div className={`text-xs uppercase tracking-wide mb-2 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{group}</div><div className="space-y-1">{items.map(item => <button key={item.id} onClick={() => { setPromptText(item.prompt); setIsChatHistoryOpen(false); }} className={`w-full rounded-2xl px-4 py-3 text-left cursor-pointer transition-colors ${item.prompt === promptText ? (isLight ? 'bg-slate-900 text-white' : 'bg-white text-black') : (isLight ? 'hover:bg-slate-100' : 'hover:bg-white/10')}`}><div className="text-sm font-semibold truncate">{item.title}</div><div className={`mt-1 flex items-center gap-2 text-xs ${item.prompt === promptText ? 'text-white/80' : (isLight ? 'text-slate-500' : 'text-white/50')}`}><span className={`rounded-full border px-2 py-0.5 ${item.status === 'Failed' ? 'border-rose-400 text-rose-500' : 'border-emerald-400 text-emerald-600'}`}>{item.status}</span><span>{item.steps} steps · {item.time}</span></div></button>)}</div></div>;
            })}
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
              <span className={`shrink-0 text-xs px-3 py-1 rounded-full border ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/20 text-white/60'}`}>Session #482</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="flex justify-end">
                <div className={`${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'} max-w-[88%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed`}>
                  {promptText}
                </div>
              </div>

              <div className={`${isLight ? 'bg-slate-200/80 text-slate-900' : 'bg-white/10 text-white'} rounded-2xl rounded-bl-md p-4 space-y-3`}>
                <div className={`text-[11px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/50'}`}>Planner Agent</div>
                <p className="text-sm leading-relaxed">I created a structured test plan with {testPlan.steps.length} steps for this flow. You can review and edit it in the panel on the right.</p>
                <div className={`border border-dashed rounded-xl px-3 py-3 text-sm ${isLight ? 'border-slate-400 text-slate-700' : 'border-white/25 text-white/80'}`}>
                  <span className="mr-1">📋</span> Created: <strong>{testPlan.objective}</strong> — {testPlan.steps.length} steps
                </div>
              </div>

              {executionStatus !== 'Idle' && (
                <div className="flex justify-end">
                  <div className={`${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'} max-w-[88%] rounded-2xl rounded-br-md px-4 py-3 text-sm`}>
                    Test status: {executionStatus}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-300/70 dark:border-white/10">
              <div className="flex gap-2 mb-3 flex-wrap">
                <button onClick={handleAddStep} className={`liquid-glass rounded-full px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'text-slate-700' : 'text-white/80'}`}>+ Add Step</button>
                <button onClick={handleGeneratePlan} className={`liquid-glass rounded-full px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'text-slate-700' : 'text-white/80'}`}>Run Again</button>
                <button className={`liquid-glass rounded-full px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'text-slate-700' : 'text-white/80'}`}>Save as Test Case</button>
              </div>
              <div className="flex gap-2">
                <input
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGeneratePlan(); } }}
                  placeholder={'Describe a change or type "run test"...'}
                  className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`}
                />
                <button onClick={handleGeneratePlan} className={`${isLight ? 'bg-slate-900 text-white' : 'bg-white text-black'} rounded-2xl px-4 text-sm font-semibold cursor-pointer`}>Send</button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-8 h-full min-h-0 flex flex-col gap-6">
            <section className={`flex-1 min-h-0 liquid-glass-strong rounded-[1.5rem] p-5 ${isLight ? 'border-slate-200' : 'border-white/10'} border flex flex-col`}>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
                <div>
                  <div className={`text-xs font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider`}>// AI Generated Structured Test Plan</div>
                  <h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{testPlan.objective} — {testPlan.steps.length} steps</h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setIsEditingPlan(!isEditingPlan)} className={`rounded-xl border px-4 py-2 text-sm font-medium cursor-pointer ${isLight ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'}`}>
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
                    <span className={`my-1 rounded-lg px-2 py-2 text-xs ${idx === 2 ? (isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-300') : (isLight ? 'text-slate-500' : 'text-white/50')}`}>{idx === 2 ? 'Chat edit' : 'Original'}</span>
                  </div>
                ))}
              </div>
              <div className={`mt-4 text-xs ${isLight ? 'text-slate-500' : 'text-white/60'}`}><strong className={isLight ? 'text-slate-800' : 'text-white'}>Original</strong> = generated by Planner Agent &nbsp; <strong className={isLight ? 'text-slate-800' : 'text-white'}>Chat edit</strong> = updated from conversation</div>
            </section>

            <section className={`flex-1 min-h-0 liquid-glass-strong rounded-[1.5rem] p-5 ${isLight ? 'border-slate-200' : 'border-white/10'} border flex flex-col`}>
              <div className={`text-xs font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider mb-3`}>// Live Playwright Viewport</div>
              <div className={`relative flex-1 min-h-0 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)] text-slate-500' : 'border-white/30 bg-[repeating-linear-gradient(45deg,#111,#111_14px,#181818_14px,#181818_28px)] text-white/60'}`}>
                <p className={`text-sm font-medium text-center px-5 ${executionStatus === 'running' ? 'text-emerald-500' : ''}`}>{executionStatus === 'Idle' ? 'Not running — the real browser will appear after clicking "Confirm & Run Test" or typing "run test" in chat.' : 'Playwright browser is running.'}</p>
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
                  disabled={executionStatus !== 'running' && executionStatus !== 'paused'}
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
                <span className="liquid-glass rounded-full px-3 py-1 text-xs text-emerald-500 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{executionStatus}</span>
                </span>
              </div>

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
                    Agent detected DOM element <code className="text-emerald-500 font-mono">{testPlan.steps[currentStepIdx]?.selector}</code>. Triggered automated action. Validated response state.
                  </p>
                </div>

                {/* HUMAN-IN-THE-LOOP INTERVENTION PANEL */}
                {executionStatus === 'waiting_human_input' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-amber-600 dark:text-amber-300 font-semibold">
                      <span>⚠️ HUMAN INTERVENTION REQUIRED</span>
                    </div>
                    <p className="text-xs opacity-80">System requires user input or approval to proceed to the next step.</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={humanInputText}
                        onChange={(e) => setHumanInputText(e.target.value)}
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
                const isPassed = idx < currentStepIdx || executionStatus === 'completed';
                const isCurrent = idx === currentStepIdx && executionStatus === 'running';
                
                return (
                  <div
                    key={step.id}
                    onClick={() => setSelectedEvidenceStepId(step.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${isSelected ? (isLight ? 'bg-slate-200 border-slate-400 shadow-md' : 'bg-white/15 border-white/40 shadow-lg') : (isLight ? 'bg-white border-slate-200 hover:border-slate-300' : 'liquid-glass border-white/10 hover:border-white/20')}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${isPassed ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40' : isCurrent ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40 animate-pulse' : 'bg-slate-200 dark:bg-white/10 opacity-50'}`}>
                        {isPassed ? '✓' : isCurrent ? '⚡' : step.id}
                      </span>
                      <div>
                        <div className="text-xs font-semibold">{step.action}</div>
                        <div className="text-[11px] font-mono opacity-60 truncate max-w-[180px]">{step.selector}</div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isPassed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : isCurrent ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' : 'bg-slate-200 dark:bg-white/5 opacity-40'}`}>
                      {isPassed ? 'Passed' : isCurrent ? 'Running' : 'Pending'}
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
                  {[
                    { id: 'network', label: 'API Validation' },
                    { id: 'screenshot', label: 'Screenshot' },
                    { id: 'agent', label: 'Agent Log' },
                    { id: 'console', label: 'Console' },
                    { id: 'visual', label: 'Visual Diff' }
                  ].map(tab => (
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
                {/* API Validation Tab */}
                {evidenceTab === 'network' && (
                  <div className="space-y-3 font-mono text-xs">
                    <div className={`flex items-center justify-between ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/10'} p-3 rounded-xl border`}>
                      <div>
                        <span className="text-emerald-500 font-bold mr-2">POST</span>
                        <span>/api/auth/forgot-password</span>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px]">
                        HTTP 200 OK (342ms)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className={`liquid-glass p-3 rounded-xl ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
                        <span className="text-[10px] opacity-50 block mb-1">EXPECTED VALIDATION</span>
                        <div className="text-emerald-500">Status Code: 200</div>
                        <div className="opacity-70">Schema: {"{ status: 'success', token: string }"}</div>
                      </div>
                      <div className={`liquid-glass p-3 rounded-xl ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
                        <span className="text-[10px] opacity-50 block mb-1">ACTUAL RESPONSE</span>
                        <div className="text-emerald-500">Status Code: 200</div>
                        <div className="opacity-70">Response Time: 342ms</div>
                      </div>
                    </div>

                    <div className="bg-neutral-950 text-white p-3 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto">
                      <pre>{`{\n  "status": "success",\n  "message": "Password reset token generated",\n  "timestamp": "2026-08-08T17:26:00Z"\n}`}</pre>
                    </div>
                  </div>
                )}

                {/* Screenshot Tab */}
                {evidenceTab === 'screenshot' && (
                  <div className="relative w-full h-[220px] bg-neutral-950 text-white rounded-xl border border-slate-800 flex items-center justify-center p-4">
                    <div className="liquid-glass p-4 rounded-xl border border-emerald-500/50 text-center space-y-2">
                      <ShieldCheckIcon className="w-8 h-8 text-emerald-400 mx-auto" />
                      <div className="text-xs font-semibold text-white">Step {selectedEvidenceStepId} Screenshot Captured</div>
                      <div className="text-[10px] font-mono opacity-50">DOM Element Highlight: #send-reset-btn</div>
                    </div>
                  </div>
                )}

                {/* Agent Log Tab */}
                {evidenceTab === 'agent' && (
                  <div className="bg-neutral-950 text-white p-3.5 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
                    <div>[00:01.2] INFO: Planner Agent initialized step {selectedEvidenceStepId}</div>
                    <div>[00:01.4] TRACE: Querying DOM selector '#send-reset-btn'</div>
                    <div>[00:01.6] ACTION: Emitting pointer click event</div>
                    <div className="text-emerald-400">[00:01.8] SUCCESS: Step {selectedEvidenceStepId} validated cleanly.</div>
                  </div>
                )}

                {/* Console Tab */}
                {evidenceTab === 'console' && (
                  <div className="bg-neutral-950 text-emerald-300 p-3.5 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
                    <div>[Browser Console] POST https://test.com/api/auth/forgot-password 200 (OK)</div>
                    <div className="opacity-70">[Browser Console] Analytics event: 'forgot_password_submit' fired</div>
                  </div>
                )}

                {/* Visual Validation Tab */}
                {evidenceTab === 'visual' && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className={`liquid-glass p-3 rounded-xl ${isLight ? 'border-slate-200' : 'border-white/10'} border text-center space-y-2`}>
                      <span className="text-[10px] font-mono opacity-50">BASELINE SCREENSHOT</span>
                      <div className="h-24 bg-slate-200 dark:bg-white/5 rounded-lg flex items-center justify-center font-mono opacity-50">Baseline UI</div>
                    </div>
                    <div className={`liquid-glass p-3 rounded-xl ${isLight ? 'border-slate-200' : 'border-white/10'} border text-center space-y-2`}>
                      <span className="text-[10px] font-mono text-emerald-500">ACTUAL UI (DIFF: 0.01%)</span>
                      <div className="h-24 bg-emerald-500/10 rounded-lg border border-emerald-500/30 flex items-center justify-center font-mono text-emerald-500">Match 99.99%</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>
        </div>
        </>
        )}

        {activeModule === 'test-runs' && (
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
              onChange={(e) => { setRunSearch(e.target.value); setRunPage(1); }}
              placeholder="⌕ Search by name / Run ID..."
              className={`w-full lg:max-w-xs rounded-full border px-4 py-2.5 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`}
            />
            <div className="flex flex-wrap gap-2">
              {[
                ['Status', runStatusFilter, setRunStatusFilter, ['All', 'completed', 'failed', 'running']],
                ['Suite', runSuiteFilter, setRunSuiteFilter, ['All', ...runSuites]],
                ['Environment', runEnvironmentFilter, setRunEnvironmentFilter, ['All', ...runEnvironments]],
                ['Browser', runBrowserFilter, setRunBrowserFilter, ['All', ...runBrowsers]]
              ].map(([label, value, setter, options]) => (
                <select key={label} value={value} onChange={(e) => { setter(e.target.value); setRunPage(1); }} className={`rounded-xl border px-3 py-2 text-sm cursor-pointer ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}>
                  {options.map(option => <option key={option} value={option}>{label}: {option}</option>)}
                </select>
              ))}
              <select value={runDateFilter} onChange={(e) => { setRunDateFilter(e.target.value); setRunPage(1); }} className={`rounded-xl border px-3 py-2 text-sm cursor-pointer ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}>
                <option>All time</option>
                <option>Last 24 hours</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm border-collapse">
              <thead>
                <tr className={`border-b ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-white/50'} font-mono text-[11px]`}>
                  <th className="py-3 px-3"><input type="checkbox" checked={allVisibleRunsSelected} onChange={(e) => setSelectedRunIds(e.target.checked ? [...new Set([...selectedRunIds, ...visibleRuns.map(run => run.id)])] : selectedRunIds.filter(id => !visibleRuns.some(run => run.id === id)))} className="h-4 w-4 cursor-pointer" /></th>
                  <th className="py-3 px-3">RUN ID</th><th className="py-3 px-3">NAME</th><th className="py-3 px-3">SUITE</th><th className="py-3 px-3">ENV</th><th className="py-3 px-3">BROWSER</th><th className="py-3 px-3">STATUS</th><th className="py-3 px-3">DURATION</th><th className="py-3 px-3">STEPS P/F</th><th className="py-3 px-3">STARTED</th><th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                {visibleRuns.map((run) => (
                  <tr key={run.id} className={`${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'} transition-colors`}>
                    <td className="py-3.5 px-3"><input type="checkbox" checked={selectedRunIds.includes(run.id)} onChange={(e) => setSelectedRunIds(e.target.checked ? [...selectedRunIds, run.id] : selectedRunIds.filter(id => id !== run.id))} className="h-4 w-4 cursor-pointer" /></td>
                    <td className="py-3.5 px-3 font-mono font-medium"><button onClick={() => setSelectedRun(run)} className="text-emerald-500 hover:text-emerald-600 hover:underline cursor-pointer">{run.id}</button></td>
                    <td className="py-3.5 px-3 font-medium">{run.name}</td><td className="py-3.5 px-3 opacity-70">{run.suite}</td><td className="py-3.5 px-3 opacity-70 font-mono text-xs">{run.env}</td><td className="py-3.5 px-3 opacity-70">{run.browser}</td>
                    <td className="py-3.5 px-3"><span className={`px-2.5 py-1 rounded-full text-xs font-mono ${run.status === 'completed' ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' : run.status === 'running' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' : 'bg-rose-500/20 text-rose-600 border border-rose-500/30'}`}>{run.status}</span></td>
                    <td className="py-3.5 px-3 font-mono opacity-70">{run.duration || '—'}</td><td className="py-3.5 px-3 font-mono">{run.passedSteps ?? 0}/{run.failedSteps ?? 0}</td><td className="py-3.5 px-3 opacity-70">{run.startTime || '—'}</td>
                    <td className="py-3.5 px-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelectedRun(run)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/20 text-white/80 hover:bg-white/10'}`}>View</button><button onClick={() => handleConfirmAndRun()} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 text-slate-700 hover:bg-slate-100' : 'border-white/20 text-white/80 hover:bg-white/10'}`}>Re-run</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleRuns.length === 0 && <div className={`py-12 text-center text-sm ${isLight ? 'text-slate-500' : 'text-white/50'}`}>No test runs match the selected filters.</div>}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <span className={isLight ? 'text-slate-500' : 'text-white/60'}>Showing {filteredRuns.length === 0 ? 0 : (runPage - 1) * runPageSize + 1}–{Math.min(runPage * runPageSize, filteredRuns.length)} / {filteredRuns.length}</span>
            <div className="flex items-center gap-2"><button disabled={runPage === 1} onClick={() => setRunPage(page => Math.max(1, page - 1))} className={`rounded-xl border px-3 py-2 cursor-pointer disabled:opacity-40 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>‹ Prev</button><span className="px-2 font-mono">{runPage} / {runPageCount}</span><button disabled={runPage >= runPageCount} onClick={() => setRunPage(page => Math.min(runPageCount, page + 1))} className={`rounded-xl border px-3 py-2 cursor-pointer disabled:opacity-40 ${isLight ? 'border-slate-300' : 'border-white/20'}`}>Next ›</button></div>
          </div>
        </section>
        </>
        )}

        {activeModule === 'environments' && (
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
                        <td className="py-4 px-2 font-medium">{environment.name}</td><td className="py-4 px-2 font-mono text-xs opacity-70">{environment.baseUrl.replace(/^https?:\/\//, '')}</td><td className="py-4 px-2">{environment.browser}</td><td className="py-4 px-2">{environment.llm}</td>
                        <td className="py-4 px-2"><span className={`rounded-full border px-2.5 py-1 text-xs ${environment.status === 'Connected' ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-600' : 'border-rose-400/50 bg-rose-500/10 text-rose-600'}`}>{environment.status}</span></td>
                        <td className="py-4 px-2 text-right"><button onClick={() => openEnvironmentForm(environment)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`xl:col-span-5 liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}>
              <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Add / Edit Environment</div>
              <h3 className={`font-heading text-2xl font-semibold mb-5 ${isLight ? 'text-slate-900' : 'text-white'}`}>{editingEnvironmentId ? 'Edit Environment' : 'Add Environment'}</h3>
              <div className="space-y-4">
                <label className="block text-sm"><span className="block mb-1 opacity-70">Environment Name</span><input value={environmentForm.name} onChange={(e) => setEnvironmentForm({ ...environmentForm, name: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label>
                <label className="block text-sm"><span className="block mb-1 opacity-70">Base URL</span><input value={environmentForm.baseUrl} onChange={(e) => setEnvironmentForm({ ...environmentForm, baseUrl: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`} /></label>
                <div className="grid grid-cols-2 gap-3"><label className="block text-sm"><span className="block mb-1 opacity-70">Browser</span><select value={environmentForm.browser} onChange={(e) => setEnvironmentForm({ ...environmentForm, browser: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}><option>Chromium</option><option>Firefox</option><option>WebKit</option><option>Headless Node</option></select></label><label className="block text-sm"><span className="block mb-1 opacity-70">Headless</span><select value={environmentForm.headless} onChange={(e) => setEnvironmentForm({ ...environmentForm, headless: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}><option>On</option><option>Off</option></select></label></div>
                <label className="block text-sm"><span className="block mb-1 opacity-70">Default LLM Provider</span><select value={environmentForm.llm} onChange={(e) => setEnvironmentForm({ ...environmentForm, llm: e.target.value })} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}><option>Gemini</option><option>OpenAI</option><option>OpenRouter</option><option>Anthropic</option><option>DeepSeek</option><option>Azure</option><option>Hub1</option></select></label>
                <div className="flex items-center gap-3 pt-2"><button onClick={saveEnvironment} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer">Save</button><button onClick={testEnvironmentConnection} className={`rounded-xl border px-5 py-2.5 text-sm cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Test Connection</button></div>
                {environmentNotice && <div className="text-sm text-emerald-600">{environmentNotice}</div>}
              </div>
            </div>
          </section>
        )}

        {activeModule === 'settings' && (
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
        )}

        {activeModule === 'reports' && (
          <>
            <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}>
              <div className="flex items-center justify-between gap-4"><h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Reports — Test Reports</h2><button onClick={generateReport} className="bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer hover:bg-slate-800">+ Generate Report</button></div>
              <div className="flex flex-col lg:flex-row gap-3 justify-between"><input value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="⌕ Search reports..." className={`w-full lg:max-w-xs rounded-full border px-4 py-2.5 text-sm focus:outline-none ${isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-white/5 border-white/15 text-white placeholder-white/40'}`} /><div className="flex flex-wrap gap-2"><select value={reportFormatFilter} onChange={(e) => setReportFormatFilter(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}><option>All</option><option>Markdown</option><option>PDF</option></select><select value={reportSuiteFilter} onChange={(e) => setReportSuiteFilter(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}>{reportSuites.map(suite => <option key={suite}>{suite}</option>)}</select><select value={reportDateFilter} onChange={(e) => setReportDateFilter(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${isLight ? 'bg-white border-slate-300 text-slate-600' : 'bg-white/5 border-white/15 text-white'}`}><option>All time</option><option>Last 24 hours</option><option>Last 7 days</option><option>Last 30 days</option></select></div></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className={`border-b ${isLight ? 'border-slate-300 text-slate-500' : 'border-white/10 text-white/50'} text-xs uppercase tracking-wide`}><th className="py-3 px-3">Report ID</th><th className="py-3 px-3">Linked Run</th><th className="py-3 px-3">Format</th><th className="py-3 px-3">Created</th><th className="py-3 px-3 text-right">Actions</th></tr></thead><tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>{filteredReports.map(report => <tr key={report.id} className={`${isLight ? 'hover:bg-slate-100' : 'hover:bg-white/5'}`}><td className="py-4 px-3 font-mono font-medium">{report.id}</td><td className="py-4 px-3 text-emerald-500">{report.runId}</td><td className="py-4 px-3">{report.format}</td><td className="py-4 px-3 opacity-70">{report.created}</td><td className="py-4 px-3 text-right"><div className="flex justify-end gap-2"><button onClick={() => setSelectedReport(report)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>View</button><button onClick={() => setReportNotice(`${report.format} report ${report.id} is ready to download.`)} className={`rounded-xl border px-3 py-1.5 text-xs cursor-pointer ${isLight ? 'border-slate-300 hover:bg-slate-100' : 'border-white/20 hover:bg-white/10'}`}>Download</button></div></td></tr>)}</tbody></table>{filteredReports.length === 0 && <div className="py-10 text-center text-sm opacity-60">No reports match the selected filters.</div>}</div>
              {reportNotice && <div className="text-sm text-emerald-600">{reportNotice}</div>}
            </section>
            {selectedReport && <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}><div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Report Detail</div><h3 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedReport.id} · {selectedReport.name}</h3><div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-5"><div className="space-y-3 text-sm"><div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Result</span><span className={selectedReport.status === 'Passed' ? 'text-emerald-600' : 'text-rose-600'}>{selectedReport.status}</span></div><div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Duration</span><span>{selectedReport.duration}</span></div><div className="flex justify-between border-b border-dashed pb-3"><span className="opacity-60">Failed Step</span><span>{selectedReport.failedStep}</span></div><button onClick={() => setReportNotice(`PDF export started for ${selectedReport.id}.`)} className="rounded-xl border px-4 py-2 cursor-pointer">Download PDF</button><button onClick={() => setReportNotice('Report share link copied.')} className="rounded-xl border px-4 py-2 ml-2 cursor-pointer">Share</button></div><div className={`lg:col-span-2 min-h-[240px] rounded-2xl border-2 border-dashed flex items-center justify-center text-center p-5 ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)] text-slate-500' : 'border-white/30 text-white/60'}`}>Markdown/PDF report preview with summary and evidence library</div></div></section>}
          </>
        )}

        {activeModule === 'comparisons' && (
          <>
            <section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border space-y-5`}><h2 className={`font-heading text-2xl font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Comparisons — Compare Two Runs</h2><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><label className="text-sm"><span className="block mb-1 opacity-70">Run A (Baseline)</span><select value={comparisonRunA} onChange={(e) => { setComparisonRunA(e.target.value); setComparisonReady(false); }} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{recentRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {run.name}</option>)}</select></label><label className="text-sm"><span className="block mb-1 opacity-70">Run B (Candidate)</span><select value={comparisonRunB} onChange={(e) => { setComparisonRunB(e.target.value); setComparisonReady(false); }} className={`w-full rounded-xl border px-4 py-3 ${isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/15 text-white'}`}>{recentRuns.map(run => <option key={run.id} value={run.id}>{run.id} · {run.name}</option>)}</select></label></div><button onClick={() => setComparisonReady(true)} className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold cursor-pointer">Compare</button></section>
            {comparisonReady && <><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[['Result', 'Pass → Pass'], ['Time Difference', '+3.2s'], ['Changed Steps', '2 / 8'], ['Visual Difference', '1 region']].map(([label, value]) => <div key={label} className={`liquid-glass-strong rounded-2xl border p-5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}><div className="text-xs uppercase tracking-wide opacity-60">{label}</div><div className="font-heading text-2xl mt-2">{value}</div></div>)}</div><section className={`liquid-glass-strong rounded-[1.5rem] p-6 ${isLight ? 'border-slate-200' : 'border-white/10'} border`}><div className={`text-xs font-mono uppercase tracking-wider mb-4 ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Step Differences</div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-slate-300 text-xs uppercase tracking-wide opacity-70"><th className="py-3 px-3">#</th><th className="py-3 px-3">Action</th><th className="py-3 px-3">Run A</th><th className="py-3 px-3">Run B</th><th className="py-3 px-3">Status</th></tr></thead><tbody><tr className="border-b border-slate-200"><td className="py-4 px-3">1</td><td className="py-4 px-3">Open URL</td><td className="py-4 px-3 rounded-xl bg-emerald-500/10 text-emerald-600">Passed</td><td className="py-4 px-3 rounded-xl bg-emerald-500/10 text-emerald-600">Passed</td><td className="py-4 px-3">No change</td></tr><tr><td className="py-4 px-3">5</td><td className="py-4 px-3">Apply Coupon</td><td className="py-4 px-3 rounded-xl bg-emerald-500/10 text-emerald-600">Passed · $10 off</td><td className="py-4 px-3 rounded-xl bg-rose-500/10 text-rose-600">Failed · $0 off</td><td className="py-4 px-3 text-rose-600">⚠ Difference</td></tr></tbody></table></div></section><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><section className={`liquid-glass-strong rounded-[1.5rem] p-6 border ${isLight ? 'border-slate-200' : 'border-white/10'}`}><div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-3">// Visual Diff</div><div className={`h-56 rounded-2xl border-2 border-dashed flex items-center justify-center text-sm opacity-60 ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)]' : 'border-white/30'}`}>Run A / Run B overlay comparison</div></section><section className={`liquid-glass-strong rounded-[1.5rem] p-6 border ${isLight ? 'border-slate-200' : 'border-white/10'}`}><div className="text-xs font-mono uppercase tracking-wider opacity-60 mb-3">// API Response Diff</div><div className={`h-56 rounded-2xl border-2 border-dashed flex items-center justify-center text-sm opacity-60 ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)]' : 'border-white/30'}`}>JSON diff — highlight changed fields</div></section></div></>}
          </>
        )}

        {!['dashboard', 'new-test', 'test-runs', 'environments', 'settings', 'reports', 'comparisons'].includes(activeModule) && (
          <section className={`liquid-glass-strong rounded-[1.5rem] p-12 ${isLight ? 'border-slate-200' : 'border-white/10'} border text-center space-y-2`}>
            <div className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'} uppercase tracking-wider`}>// Coming Soon</div>
            <h3 className={`font-heading text-2xl ${isLight ? 'text-slate-900' : 'text-white'}`}>This module is under construction</h3>
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-white/60'}`}>Return to Dashboard or New Test to continue.</p>
          </section>
        )}

        </main>

        {selectedRun && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4" onClick={() => setSelectedRun(null)}>
            <section
              role="dialog"
              aria-modal="true"
              aria-label={`Run details for ${selectedRun.id}`}
              onClick={(event) => event.stopPropagation()}
              className={`w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-[1.5rem] border p-6 shadow-2xl ${isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-white/15 text-white'}`}
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Run Details</div>
                  <h2 className="font-heading text-2xl font-semibold">{selectedRun.name}</h2>
                  <div className={`mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                    <span>{selectedRun.id}</span>
                    <span>{selectedRun.env || 'Staging Engine'}</span>
                    <span>{selectedRun.browser || 'Chromium'}</span>
                    <span>{selectedRun.duration || '12.5s'}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedRun(null)} className={`rounded-full px-3 py-1 text-sm cursor-pointer ${isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}>✕ Close</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4 space-y-3">
                  <div className={`text-xs font-mono uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-white/60'}`}>// Step Timeline & Evidence Inspection</div>
                  {testPlan.steps.map((step, idx) => {
                    const isPassed = selectedRun.status === 'Passed' || idx < currentStepIdx;
                    const isCurrent = !isPassed && idx === currentStepIdx;
                    const isSelected = selectedEvidenceStepId === step.id;
                    return (
                      <button
                        key={step.id}
                        onClick={() => setSelectedEvidenceStepId(step.id)}
                        className={`w-full p-3 rounded-2xl border text-left cursor-pointer transition-colors flex items-center justify-between gap-3 ${isSelected ? (isLight ? 'border-slate-700 bg-white' : 'border-white/50 bg-white/10') : (isLight ? 'border-slate-300 bg-white hover:bg-slate-100' : 'border-white/15 bg-white/5 hover:bg-white/10')}`}
                      >
                        <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-mono border ${isPassed ? 'border-emerald-400 text-emerald-600 bg-emerald-500/10' : isCurrent ? 'border-amber-400 text-amber-600 bg-amber-500/10' : 'border-slate-400 text-slate-500'}`}>
                          {isPassed ? '✓' : isCurrent ? '⚡' : idx + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold truncate">{step.action}</span>
                          <span className={`block text-[11px] font-mono truncate ${isLight ? 'text-slate-500' : 'text-white/50'}`}>{step.selector}</span>
                        </span>
                        <span className={`shrink-0 text-[11px] rounded-full px-2 py-1 ${isPassed ? 'text-emerald-600 bg-emerald-500/10' : isCurrent ? 'text-amber-600 bg-amber-500/10' : 'text-slate-500 bg-slate-200/70'}`}>{isPassed ? 'Passed' : isCurrent ? 'Running' : 'Pending'}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-8">
                  <div className={`inline-flex items-center gap-1 rounded-full p-1 mb-4 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}>
                    {[
                      { id: 'network', label: 'API Validation' },
                      { id: 'screenshot', label: 'Screenshot' },
                      { id: 'agent', label: 'Agent Log' },
                      { id: 'console', label: 'Console' },
                      { id: 'visual', label: 'Visual Diff' }
                    ].map(tab => (
                      <button key={tab.id} onClick={() => setEvidenceTab(tab.id)} className={`rounded-full px-3 py-2 text-xs cursor-pointer ${evidenceTab === tab.id ? (isLight ? 'bg-slate-900 text-white' : 'bg-white text-black') : (isLight ? 'text-slate-600' : 'text-white/60')}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className={`min-h-[360px] rounded-2xl border-2 border-dashed p-6 flex items-center justify-center ${isLight ? 'border-slate-400 bg-[repeating-linear-gradient(45deg,#fff,#fff_14px,#f1f3f5_14px,#f1f3f5_28px)] text-slate-500' : 'border-white/30 bg-[repeating-linear-gradient(45deg,#111,#111_14px,#181818_14px,#181818_28px)] text-white/60'}`}>
                    {evidenceTab === 'network' && <div className="w-full space-y-4 font-mono text-sm"><div className="flex items-center justify-between gap-3"><span className="text-emerald-500 font-semibold">POST</span><span>/api/auth/forgot-password</span><span className="text-emerald-500">HTTP 200 OK</span></div><pre className="rounded-xl bg-neutral-950 text-emerald-300 p-4 text-xs overflow-auto">{`{\n  "status": "success",\n  "step": ${selectedEvidenceStepId}\n}`}</pre></div>}
                    {evidenceTab === 'screenshot' && <span className="text-sm">Screenshot captured for step {selectedEvidenceStepId}</span>}
                    {evidenceTab === 'agent' && <span className="font-mono text-sm">Agent validated step {selectedEvidenceStepId} successfully.</span>}
                    {evidenceTab === 'console' && <span className="font-mono text-sm text-emerald-500">[Browser Console] Request completed with status 200 (OK)</span>}
                    {evidenceTab === 'visual' && <span className="font-mono text-sm text-emerald-500">Visual difference: 0.01% — Match 99.99%</span>}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

    </div>
  );
};

// Root Main App Component with Theme State
const App = () => {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [authModalState, setAuthModalState] = React.useState({ isOpen: false, mode: 'signin' });
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

  const handleLoginSuccess = (userData) => {
    setCurrentUser(userData);
    setAuthModalState({ isOpen: false, mode: 'signin' });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

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

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
