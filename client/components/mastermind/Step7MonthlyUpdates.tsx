import React from 'react';
import { ArrowRight, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

interface Step7MonthlyUpdatesProps {
  onContinue: () => void;
}

export const Step7MonthlyUpdates: React.FC<Step7MonthlyUpdatesProps> = ({ onContinue }) => {
  const features = [
    'Credit score changes',
    'Removed or updated negative accounts',
    'Dispute progress',
    'Current credit utilization',
    'Funding readiness score',
    'Recommended next steps'
  ];

  return (
    <section id="step-7" className="py-16 sm:py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Step 7 of Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Track Your Progress Every Month
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Each month your credit report updates, allowing you to see:
          </p>
        </div>

        {/* 6 Clean Feature Cards in Dark Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-10">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-md hover:border-slate-700 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-white">
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* Quote Callout Card */}
        <div className="max-w-3xl mx-auto bg-slate-950 rounded-3xl border border-blue-500/30 p-8 text-center shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4">
            <p className="text-lg sm:text-xl font-medium text-slate-200 italic leading-relaxed">
              &ldquo;You don&apos;t have to guess whether you&apos;re making progress. Your The CapSol account keeps your credit journey organized.&rdquo;
            </p>
            <div className="pt-2 flex items-center justify-center gap-2 text-xs text-cyan-400 font-bold uppercase tracking-wider">
              <span>The CapSol Dashboard Guarantee</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800 flex justify-center">
            <button
              onClick={onContinue}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors text-center"
            >
              <span>Proceed to Step 8 (Funding Destination)</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
