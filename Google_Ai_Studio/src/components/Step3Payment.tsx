import React, { useState } from 'react';
import { CreditCard, CheckCircle2, XCircle, ArrowDown, ArrowRight, AlertOctagon, Mail, Copy, Check } from 'lucide-react';

interface Step3PaymentProps {
  onContinue: () => void;
}

export const Step3Payment: React.FC<Step3PaymentProps> = ({ onContinue }) => {
  const [userEmail, setUserEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!userEmail) return;
    navigator.clipboard.writeText(userEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayEmail = userEmail.trim() ? userEmail.trim() : 'john@email.com';

  return (
    <section id="step-3" className="py-16 sm:py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-cyan-400 border border-cyan-500/30">
            Step 3 of Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Step 3: Complete Your $297 Monthly Payment
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            During checkout, Stripe will ask for your email address.{' '}
            <strong className="text-cyan-400 font-bold">Use the same email address again.</strong>
          </p>
        </div>

        {/* Example Flow Diagram */}
        <div className="max-w-3xl mx-auto mb-10 bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            How The 3 Emails Connect
          </span>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm font-semibold">
            <div className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 w-full sm:w-auto">
              <span className="text-xs text-slate-400 block mb-0.5">Step 1</span>
              <span>Credit Monitoring Email</span>
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400 hidden sm:block" />
            <ArrowDown className="w-4 h-4 text-cyan-400 sm:hidden" />

            <div className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 w-full sm:w-auto">
              <span className="text-xs text-slate-400 block mb-0.5">Step 2</span>
              <span>The CapSol Registration Email</span>
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400 hidden sm:block" />
            <ArrowDown className="w-4 h-4 text-cyan-400 sm:hidden" />

            <div className="bg-slate-900 px-4 py-3 rounded-xl border border-slate-800 w-full sm:w-auto">
              <span className="text-xs text-slate-400 block mb-0.5">Step 3</span>
              <span>Stripe Payment Email</span>
            </div>
          </div>

          <div className="mt-4">
            <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold">
              All three should match
            </span>
          </div>
        </div>

        {/* Visual Example: Correct vs Incorrect */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          
          {/* Correct Box */}
          <div className="bg-slate-950 rounded-2xl border-2 border-emerald-500/80 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Correct
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Matches
              </span>
            </div>

            <div className="space-y-2.5 bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans text-xs">Monitoring:</span>
                <span className="text-emerald-400">{displayEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans text-xs">CapSol CRM:</span>
                <span className="text-emerald-400">{displayEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans text-xs">Stripe:</span>
                <span className="text-emerald-400">{displayEmail}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>✅ Account Match Successful</span>
            </div>
          </div>

          {/* Incorrect Box */}
          <div className="bg-slate-950 rounded-2xl border-2 border-rose-500/80 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                Incorrect
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                Mismatch
              </span>
            </div>

            <div className="space-y-2.5 bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs sm:text-sm text-slate-200 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans text-xs">Monitoring:</span>
                <span className="text-slate-300">john@email.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans text-xs">CapSol CRM:</span>
                <span className="text-rose-400 bg-rose-950/60 px-1 rounded">john.smith@email.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans text-xs">Stripe:</span>
                <span className="text-slate-300">john@email.com</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-rose-400 font-bold text-xs sm:text-sm leading-tight">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>❌ This may prevent your credit report from being connected correctly.</span>
            </div>
          </div>

        </div>

        {/* Strong Note Callout */}
        <div className="max-w-2xl mx-auto bg-rose-950/40 border border-rose-500/50 rounded-2xl p-5 text-center shadow-lg">
          <h4 className="text-base font-bold text-white mb-1 flex items-center justify-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            Do not use a different email during payment.
          </h4>
          <p className="text-xs sm:text-sm text-slate-300">
            Please make sure you type the exact same primary email address when the Stripe payment screen appears.
          </p>
        </div>

        {/* Continue CTA */}
        <div className="text-center mt-10">
          <button
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all text-center"
          >
            <span>Proceed to Step 4 (Credit Report Ingress)</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

      </div>
    </section>
  );
};
