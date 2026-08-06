import React from "react";

interface BasicSupportProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  overviewTab: React.ReactNode;
  ticketsTab: React.ReactNode;
  faqTab: React.ReactNode;
  contactTab: React.ReactNode;
  livechatTab: React.ReactNode;
  setShowAddClient: (val: boolean) => void;
}

export default function BasicSupport({
  activeTab,
  setActiveTab,
  overviewTab,
  ticketsTab,
  faqTab,
  contactTab,
  livechatTab
}: BasicSupportProps) {
  return (
    <div className="basic-admin-page-shell">
      <div className="basic-admin-page-hero">
        <div className="space-y-3">
          <span className="basic-admin-page-badge">Basic support desk</span>
          <h1 className="basic-admin-page-title">Support Center</h1>
          <p className="basic-admin-page-description">
            Jump between tickets, FAQs, contact details, and live chat with the same lighter basic portal treatment.
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="basic-admin-page-panel w-full shrink-0 lg:w-72">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Navigation</h2>
            <span className="basic-admin-page-badge">{activeTab}</span>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'tickets', label: 'My Tickets' },
              { id: 'faq', label: 'FAQ' },
              { id: 'contact', label: 'Contact Us' },
              { id: 'livechat', label: 'Live Chat' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border border-sky-300 bg-gradient-to-r from-sky-500 to-emerald-400 text-white shadow-sm shadow-sky-200 dark:border-sky-500/20 dark:shadow-none'
                    : 'border border-transparent text-slate-700 hover:border-sky-100 hover:bg-sky-50 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="basic-admin-page-panel w-full min-h-[500px] flex-1">
          <div className="mb-5 flex items-center justify-between border-b border-sky-100/80 pb-4 dark:border-slate-800">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {activeTab === 'overview' && 'Support Overview'}
              {activeTab === 'tickets' && 'Ticket Management'}
              {activeTab === 'faq' && 'Frequently Asked Questions'}
              {activeTab === 'contact' && 'Contact Information'}
              {activeTab === 'livechat' && 'Live Chat Support'}
            </h2>
          </div>
          <div className="basic-admin-page-section min-h-[380px]">
            {activeTab === "overview" && overviewTab}
            {activeTab === "tickets" && ticketsTab}
            {activeTab === "faq" && faqTab}
            {activeTab === "contact" && contactTab}
            {activeTab === "livechat" && livechatTab}
          </div>
        </div>
      </div>
    </div>
  );
}
