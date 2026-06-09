import React from "react";

interface BasicInvoicesProps {
  children?: React.ReactNode;
}

export default function BasicInvoices({ children }: BasicInvoicesProps) {
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 bg-white border border-gray-300">
      
      {/* Header */}
      <div className="border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 uppercase">Billing Invoices</h1>
        <p className="text-sm text-gray-600">Standard Financial Records</p>
      </div>

      <div className="border border-gray-300 bg-gray-50">
        <div className="bg-gray-100 border-b border-gray-300 p-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase">Invoice History</h2>
        </div>
        <div className="p-6 bg-white w-full">
          {children}
        </div>
      </div>

    </div>
  );
}
