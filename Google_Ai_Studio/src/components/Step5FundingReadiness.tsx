import React from 'react';
import { ShieldAlert, TrendingUp, ArrowRight } from 'lucide-react';

interface Step5FundingReadinessProps {
  onContinue: () => void;
}

export const Step5FundingReadiness: React.FC<Step5FundingReadinessProps> = ({ onContinue }) => {
  const commonFactors = [
    'Collections',
    'Charge-offs',
    'Late payments',
    'High credit utilization',
    'Excessive inquiries',
    'Negative accounts',
    'Credit profile weaknesses',
    'Other funding readiness issues'
  ];

  return (
    <section id="step-5" className="py-16 sm:py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Step 5 of Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Know What Is Holding You Back
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            The CapSol does more than store your credit report. Our system helps identify factors
            that may prevent you from being institutionally ready for funding.
          </p>
        </div>

        {/* Dashboard-Style Visual Section in Dark Theme */}
        <div className="max-w-3xl mx-auto bg-slate-950 rounded-3xl border-2 border-slate-800 shadow-2xl p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Example Dashboard Preview
              </span>
              <h3 className="text-2xl font-bold text-white mt-1">
                Your Funding Readiness
              </h3>
            </div>

            {/* Score Pill */}
            <div className="bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block font-semibold">Institutional Readiness</span>
              <span className="text-2xl font-black text-amber-400">72%</span>
            </div>
          </div>

          {/* Current Issues */}
          <div className="pt-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Current Issues:
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-center">
                <span className="text-lg font-black text-rose-400 block">2</span>
                <span className="text-xs text-slate-300 font-semibold">Collections</span>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-center">
                <span className="text-lg font-black text-amber-400 block">1</span>
                <span className="text-xs text-slate-300 font-semibold">Late Payment</span>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-center">
                <span className="text-lg font-black text-orange-400 block">67%</span>
                <span className="text-xs text-slate-300 font-semibold">Utilization</span>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-center">
                <span className="text-lg font-black text-cyan-400 block">8</span>
                <span className="text-xs text-slate-300 font-semibold">Recent Inquiries</span>
              </div>
            </div>

            {/* Recommended Path Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-900/60 to-indigo-950/60 border border-blue-500/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div>
                <span className="text-xs text-cyan-300 uppercase font-bold block">System Recommendation</span>
                <span className="text-base sm:text-lg font-extrabold text-white">
                  Recommended Path: <strong className="text-cyan-300">Start Credit Repair</strong>
                </span>
              </div>
              <button
                onClick={onContinue}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors shrink-0"
              >
                View Dispute Process →
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center mt-4">
              * This should only be an example UI, not hard-coded client data.
            </p>
          </div>
        </div>

        {/* Clean list of factors */}
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Factors The CapSol Identifies:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {commonFactors.map((factor) => (
              <span
                key={factor}
                className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-300 font-medium"
              >
                {factor}
              </span>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={onContinue}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors text-center"
            >
              <span>Proceed to Step 6 (Dispute Process)</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
