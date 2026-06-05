import React from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";

interface EliteInvoicesProps {
  children?: React.ReactNode;
}

export default function EliteInvoices({ children }: EliteInvoicesProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="elite-page-shell">
        {/* Background Electric Glows */}
      <div className="elite-page-glow-primary"></div>
      <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto space-y-6 relative z-10 elite-nested-wrapper">
          
          {/* HEADER */}
          <motion.div variants={itemVariants} className="bg-white p-8 rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-[#00d4ff]/20 to-[#7000ff]/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 dark:from-white via-[#7000ff] to-[#00d4ff] tracking-tight flex items-center gap-2 mb-2">
                <FileText className="h-8 w-8 text-[#7000ff]" /> Billing & Funding Receipts
              </h1>
              <p className="text-sm font-semibold text-slate-500 max-w-xl">
                Manage and review your VIP funding charge invoices seamlessly.
              </p>
            </div>
          </motion.div>

          <style dangerouslySetInnerHTML={{__html: `
            .dark .elite-nested-wrapper .dark\\:bg-slate-800\/90 {
              background-color: rgba(15, 23, 42, 0.88) !important;
            }
            .dark .elite-nested-wrapper .dark\\:border-slate-700 {
              border-color: #334155 !important;
            }
            .dark .elite-nested-wrapper .dark\\:text-slate-400 {
              color: #94a3b8 !important;
            }
            .dark .elite-nested-wrapper .dark\\:bg-slate-900\/40 {
              background-color: rgba(15, 23, 42, 0.65) !important;
            }
            .elite-nested-wrapper .gradient-text-primary {
              background: linear-gradient(to right, #0f172a, #334155);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .dark .elite-nested-wrapper .gradient-text-primary {
              background: linear-gradient(to right, #f8fafc, #c084fc);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .elite-nested-wrapper .gradient-primary {
              background: linear-gradient(to right, #0f172a, #334155) !important;
              color: white !important;
            }
            .dark .elite-nested-wrapper .gradient-primary {
              background: linear-gradient(to right, #06b6d4, #7c3aed) !important;
              color: #f8fafc !important;
            }
            .elite-nested-wrapper .gradient-primary:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
            /* Table specific overrides */
            .elite-nested-wrapper table {
              border-collapse: separate !important;
              border-spacing: 0 !important;
            }
            .elite-nested-wrapper thead th {
              background-color: #f8fafc !important;
              color: #475569 !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              font-size: 0.75rem !important;
              padding: 1rem !important;
            }
            .elite-nested-wrapper tbody tr {
              transition: all 0.2s ease !important;
            }
            .elite-nested-wrapper tbody tr:hover {
              background-color: #f8fafc !important;
            }
            .elite-nested-wrapper tbody td {
              padding: 1rem !important;
              border-top: 1px solid #f1f5f9 !important;
            }
            .dark .elite-nested-wrapper thead th {
              background-color: #0f172a !important;
              color: #94a3b8 !important;
            }
            .dark .elite-nested-wrapper tbody tr:hover {
              background-color: rgba(15, 23, 42, 0.65) !important;
            }
            .dark .elite-nested-wrapper tbody td {
              border-top: 1px solid #1e293b !important;
            }
          `}} />

          {/* MAIN CONTENT WRAPPER */}
          <motion.div variants={itemVariants} className="w-full relative">
            {children}
          </motion.div>

        </motion.div>
      </div>
  );
}
