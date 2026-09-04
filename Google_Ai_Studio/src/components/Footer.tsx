import React from 'react';
import { Shield, ExternalLink, Mail, Lock, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs py-14 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight">The CapSol</span>
              <p className="text-xs text-slate-400">Credit Repair &amp; Funding CRM Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              href="https://thecapsol.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-white flex items-center gap-1"
            >
              <span>thecapsol.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-700">•</span>
            <a
              href="https://member.thecapsol.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              <span>Member Login</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-700">•</span>
            <a href="#step-1" className="hover:text-white">Credit Monitoring</a>
            <span className="text-slate-700">•</span>
            <a href="#step-2" className="hover:text-white">Client Basic ($297/mo)</a>
            <span className="text-slate-700">•</span>
            <a href="#mastermind" className="hover:text-white">Friday Mastermind</a>
            <span className="text-slate-700">•</span>
            <a href="#checklist" className="hover:text-white">Verification Checklist</a>
          </div>
        </div>

        {/* Disclaimer texts */}
        <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed max-w-5xl">
          <p>
            <strong>Disclosures &amp; Legal Notices:</strong> The CapSol is a credit repair and funding preparation management software and educational consulting ecosystem. We advocate for consumer statutory rights under the Fair Credit Reporting Act (FCRA), Fair Debt Collection Practices Act (FDCPA), and Credit Repair Organizations Act (CROA). We do not provide legal advice, nor do we guarantee specific credit score increases or guaranteed funding approvals, as all underwriting and lending decisions are made independently by third-party financial institutions and bureaus.
          </p>
          <p>
            <strong>Critical Email Notice:</strong> To ensure automated data ingestion from third-party credit monitoring services (MyScoreIQ, IdentityIQ, MyFreeScoreNow) to The CapSol CRM and Stripe payment processing, users must strictly register using identical primary email addresses.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bank-grade 256-Bit SSL Encryption • Secure Cloud Architecture</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} The CapSol. All rights reserved. Friday Mastermind Class.
          </div>
        </div>

      </div>
    </footer>
  );
};
