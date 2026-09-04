import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle2, 
  Menu, 
  X, 
  Calendar, 
  LogIn, 
  ChevronDown, 
  Radio, 
  ExternalLink,
  CreditCard,
  Search,
  FileText,
  TrendingUp,
  Award
} from 'lucide-react';

interface NavbarProps {
  activeSection: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stepsDropdownOpen, setStepsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#steps-dropdown-container')) {
        setStepsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const onboardingSteps = [
    { id: 'step-1', num: '1', title: 'Credit Monitoring', desc: 'Connect 3-bureau report', icon: Search },
    { id: 'step-2', num: '2', title: 'CapSol Enrollment', desc: 'Client Basic CRM ($297/mo)', icon: Shield },
    { id: 'step-3', num: '3', title: 'Stripe Payment', desc: 'Email consistency check', icon: CreditCard },
    { id: 'step-4', num: '4', title: 'Report Pull', desc: 'Automated CRM import', icon: FileText },
    { id: 'step-5', num: '5', title: 'Funding Barriers', desc: 'Identify negative items', icon: TrendingUp },
    { id: 'step-6', num: '6', title: 'Credit Disputes', desc: 'Round-by-round strategy', icon: Shield },
    { id: 'step-7', num: '7', title: 'Monthly Progress', desc: 'Score & update tracking', icon: TrendingUp },
    { id: 'step-8', num: '8', title: 'Funding Journey', desc: 'Bank funding readiness', icon: Award },
  ];

  const isStepActive = onboardingSteps.some(step => step.id === activeSection);

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 ${
      scrolled
        ? 'bg-slate-950/95 backdrop-blur-md shadow-2xl border-b border-slate-800'
        : 'bg-slate-950 border-b border-slate-800/80'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* LEFT: Clean Brand Identity */}
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="The CapSol Home"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white">
                    The CapSol
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    CRM
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  Credit Repair &amp; Funding System
                </span>
              </div>
            </a>

            {/* Live Mastermind Pill (Visible on Large Screens) */}
            <a
              href="#mastermind"
              className="hidden xl:inline-flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors group"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-rose-400 font-bold">Live Workshop:</span>
              <span className="text-slate-300 group-hover:text-cyan-300 transition-colors">Sept 4 @ 6 PM EST</span>
            </a>
          </div>

          {/* CENTER: Clean Structured Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            
            {/* Steps Dropdown */}
            <div className="relative" id="steps-dropdown-container">
              <button
                type="button"
                onClick={() => setStepsDropdownOpen(!stepsDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  isStepActive || stepsDropdownOpen
                    ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>Onboarding Steps (1-8)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${stepsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {stepsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-800 mb-1 flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>STEP-BY-STEP WORKFLOW</span>
                    <span className="text-cyan-400 text-[10px]">8 Modules</span>
                  </div>
                  <div className="space-y-0.5 max-h-[380px] overflow-y-auto pr-1">
                    {onboardingSteps.map((step) => {
                      const isActive = activeSection === step.id;
                      const Icon = step.icon;
                      return (
                        <a
                          key={step.id}
                          href={`#${step.id}`}
                          onClick={() => setStepsDropdownOpen(false)}
                          className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-cyan-400'
                          }`}>
                            {step.num}
                          </span>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-xs font-semibold truncate leading-tight">{step.title}</div>
                            <div className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                              {step.desc}
                            </div>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Direct Quick Links - Show on xl screens where plenty of space is available */}
            <a
              href="#step-1"
              className={`hidden xl:inline-block px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeSection === 'step-1'
                  ? 'text-cyan-300 bg-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Monitoring
            </a>

            <a
              href="#step-6"
              className={`hidden xl:inline-block px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeSection === 'step-6'
                  ? 'text-cyan-300 bg-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Disputes
            </a>

            <a
              href="#step-8"
              className={`hidden xl:inline-block px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeSection === 'step-8'
                  ? 'text-cyan-300 bg-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              Funding
            </a>

            <a
              href="#mastermind"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                activeSection === 'mastermind'
                  ? 'text-cyan-300 bg-slate-900'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Mastermind</span>
            </a>
          </nav>

          {/* RIGHT: Action Buttons (Responsive & Clean) */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Member Portal Login Link */}
            <a
              href="/member/login"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 shadow-sm transition-all active:scale-95 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Member Login</span>
              <span className="sm:hidden">Login</span>
            </a>

            {/* Checklist CTA (Prominent on Tablet & Desktop) */}
            <a
              href="#checklist"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20 active:scale-95 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Checklist</span>
            </a>

            {/* Mobile / Tablet Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-colors shrink-0"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 shrink-0" /> : <Menu className="w-5 h-5 shrink-0" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER (Clean, organized, and grouped by role) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 pt-3 pb-6 space-y-4 animate-in fade-in slide-in-from-top duration-150 shadow-2xl">
          
          {/* Mastermind Live Alert Banner */}
          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <div>
                <div className="font-bold text-white">Friday Mastermind</div>
                <div className="text-[11px] text-cyan-300">Sept 4 @ 6 PM EST • Sept 11 @ 4 PM EST</div>
              </div>
            </div>
            <a
              href="#mastermind"
              onClick={() => setMobileMenuOpen(false)}
              className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg font-bold text-[11px] shrink-0"
            >
              View Info
            </a>
          </div>

          {/* Group 1: Onboarding Steps */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Onboarding Roadmap
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {onboardingSteps.map((step) => {
                const isActive = activeSection === step.id;
                return (
                  <a
                    key={step.id}
                    href={`#${step.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                    }`}
                  >
                    <span className="w-5 h-5 rounded bg-slate-800 text-cyan-400 text-[11px] flex items-center justify-center font-mono font-bold shrink-0">
                      {step.num}
                    </span>
                    <span className="truncate">{step.title}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Group 2: Key Action Buttons */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <a
              href="/member/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 transition-colors text-center"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span className="truncate">Member Login</span>
            </a>

            <div className="grid grid-cols-2 gap-2">
              <a
                href="#mastermind"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 px-2 rounded-xl text-xs font-bold bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/30 transition-colors truncate"
              >
                Friday Mastermind
              </a>
              <a
                href="#checklist"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 px-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-colors truncate"
              >
                Final Checklist
              </a>
            </div>
          </div>

        </div>
      )}
    </header>
  );
};
