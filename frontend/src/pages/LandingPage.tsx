// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRightIcon,
  PlayIcon,
  ShieldCheckIcon,
  ZapIcon,
  SunIcon,
  MoonIcon,
} from '../components/Icons';
import { FadingVideo } from '../components/FadingVideo';

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

// Landing Page Navbar
export const LandingNavbar = ({ onOpenAuth, theme, onToggleTheme }) => {
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
export const LandingHero = ({ onOpenAuth, theme }) => {
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
