import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, Copy, Check } from 'lucide-react';

interface EmailConsistencyAlertProps {
  variant?: 'banner' | 'card' | 'checker';
}

export const EmailConsistencyAlert: React.FC<EmailConsistencyAlertProps> = ({
  variant = 'banner'
}) => {
  const [testEmail, setTestEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    if (!testEmail) return;
    navigator.clipboard.writeText(testEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'banner') {
    return (
      <div className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white px-4 py-2.5 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/20 text-white font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <p className="font-semibold text-white">
              <span className="font-black uppercase tracking-wider text-[11px] bg-black/30 px-2 py-0.5 rounded mr-2">
                RULE #1
              </span>
              Use the <strong className="underline decoration-white font-black">SAME EMAIL ADDRESS</strong> for Credit Monitoring, The CapSol CRM, and Stripe Payment!
            </p>
          </div>
          <a
            href="#step-1"
            className="w-full sm:w-auto text-center shrink-0 text-xs font-bold bg-white text-slate-950 px-4 py-1.5 rounded-lg shadow hover:bg-slate-100 transition-colors"
          >
            Start Step 1 →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-5 bg-slate-900 border-amber-500/50 text-white shadow-xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
            Mandatory Matching Rule
          </span>
          <h3 className="text-base sm:text-lg font-bold text-white">
            USE THE SAME EMAIL ADDRESS
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            When registering with <strong>The CapSol</strong>, enter the{' '}
            <strong className="text-amber-300 underline decoration-amber-400 underline-offset-2">
              exact same email address
            </strong>{' '}
            you used with MyScoreIQ, IdentityIQ, or MyFreeScoreNow, and Stripe.
          </p>
        </div>
      </div>
    </div>
  );
};
