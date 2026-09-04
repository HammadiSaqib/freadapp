import React from 'react';
import { ArrowDown, AlertTriangle, ShieldCheck, Zap, Sparkles, CheckCircle2, ChevronRight, Lock, Calendar, Radio } from 'lucide-react';
import { WebinarCountdown } from './WebinarCountdown';

interface HeroSectionProps {
  onStartStep1: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartStep1 }) => {
  return (
    <section className="relative overflow-hidden bg-slate-950 text-white pt-12 pb-16 border-b border-slate-800">
      {/* Subtle Glow Backdrop */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        
        {/* Simple Live Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-cyan-400 border border-slate-700 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span>Friday Mastermind • Sept 4 @ 6 PM EST &amp; Sept 11 @ 4 PM EST</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Start Your Credit &amp; Funding Journey with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400">
            The CapSol
          </span>
        </h1>

        {/* Subheadline - Clear and clean for non-technical clients */}
        <p className="text-base sm:text-xl text-slate-300 font-normal leading-relaxed max-w-3xl mx-auto">
          Complete the steps below before joining the Friday Mastermind so our system can pull
          your credit report, identify what is holding you back, begin the dispute process, and
          track your progress toward funding readiness.
        </p>

        {/* Countdown - Clean and simple */}
        <div className="pt-2 max-w-lg mx-auto">
          <WebinarCountdown />
        </div>

        {/* Prominent Notice - Clear, clean, and unmistakable */}
        <div className="mt-8 text-left bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-amber-950/60 border-2 border-amber-500/80 rounded-2xl p-5 sm:p-6 shadow-xl relative">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded">
                IMPORTANT
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Use the same email address for your credit monitoring registration, The CapSol registration, and Stripe payment.
              </h2>
              <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                This is required so our system can correctly match your account and pull your credit report.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons - Flex column on mobile/tablet, side-by-side on desktop */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-center gap-3 max-w-2xl mx-auto">
          <button
            id="hero-start-step-1-btn"
            onClick={onStartStep1}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-bold text-sm sm:text-base bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30 transition-all active:scale-[0.99] text-center"
          >
            <span>Start Step 1: Credit Monitoring</span>
            <ArrowDown className="w-4 h-4 shrink-0" />
          </button>

          <a
            id="hero-jump-mastermind-btn"
            href="#mastermind"
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl font-semibold text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors text-center"
          >
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Friday Mastermind Zoom Details</span>
          </a>
        </div>

      </div>
    </section>
  );
};
