import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type DashboardStats = {
  totalClients: number;
  fundable: number;
  notFundable: number;
};

type DashboardClient = {
  id: number;
  name: string;
  email: string;
  status: string;
  creditScore: number;
  previousScore: number;
  fundableStatus?: string;
};

interface BasicDashboardProps {
  stats: DashboardStats;
  clients: DashboardClient[];
  loading: boolean;
  creditReportLink: string;
  clientLoginUrl: string;
  onAddClient: () => void;
  onCopyCreditReportLink: () => void;
  onCopyClientLoginLink: () => void;
}

export default function BasicDashboard({
  stats,
  clients,
  loading,
  creditReportLink,
  clientLoginUrl,
  onAddClient,
  onCopyCreditReportLink,
  onCopyClientLoginLink,
}: BasicDashboardProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 bg-white border border-gray-300">
      
      {/* Header */}
      <div className="border-b border-gray-300 pb-4 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-gray-900 uppercase">Dashboard Overview</h1>
          <p className="text-sm text-gray-600">Standard Management View</p>
        </div>
        <Button onClick={onAddClient} variant="outline" className="rounded-none border-gray-400 bg-gray-100 text-black hover:bg-gray-200">
          + Add Client
        </Button>
      </div>

      {/* Simple Stats Row */}
      <div className="flex flex-wrap gap-4 border border-gray-300 bg-gray-50 p-4">
        <div className="flex-1 min-w-[150px]">
          <div className="text-xs font-semibold text-gray-500 uppercase">Total Clients</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.totalClients || 0}</div>
        </div>
        <div className="w-px bg-gray-300 hidden sm:block"></div>
        <div className="flex-1 min-w-[150px]">
          <div className="text-xs font-semibold text-gray-500 uppercase">Fundable</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.fundable || 0}</div>
        </div>
        <div className="w-px bg-gray-300 hidden sm:block"></div>
        <div className="flex-1 min-w-[150px]">
          <div className="text-xs font-semibold text-gray-500 uppercase">Not Fundable</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? "..." : stats.notFundable || 0}</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        
        {/* Left Column: Clients List */}
        <div className="flex-[3] border border-gray-300">
          <div className="bg-gray-100 border-b border-gray-300 p-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase">Client Directory</h2>
          </div>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-300 text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name / Email</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Score</th>
                  <th className="px-4 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-4 text-gray-500">Loading records...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-4 text-gray-500">No records found.</td></tr>
                ) : (
                  clients.slice(0, 8).map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">{client.name}</div>
                        <div className="text-gray-500 text-xs">{client.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs border border-gray-300 bg-white px-2 py-1 uppercase">{client.status || "Active"}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {client.creditScore || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="text-blue-600 hover:underline text-xs uppercase font-semibold"
                        >
                          [ View ]
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && clients.length > 8 && (
              <div className="p-3 border-t border-gray-300 bg-gray-50 text-center">
                <button onClick={() => navigate("/clients")} className="text-blue-600 hover:underline text-xs uppercase font-semibold">
                  View All Records
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Links */}
        <div className="flex-1 space-y-6">
          <div className="border border-gray-300">
            <div className="bg-gray-100 border-b border-gray-300 p-3">
              <h2 className="text-sm font-bold text-gray-800 uppercase">System Links</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Client Portal Login:</label>
                <div className="flex">
                  <input type="text" readOnly value={clientLoginUrl} className="flex-1 border border-gray-300 p-1 text-xs bg-gray-50 text-gray-600" />
                  <button onClick={onCopyClientLoginLink} className="border border-l-0 border-gray-300 bg-gray-200 px-3 text-xs font-bold hover:bg-gray-300">COPY</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Credit Report Reg:</label>
                <div className="flex">
                  <input type="text" readOnly value={creditReportLink} className="flex-1 border border-gray-300 p-1 text-xs bg-gray-50 text-gray-600" />
                  <button onClick={onCopyCreditReportLink} className="border border-l-0 border-gray-300 bg-gray-200 px-3 text-xs font-bold hover:bg-gray-300">COPY</button>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-gray-400 bg-gray-100 p-4 text-center">
            <h3 className="text-sm font-bold text-black uppercase mb-2">Upgrade Required</h3>
            <p className="text-xs text-gray-700 mb-3">
              Advanced analytics, pipelines, and full white-labeling are restricted to Elite accounts.
            </p>
            <button onClick={() => navigate("/subscription")} className="border border-black bg-white px-4 py-2 text-xs font-bold uppercase hover:bg-gray-200 w-full">
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
