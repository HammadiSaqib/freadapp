import React from 'react';
import { ArrowRight, CheckCircle2, TrendingUp, Sparkles, Award } from 'lucide-react';

export const Step8FundingJourney: React.FC = () => {
  const journeyMilestones = [
    { name: 'Credit Monitoring', desc: 'Secure 3-Bureau Ingress' },
    { name: 'Credit Analysis', desc: 'Identify Derogatory Items' },
    { name: 'Credit Repair', desc: 'Dispute Bureau Errors' },
    { name: 'Monthly Improvement', desc: 'Track Score & Deletions' },
    { name: 'Institutional Readiness', desc: 'Meet Bank Lending Metrics' },
    { name: 'FUNDING', desc: 'Access Institutional Capital', isFinal: true }
  ];

  return (
    <section id="step-8" className="py-16 sm:py-20 bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            The Ultimate Destination
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            When You&apos;re Ready for Funding, The System Will Tell You
          </h2>
          <p className="text-base sm:text-xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-emerald-300">
            &ldquo;Repair your credit with a destination — becoming funding ready.&rdquo;
          </p>
        </div>

        {/* Milestone Progression Bar in Dark Theme */}
        <div className="max-w-5xl mx-auto mb-10">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {journeyMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-4 text-center border transition-all flex flex-col justify-between ${
                  milestone.isFinal
                    ? 'bg-gradient-to-b from-emerald-950/80 to-slate-950 border-emerald-500/80 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                    milestone.isFinal ? 'text-emerald-400' : 'text-slate-500'
                  }`}>
                    Stage 0{idx + 1}
                  </span>
                  <h3 className={`text-xs sm:text-sm font-bold ${
                    milestone.isFinal ? 'text-emerald-300 text-sm font-extrabold' : 'text-white'
                  }`}>
                    {milestone.name}
                  </h3>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 leading-tight">
                  {milestone.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Destination Summary Card */}
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Award className="w-5 h-5" />
          </div>
          <h4 className="text-lg font-bold text-white">
            Credit Repair Built for Institutional Underwriting
          </h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
            Instead of just disputing endlessly, The CapSol aligns your profile with Tier-1 bank and institutional lending requirements so you can get funded.
          </p>
        </div>

      </div>
    </section>
  );
};
