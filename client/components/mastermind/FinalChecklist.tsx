import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, ExternalLink, Sparkles, Video, ArrowRight, ShieldCheck, CheckCircle2, LogIn } from 'lucide-react';
import { QRCodeCard } from './QRCodeCard';

export const FinalChecklist: React.FC = () => {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: false,
    5: false,
    6: false,
    7: false
  });

  const checklist = [
    { title: 'Credit monitoring registered', hint: 'MyScoreIQ or MyFreeScoreNow' },
    { title: 'Same email used for monitoring', hint: 'Rule #1 adherence' },
    { title: 'The CapSol registration completed', hint: 'Client Basic Plan ($297/mo)' },
    { title: 'Same email used for The CapSol', hint: 'Identical primary address' },
    { title: 'Stripe $297 payment completed', hint: 'Monthly subscription active' },
    { title: 'Same email used for Stripe', hint: 'Payment invoice matched' },
    { title: 'Credit report connected', hint: 'Report ingress verified' },
    { title: 'Friday Mastermind link saved', hint: 'Calendar invitation stored' }
  ];

  const toggleItem = (idx: number) => {
    const next = { ...checkedItems, [idx]: !checkedItems[idx] };
    setCheckedItems(next);

    const completedCount = Object.values(next).filter(Boolean).length;
    if (completedCount === checklist.length) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const completedCount = Object.values(checkedItems).filter(Boolean).length;
  const isAllCompleted = completedCount === checklist.length;

  return (
    <section id="checklist" className="py-16 sm:py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Pre-Flight Verification
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Before You Finish
          </h2>
          <p className="text-base text-slate-300">
            Check off each step below to ensure your account is completely synced and ready for the Friday class.
          </p>
        </div>

        {/* Interactive Checklist Card in Dark Theme */}
        <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-2xl mb-8">
          
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>Onboarding Completion:</span>
            <span className="text-emerald-400">{completedCount} of {checklist.length} Completed</span>
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-6 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${(completedCount / checklist.length) * 100}%` }}
            />
          </div>

          {/* 8 Check Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checklist.map((item, idx) => {
              const isChecked = !!checkedItems[idx];
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    isChecked
                      ? 'bg-slate-900/90 border-emerald-500/40 text-white'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isChecked ? 'bg-emerald-500 text-slate-950' : 'border border-slate-600 bg-slate-800'
                  }`}>
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className={`text-xs sm:text-sm font-semibold block ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                      {item.title}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {item.hint}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Completion Celebration Message */}
          <div className="mt-8 pt-6 border-t border-slate-800 text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              You&apos;re Ready. Welcome to The CapSol.
            </h3>
            <p className="text-sm text-slate-300">
              Your credit and funding journey starts here. Access your client dashboard at{' '}
              <a
                href="/member/login"
                className="text-cyan-400 font-bold underline hover:text-cyan-300"
              >
                the member portal
              </a>
            </p>
          </div>

          {/* Member Login & Mastermind Box */}
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left space-y-2 flex-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <LogIn className="w-3.5 h-3.5" />
                <span>Client Portal Access</span>
              </div>
              <h4 className="text-lg font-bold text-white">
                The CapSol Member Portal
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Log in anytime to view your live credit report ingress, round-by-round bureau dispute updates, and institutional funding scores.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <a
                  id="final-login-btn"
                  href="/member/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all active:scale-95 text-center"
                >
                  <span>Open Member Login</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
                <a
                  id="final-mastermind-btn"
                  href="#mastermind"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors text-center"
                >
                  <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Join Friday Mastermind</span>
                </a>
              </div>
            </div>

            {/* QR code to member login */}
            <div className="shrink-0 w-full max-w-xs md:w-auto md:min-w-[240px] flex flex-col items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <QRCodeCard
                url="/member/login"
                buttonText="Login Portal"
                isAvailable={true}
                badge="Member Login"
                accentColor="emerald"
                size={120}
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
