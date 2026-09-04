import React from 'react';
import { Database, Cpu, Search, CheckCircle2, TrendingUp, ArrowDown, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

interface Step4ProcessFlowProps {
  onContinue: () => void;
}

export const Step4ProcessFlow: React.FC<Step4ProcessFlowProps> = ({ onContinue }) => {
  const workflowSteps = [
    {
      step: '1',
      title: 'Monitoring Account',
      desc: 'Connects your MyScoreIQ or MyFreeScoreNow credentials.',
      icon: Database,
    },
    {
      step: '2',
      title: 'The CapSol CRM',
      desc: 'Matches your email and securely pulls your credit report.',
      icon: Cpu,
    },
    {
      step: '3',
      title: 'Credit Report Analysis',
      desc: 'The system reviews late payments, collections, and negative accounts.',
      icon: Search,
    },
    {
      step: '4',
      title: 'Institutional Readiness',
      desc: 'Calculates your readiness for bank loans and funding.',
      icon: ShieldCheck,
    },
    {
      step: '5',
      title: 'Credit Repair or Funding Path',
      desc: 'Launches your dispute letters or maps your funding path.',
      icon: TrendingUp,
    }
  ];

  return (
    <section id="step-4" className="py-16 sm:py-20 bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-cyan-400 border border-cyan-500/30">
            Step 4 of Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Step 4: Your Credit Report Enters The CapSol
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            After successful registration and payment, our system will connect with your credit
            monitoring account and pull your credit report into The CapSol CRM.
          </p>
        </div>

        {/* Clean Process Workflow */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-stretch">
            {workflowSteps.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <div key={item.step} className="flex flex-col items-center">
                  <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center h-full flex flex-col items-center justify-between shadow-md hover:border-slate-700 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-blue-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs mb-3">
                      {item.step}
                    </div>
                    <div className="mb-2">
                      <IconComp className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                      <h3 className="text-sm font-bold text-white leading-tight">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-normal">
                      {item.desc}
                    </p>
                  </div>

                  {idx < workflowSteps.length - 1 && (
                    <div className="md:hidden my-2 text-slate-600">
                      <ArrowDown className="w-4 h-4 text-cyan-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Simple Note & Advance Button */}
        <div className="max-w-xl mx-auto text-center bg-slate-900 p-5 rounded-2xl border border-slate-800">
          <p className="text-xs sm:text-sm text-slate-300 mb-4">
            Our automated analysis instantly maps out the best plan for your credit profile.
          </p>
          <button
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors text-center"
          >
            <span>Proceed to Step 5 (Funding Barriers)</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

      </div>
    </section>
  );
};
