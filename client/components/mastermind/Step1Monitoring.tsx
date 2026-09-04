import React from 'react';
import { Shield, Check, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { QRCodeCard } from './QRCodeCard';

interface Step1MonitoringProps {
  onContinue: () => void;
}

export const Step1Monitoring: React.FC<Step1MonitoringProps> = ({ onContinue }) => {
  return (
    <section id="step-1" className="py-16 sm:py-20 bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Step Header */}
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-cyan-400 border border-cyan-500/30">
            Step 1 of Onboarding
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Step 1: Register for Credit Monitoring
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            You must have an active credit monitoring account before registering with The CapSol.
            <br className="hidden sm:inline" /> Choose <strong className="text-white font-bold underline decoration-cyan-400 decoration-2 underline-offset-4">ONE</strong> of the approved monitoring services below.
          </p>
        </div>

        {/* 3 Monitoring Cards in Dark Theme */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* Card 1: MyScoreIQ */}
          <div className="flex flex-col justify-between bg-slate-950 rounded-2xl border-2 border-blue-500/60 p-6 shadow-xl relative hover:border-blue-400 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white rounded-full text-[11px] font-black uppercase tracking-wider shadow">
              Option 1 (Popular)
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Provider 1</span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Instant Sync
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">
                MyScoreIQ
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Full 3-Bureau FICO® credit reports with daily monitoring &amp; alerts.
              </p>

              {/* QR and Action Component */}
              <QRCodeCard
                url="https://www.myscoreiq.com/get-fico-preferred.aspx?offercode=432142UK"
                buttonText="Register with MyScoreIQ"
                isAvailable={true}
                badge="Approved"
                accentColor="blue"
              />
            </div>

            {/* Small Note */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 bg-amber-950/40 p-3.5 rounded-xl border border-amber-500/30 text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-normal">
                  <strong className="text-amber-100">Remember the email address you use here.</strong> You must use the same email during The CapSol enrollment and payment.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: IdentityIQ (Coming Soon) */}
          <div className="flex flex-col justify-between bg-slate-950/60 rounded-2xl border border-slate-800 p-6 shadow-md relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase">Option 2</span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg">
                  Link Coming Soon
                </span>
              </div>

              <h3 className="text-2xl font-bold text-slate-200 mb-1">
                IdentityIQ
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Identity theft protection &amp; credit bureau monitoring.
              </p>

              {/* QR and Action Component - Placeholder State */}
              <QRCodeCard
                buttonText="Register with IdentityIQ"
                isAvailable={false}
                placeholderText="Link Coming Soon"
              />
            </div>

            {/* Small Note */}
            <div className="mt-6 pt-4 border-t border-slate-800 text-left">
              <p className="text-xs text-slate-400">
                Link is coming soon. For now, please choose <strong>MyScoreIQ</strong> or <strong>MyFreeScoreNow</strong>.
              </p>
            </div>
          </div>

          {/* Card 3: MyFreeScoreNow */}
          <div className="flex flex-col justify-between bg-slate-950 rounded-2xl border-2 border-slate-800 p-6 shadow-xl relative hover:border-slate-700 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-slate-800 text-slate-300 rounded-full text-[11px] font-black uppercase tracking-wider border border-slate-700">
              Option 3
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Provider 3</span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Approved
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-1">
                MyFreeScoreNow
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Instant 3-bureau credit reports &amp; monthly score updates.
              </p>

              {/* QR and Action Component */}
              <QRCodeCard
                url="https://myfreescorenow.com/company/reference-affiliate-request/Z3JUMlo0d0U="
                buttonText="Register with MyFreeScoreNow"
                isAvailable={true}
                badge="Active"
                accentColor="emerald"
              />
            </div>

            {/* Small Note */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 bg-amber-950/40 p-3.5 rounded-xl border border-amber-500/30 text-left">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200 leading-normal">
                  <strong className="text-amber-100">Use an email address you regularly check</strong> because you will need to use this same email in the next steps.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Callout: Before Continuing */}
        <div className="mt-12 max-w-xl mx-auto bg-slate-950 rounded-2xl p-6 text-center shadow-xl border border-slate-800">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Before Continuing</h3>
          <p className="text-xs sm:text-sm text-slate-300 mb-5">
            Make sure your credit monitoring registration is fully completed and active.
          </p>
          <button
            id="step-1-continue-btn"
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] text-center"
          >
            <span>I Completed Credit Monitoring → Continue</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

      </div>
    </section>
  );
};
