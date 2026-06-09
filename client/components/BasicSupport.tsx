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
    <div className="max-w-7xl mx-auto p-4 space-y-6 bg-white border border-gray-300">
      
      {/* Header */}
      <div className="border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 uppercase">Support Center</h1>
        <p className="text-sm text-gray-600">Standard Assistance & Ticketing</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 shrink-0 border border-gray-300 bg-gray-50">
          <div className="bg-gray-100 border-b border-gray-300 p-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase">Navigation</h2>
          </div>
          <div className="flex flex-col divide-y divide-gray-200">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'tickets', label: 'My Tickets' },
              { id: 'faq', label: 'FAQ' },
              { id: 'contact', label: 'Contact Us' },
              { id: 'livechat', label: 'Live Chat' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-left px-4 py-3 text-sm font-semibold uppercase ${
                  activeTab === tab.id 
                    ? 'bg-black text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 border border-gray-300 w-full min-h-[500px]">
          <div className="bg-gray-100 border-b border-gray-300 p-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase">
              {activeTab === 'overview' && 'Support Overview'}
              {activeTab === 'tickets' && 'Ticket Management'}
              {activeTab === 'faq' && 'Frequently Asked Questions'}
              {activeTab === 'contact' && 'Contact Information'}
              {activeTab === 'livechat' && 'Live Chat Support'}
            </h2>
          </div>
          <div className="p-6 bg-white">
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
