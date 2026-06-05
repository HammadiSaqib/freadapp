import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Eye,
  Trash2,
  Phone,
  Mail,
  Copy,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EliteClientsProps {
  clients: any[];
  filteredClients: any[];
  statusCounts: Record<string, number>;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  pagination: { page: number; limit: number; total: number; pages: number };
  setPagination: (p: any) => void;
  handleDeleteClient: (id: number) => void;
  handleToggleLoginStatus: (id: number, status: string) => void;
  setShowAddClient: (v: boolean) => void;
  setShowAddClientManual: (v: boolean) => void;
  clientLoginUrl: string;
  handleCopyClientLoginLink: () => void;
  navigate: (url: string) => void;
  loading: boolean;
}

export default function EliteClients(props: EliteClientsProps) {
  const {
    filteredClients,
    statusCounts,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    pagination,
    setPagination,
    handleDeleteClient,
    handleToggleLoginStatus,
    setShowAddClient,
    setShowAddClientManual,
    clientLoginUrl,
    handleCopyClientLoginLink,
    navigate,
    loading
  } = props;

  const openClientProfile = (clientId: number) => {
    navigate(`/clients/${clientId}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const getStatusBadge = (client: any) => {
    if (client.progress === "improving") {
      return <Badge className="bg-gradient-to-r from-amber-400 to-orange-400 text-white border-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">In Progress</Badge>;
    }
    if (client.status === "Completed") {
      return <Badge className="bg-gradient-to-r from-[#00ffcc] to-emerald-500 text-slate-900 border-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">Completed</Badge>;
    }
    if (client.status === "Inactive") {
      return <Badge className="bg-slate-200 text-slate-600 border-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">Inactive</Badge>;
    }
    return <Badge className="bg-gradient-to-r from-[#00d4ff] to-blue-500 text-white border-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">{client.status}</Badge>;
  };

  const getFundabilityBadge = (client: any) => {
    const isFundable = client.fundingStatus === "Fundable";
    return (
      <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 ${isFundable ? "border-[#00ffcc]/50 text-emerald-700 bg-emerald-50" : "border-[#ff0055]/50 text-rose-600 bg-rose-50"}`}>
        {isFundable ? "Match Ready" : "Not Fundable"}
      </Badge>
    );
  };

  return (
    <div className="elite-page-shell">
        {/* Background Electric Glows */}
        <div className="elite-page-glow-primary"></div>
        <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto space-y-6 relative z-10 elite-nested-wrapper">
          
          {/* STAT CARDS */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              { label: "All Clients", key: "all", count: statusCounts["all"] || 0, color: "from-slate-400 to-slate-500", icon: Users },
              { label: "Login Enabled", key: "login-enabled", count: statusCounts["Login Enabled"] || 0, color: "from-[#00d4ff] to-blue-500", icon: CheckCircle },
              { label: "Login Disabled", key: "login-disabled", count: statusCounts["Login Disabled"] || 0, color: "from-[#ff0055] to-rose-600", icon: AlertCircle },
              { label: "New This Month", key: "New", count: statusCounts["New"] || 0, color: "from-[#00ffcc] to-emerald-500", icon: Plus },
              { label: "Recent Pulls", key: "Report Pull This Month", count: statusCounts["Report Pull This Month"] || 0, color: "from-[#7000ff] to-purple-600", icon: Clock },
            ].map((stat) => (
              <div 
                key={stat.key}
                onClick={() => setStatusFilter(stat.key)}
                className={`group cursor-pointer bg-white p-5 rounded-2xl border ${statusFilter === stat.key ? 'border-[#00d4ff]/50 shadow-[0_8px_30px_rgba(0,212,255,0.15)]' : 'border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md'} transition-all duration-300 relative overflow-hidden`}
              >
                {statusFilter === stat.key && <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${stat.color}`}></div>}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest transition-colors ${statusFilter === stat.key ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`}>{stat.label}</span>
                  <div className={`p-2 rounded-xl shadow-inner ${statusFilter === stat.key ? 'bg-blue-50' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                    <stat.icon className={`h-4 w-4 ${statusFilter === stat.key ? 'text-[#00d4ff]' : 'text-slate-400'}`} />
                  </div>
                </div>
                <div className="text-4xl font-black text-slate-800">{stat.count}</div>
              </div>
            ))}
          </motion.div>

          {/* MAIN PIPELINE AREA */}
          <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 pb-4 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-xl font-black text bg-clip-text bg-gradient-to-r from-slate-900 via-[#7000ff] to-[#00d4ff] tracking-tight">CRM Pipeline</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage Elite Client Network</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search CRM..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10 h-10 border-slate-100 rounded-xl bg-slate-50 text-slate-800 shadow-inner focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 transition-all placeholder:text-slate-400 text-xs font-semibold"
                  />
                </div>
                <Button size="sm" onClick={() => setShowAddClient(true)} className="h-10 w-full sm:w-auto px-4 bg-gradient-to-r from-[#00d4ff] to-[#00ffcc] hover:opacity-90 text-slate-900 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.4)] border-0 text-xs font-black uppercase tracking-wider">
                  <Plus className="h-4 w-4 mr-2" /> Add Client
                </Button>
              </div>
            </div>

            {/* Quick Links Banner */}
            <div className="flex items-center gap-4 p-4 bg-slate-50/50 border-b border-slate-100">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest shrink-0">Portal Link</Label>
              <div className="flex-1 flex items-center gap-2 max-w-md">
                <Input value={clientLoginUrl} readOnly className="h-8 text-[10px] font-mono bg-white border-slate-200 shadow-sm" />
                <Button size="sm" variant="outline" className="h-8 px-3 bg-white hover:bg-blue-50 hover:text-[#00d4ff] hover:border-[#00d4ff]/50 transition-colors" onClick={handleCopyClientLoginLink}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-100">
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 pl-6">Client</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Score & AI</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Status</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Last Pull</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><div className="animate-pulse flex flex-col items-center"><div className="h-8 w-8 rounded-full border-4 border-[#00d4ff] border-t-transparent animate-spin mb-4"></div><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading CRM...</span></div></TableCell></TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm font-bold text-slate-400">No clients found matching criteria.</TableCell></TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 group"
                        onClick={() => openClientProfile(client.id)}
                      >
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                              <AvatarFallback className="bg-gradient-to-br from-[#00d4ff] to-[#7000ff] text-white font-black">
                                {client.name.split(" ").map((n: string) => n[0]).join("").substring(0,2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-bold text-slate-800">{client.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center text-[10px] text-slate-500 font-semibold"><Mail className="h-3 w-3 mr-1 text-slate-400" /> {client.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-sm ${
                              client.creditScore >= 700 ? "bg-gradient-to-br from-[#00ffcc] to-emerald-500" : client.creditScore >= 600 ? "bg-gradient-to-br from-[#ff9900] to-amber-500" : "bg-gradient-to-br from-[#ff0055] to-rose-600"
                            }`}>{client.creditScore > 0 ? client.creditScore : "?"}</div>
                            {getFundabilityBadge(client)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(client)}</TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-700">{client.lastReportPull ? new Date(client.lastReportPull).toLocaleDateString() : "Never"}</div>
                          {client.platform && <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{client.platform}</div>}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 px-3 text-xs font-bold uppercase tracking-wider text-[#7000ff] hover:bg-[#7000ff]"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/credit-report?clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`);
                              }}
                              title="View Work Area">
                              View Work Area
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-500 hover:bg-blue-500 rounded-lg"
                              onClick={(event) => {
                                event.stopPropagation();
                                openClientProfile(client.id);
                              }}
                              title="View Full Profile">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 rounded-lg ${client.status === 'Active' ? 'text-rose-500 hover:bg-rose-500' : 'text-emerald-500 hover:bg-emerald-500'}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleToggleLoginStatus(client.id, client.status === 'Active' ? 'active' : 'inactive');
                              }}
                              title={client.status === 'Active' ? 'Disable Login' : 'Enable Login'}>
                              {client.status === 'Active' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-500 rounded-lg"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteClient(client.id);
                              }}
                              title="Delete Client">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} clients
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-white" disabled={pagination.page <= 1} onClick={() => setPagination({...pagination, page: pagination.page - 1})}><ChevronLeft className="h-4 w-4" /></Button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPagination({...pagination, page: p})}
                      className={`h-7 w-7 rounded-lg text-[11px] font-black transition-all ${pagination.page === p ? "bg-slate-800 text-white shadow-md" : "text-slate-500 bg-white border border-slate-200 hover:border-slate-300"}`}>
                      {p}
                    </button>
                  ))}
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 bg-white" disabled={pagination.page >= pagination.pages} onClick={() => setPagination({...pagination, page: pagination.page + 1})}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
  );
}
