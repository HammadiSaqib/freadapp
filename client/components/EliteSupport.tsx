import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LifeBuoy,
  MessageSquare,
  Book,
  Phone,
  Ticket,
  Crown,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface EliteSupportProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  overviewTab: React.ReactNode;
  ticketsTab: React.ReactNode;
  faqTab: React.ReactNode;
  contactTab: React.ReactNode;
  livechatTab: React.ReactNode;
  setShowAddClient: (val: boolean) => void;
}

export default function EliteSupport({
  activeTab,
  setActiveTab,
  overviewTab,
  ticketsTab,
  faqTab,
  contactTab,
  livechatTab
}: EliteSupportProps) {
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
                <Crown className="h-8 w-8 text-[#7000ff]" /> VIP Support Center
              </h1>
              <p className="text-sm font-semibold text-slate-500 max-w-xl">
                Welcome to your Elite concierge. Enjoy priority routing, dedicated agents, and lightning-fast resolution times.
              </p>
            </div>
            
            <div className="flex items-center gap-4 relative z-10 shrink-0">
              <Button onClick={() => setActiveTab("livechat")} className="bg-gradient-to-r from-[#00d4ff] to-[#00ffcc] text-slate-900 shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] border-0 text-xs font-black uppercase tracking-wider rounded-xl h-12 px-6 transition-all">
                <MessageSquare className="w-4 h-4 mr-2" /> Start VIP Chat
              </Button>
            </div>
          </motion.div>

          {/* TABS */}
          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center mb-8">
                <TabsList className="h-14 bg-white border border-slate-100 rounded-2xl shadow-sm p-1 flex overflow-x-auto no-scrollbar max-w-full">
                  <TabsTrigger value="overview" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white px-6">
                    <LifeBuoy className="w-4 h-4 mr-2" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="tickets" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white px-6">
                    <Ticket className="w-4 h-4 mr-2" /> My Tickets
                  </TabsTrigger>
                  <TabsTrigger value="faq" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white px-6">
                    <Book className="w-4 h-4 mr-2" /> FAQ
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white px-6">
                    <Phone className="w-4 h-4 mr-2" /> Contact
                  </TabsTrigger>
                  <TabsTrigger value="livechat" className="rounded-xl text-xs font-bold uppercase tracking-wider data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-900 data-[state=active]:to-slate-800 data-[state=active]:text-white px-6">
                    <MessageSquare className="w-4 h-4 mr-2" /> Live Chat
                  </TabsTrigger>
                </TabsList>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="w-full"
                >
                  {activeTab === "overview" && overviewTab}
                  {activeTab === "tickets" && ticketsTab}
                  {activeTab === "faq" && faqTab}
                  {activeTab === "contact" && contactTab}
                  {activeTab === "livechat" && livechatTab}
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </motion.div>

        </motion.div>
      </div>
  );
}
