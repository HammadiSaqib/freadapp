import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface Step6DisputeProcessProps {
  onContinue: () => void;
}

export const Step6DisputeProcess: React.FC<Step6DisputeProcessProps> = ({ onContinue }) => {
  const disputeStages = [
    {
      num: '1',
      title: 'Report Imported',
      desc: 'Your credit report is pulled into The CapSol.'
    },
    {
      num: '2',
      title: 'Accounts Reviewed',
      desc: 'Negative items and errors are identified.'
    },
    {
      num: '3',
      title: 'Dispute Strategy Created',
      desc: 'Targeted disputes are prepared.'
    },
    {
      num: '4',
      title: 'Disputes Submitted',
      desc: 'Letters or challenges are sent to credit bureaus.'
    },
    {
      num: '5',
      title: 'Results Updated',
      desc: 'Credit bureaus respond and report changes are tracked.'
    },
    {
      num: '6',
      title: 'Next Round',
      desc: 'If needed, the system prepares the next round of disputes.'
    }
  ];

  return (
    <section id="step-6" className="py-16 sm:py-20 bg-slate-950 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-cyan-400 border border-cyan-500/30">
            Step 6 of Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            The Credit Dispute Process Begins
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            If our system identifies inaccuracies or negative items that can be disputed, the repair process begins.
          </p>
        </div>

        {/* 6 Clear Stages Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-10">
          {disputeStages.map((stage) => (
            <div
              key={stage.num}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-start gap-4 hover:border-slate-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                {stage.num}
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">
                  {stage.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {stage.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance Banner */}
        <div className="max-w-2xl mx-auto bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
          <p className="text-sm font-medium text-slate-200 mb-4">
            Our system works to challenge inaccurate or unverifiable items to help improve your credit profile.
          </p>
          <button
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors text-center"
          >
            <span>Proceed to Step 7 (Monthly Updates)</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>

      </div>
    </section>
  );
};
