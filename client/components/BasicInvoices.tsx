import React from "react";

interface BasicInvoicesProps {
  children?: React.ReactNode;
}

export default function BasicInvoices({ children }: BasicInvoicesProps) {
  return (
    <div className="basic-admin-page-shell">
      <div className="basic-admin-page-hero">
        <div className="space-y-3">
          <span className="basic-admin-page-badge">Basic finance records</span>
          <h1 className="basic-admin-page-title">Billing Invoices</h1>
          <p className="basic-admin-page-description">
            Review issued invoices, check balances, and copy invoice links from the same refreshed basic portal surface.
          </p>
        </div>
      </div>

      <div className="basic-admin-page-panel">
        <div className="mb-5 flex items-center justify-between border-b border-sky-100/80 pb-4 dark:border-slate-800">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Invoice History</h2>
          <span className="basic-admin-page-badge">Admin billing</span>
        </div>
        <div className="basic-admin-page-section w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
