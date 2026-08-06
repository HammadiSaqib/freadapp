import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface EliteSettingsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children?: React.ReactNode;
  notifyClientAfterReportPull?: boolean;
  notifyClientAfterReportPullSaving?: boolean;
  onNotifyClientAfterReportPullChange?: (enabled: boolean) => void;
}

export default function EliteSettings(props: EliteSettingsProps) {
  const { activeTab } = props;

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
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-[#77dd77]/20 to-[#004225]/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 dark:from-white via-[#004225] to-[#77dd77] tracking-tight flex items-center gap-2 mb-2">
                <SettingsIcon className="h-8 w-8 text-[#004225]" /> System Configurations
              </h1>
              <p className="text-sm font-semibold text-slate-500 max-w-xl">
                Manage your VIP preferences, deep integrations, and advanced system behaviors.
              </p>
            </div>
            <div className="relative z-10 flex max-w-md items-center gap-3 rounded-lg border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
              <Label htmlFor="notify-client-after-report-pull" className="cursor-pointer text-sm font-semibold leading-snug text-slate-700">
                Notify client via email after successful report pulled.
              </Label>
              <Switch
                id="notify-client-after-report-pull"
                checked={props.notifyClientAfterReportPull !== false}
                disabled={props.notifyClientAfterReportPullSaving}
                onCheckedChange={props.onNotifyClientAfterReportPullChange}
              />
            </div>
          </motion.div>

          <style dangerouslySetInnerHTML={{__html: `
            .elite-nested-wrapper [role="tablist"] {
              background: white !important;
              border: 1px solid #f1f5f9 !important;
              border-radius: 1rem !important;
              box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
              padding: 0.5rem !important;
              height: auto !important;
              display: flex !important;
              flex-wrap: wrap !important;
              justify-content: center !important;
              gap: 0.5rem !important;
            }
            .elite-nested-wrapper [role="tab"] {
              border-radius: 0.75rem !important;
              font-size: 0.75rem !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              padding: 0.75rem 1.5rem !important;
              transition: all 0.2s ease !important;
              flex: 1 1 auto !important;
              max-width: max-content !important;
            }
            .elite-nested-wrapper [role="tab"][data-state="active"] {
              background: linear-gradient(to right, #0f172a, #1e293b) !important;
              color: white !important;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
            }
            .elite-nested-wrapper [role="tab"]:not([data-state="active"]):hover {
              background: #f8fafc !important;
              color: #0f172a !important;
            }
            .dark .elite-nested-wrapper [role="tablist"] {
              background: rgba(15, 23, 42, 0.8) !important;
              border-color: #1e293b !important;
              box-shadow: 0 1px 2px 0 rgba(2, 6, 23, 0.4) !important;
            }
            .dark .elite-nested-wrapper [role="tab"][data-state="active"] {
              background: linear-gradient(to right, #004225, #77dd77) !important;
              color: #f8fafc !important;
              box-shadow: 0 0 18px rgba(119, 221, 119, 0.22) !important;
            }
            .dark .elite-nested-wrapper [role="tab"]:not([data-state="active"]):hover {
              background: #111827 !important;
              color: #f8fafc !important;
            }
            
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
              background: linear-gradient(to right, #f8fafc, #77dd77);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .elite-nested-wrapper .gradient-primary {
              background: linear-gradient(to right, #0f172a, #334155) !important;
              color: white !important;
            }
            .dark .elite-nested-wrapper .gradient-primary {
              background: linear-gradient(to right, #004225, #77dd77) !important;
              color: #f8fafc !important;
            }
            .elite-nested-wrapper .gradient-primary:hover {
              opacity: 0.9;
              transform: translateY(-1px);
            }
          `}} />

          {/* SETTINGS CONTENT WRAPPER */}
          <motion.div variants={itemVariants} className="w-full relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {props.children}
              </motion.div>
            </AnimatePresence>
          </motion.div>

        </motion.div>
      </div>
  );
}
