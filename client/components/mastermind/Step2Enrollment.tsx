import React from 'react';
import { Shield, Check, AlertTriangle, ArrowRight, Zap, Star } from 'lucide-react';
import { QRCodeCard } from './QRCodeCard';

interface Step2EnrollmentProps {
  onContinue: () => void;
}

export const Step2Enrollment: React.FC<Step2EnrollmentProps> = ({ onContinue }) => {
  return (
    <section id="step-2" className="py-16 sm:py-20 bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-cyan-400 border border-cyan-500/30">
            Step 2 of Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Step 2: Register with The CapSol
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            After completing your credit monitoring registration, enroll in our Credit Repair CRM.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Highlighted Warning Box - Clear & Non-technical */}
          <div className="bg-amber-950/50 border-2 border-amber-500/80 rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Critical Matching Rule
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  USE THE SAME EMAIL ADDRESS
                </h3>
                <p className="text-sm text-amber-100 leading-relaxed">
                  When registering with <strong>The CapSol</strong>, enter the{' '}
                  <strong className="text-amber-300 underline decoration-amber-400 underline-offset-2">
                    exact same email address you used with MyScoreIQ, IdentityIQ, or MyFreeScoreNow.
                  </strong>
                </p>
                <p className="text-xs text-amber-200/80">
                  This allows our CRM to connect your enrollment with your credit monitoring account automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing & Plan Card */}
          <div className="bg-slate-900 rounded-3xl border-2 border-blue-500/60 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/60 to-slate-900 p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-blue-500/20 text-cyan-300 border border-cyan-400/30 rounded-full text-[11px] font-bold uppercase tracking-wider">
                    Official Plan
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Client Basic
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                  A client enrollment plan designed to support your credit journey.
                </p>
              </div>

              <div className="text-center sm:text-right bg-slate-950/80 px-5 py-3 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Monthly Membership</div>
                <div className="text-3xl sm:text-4xl font-extrabold text-white">
                  $297 <span className="text-sm font-normal text-slate-400">/ month</span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              
              {/* Simple Benefits List */}
              <div className="space-y-3.5 flex-1">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  What you get with Client Basic:
                </h4>
                <ul className="space-y-2.5 text-sm text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>The CapSol Credit Repair &amp; Funding CRM Portal</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Automated Tri-Bureau credit report pull &amp; audit</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Active credit dispute rounds &amp; progress updates</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Weekly live Friday Mastermind class access</span>
                  </li>
                </ul>
              </div>

              {/* QR and CTA Button */}
              <div className="w-full max-w-sm md:w-auto md:min-w-[260px] flex flex-col items-center bg-slate-950 p-5 rounded-2xl border border-slate-800 shrink-0">
                <QRCodeCard
                  url="/client-intake/coachcapsol"
                  buttonText="Enroll in Client Basic"
                  isAvailable={true}
                  badge="$297/mo"
                  accentColor="blue"
                  size={140}
                />
              </div>

            </div>

            {/* Bottom bar */}
            <div className="bg-slate-950/80 px-4 sm:px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start text-center sm:text-left">
                <span>Already enrolled?</span>
                <a
                  href="/member/login"
                  className="text-cyan-400 font-bold underline hover:text-cyan-300"
                >
                  Member Login
                </a>
              </span>
              <button
                onClick={onContinue}
                className="w-full sm:w-auto justify-center text-cyan-400 font-bold hover:underline inline-flex items-center gap-1 py-1"
              >
                <span>Proceed to Step 3 (Payment)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
