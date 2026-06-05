import React from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  Shield,
  Activity,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EliteReportsProps {
  reports: any[];
  filteredReports: any[];
  totalReports: number;
  recentCount: number;
  thisMonthCount: number;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  platformFilter: string;
  setPlatformFilter: (v: string) => void;
  selectedClientId: string | null;
  setSelectedClientId: (v: string | null) => void;
  loading: boolean;
  fetchingClientId: string | null;
  handleFetchNewReport: (id: string) => void;
  navigate: (url: string) => void;
  
  // Inline Add Client form props
  handleAddClientInline: (e: React.FormEvent) => void;
  addPlatform: string;
  setAddPlatform: (v: string) => void;
  addEmail: string;
  setAddEmail: (v: string) => void;
  addPassword: string;
  setAddPassword: (v: string) => void;
  addSsnLast4: string;
  setAddSsnLast4: (v: string) => void;
  addAuthorization: boolean;
  setAddAuthorization: (v: boolean) => void;
  isAddingClient: boolean;
  showInlinePassword: boolean;
  setShowInlinePassword: (v: boolean) => void;
  formatCreditScore: (v: any) => string;
}

export default function EliteReports(props: EliteReportsProps) {
  const {
    reports,
    filteredReports,
    totalReports,
    recentCount,
    thisMonthCount,
    searchTerm,
    setSearchTerm,
    platformFilter,
    setPlatformFilter,
    selectedClientId,
    setSelectedClientId,
    loading,
    fetchingClientId,
    handleFetchNewReport,
    navigate,
    handleAddClientInline,
    addPlatform,
    setAddPlatform,
    addEmail,
    setAddEmail,
    addPassword,
    setAddPassword,
    addSsnLast4,
    setAddSsnLast4,
    addAuthorization,
    setAddAuthorization,
    isAddingClient,
    showInlinePassword,
    setShowInlinePassword,
    formatCreditScore
  } = props;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="elite-page-shell">
        {/* Background Electric Glows */}
        <div className="elite-page-glow-primary"></div>
        <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto space-y-6 relative z-10 elite-nested-wrapper">
          
          {/* STAT CARDS */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#7000ff] to-[#00d4ff]"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Reports</span>
                <div className="p-2 rounded-xl shadow-inner bg-slate-50"><FileText className="h-4 w-4 text-[#7000ff]" /></div>
              </div>
              <div className="text-4xl font-black text-slate-800">{totalReports}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#00ffcc] to-emerald-500"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Recent Pulls</span>
                <div className="p-2 rounded-xl shadow-inner bg-slate-50"><Activity className="h-4 w-4 text-[#00ffcc]" /></div>
              </div>
              <div className="text-4xl font-black text-slate-800">{recentCount}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#ff0055] to-rose-500"></div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">This Month</span>
                <div className="p-2 rounded-xl shadow-inner bg-slate-50"><Clock className="h-4 w-4 text-[#ff0055]" /></div>
              </div>
              <div className="text-4xl font-black text-slate-800">{thisMonthCount}</div>
            </div>
          </motion.div>

          {/* MAIN AREA */}
          <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="p-6 pb-4 border-b border-slate-100">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text bg-clip-text bg-gradient-to-r from-slate-900 via-[#7000ff] to-[#00d4ff] tracking-tight">Clients Work Area</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Monitor and analyze credit reports across all clients</p>
                </div>
                
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search reports..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="pl-10 h-10 border-slate-100 rounded-xl bg-slate-50 text-slate-800 shadow-inner focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 transition-all placeholder:text-slate-400 text-xs font-semibold"
                    />
                  </div>
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl border-slate-100 bg-slate-50 text-xs font-semibold">
                      <SelectValue placeholder="All Platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      {Array.from(new Set(reports.map((r) => r.platform)))
                        .filter((p) => p && p !== 'Unknown')
                        .map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedClientId || ""} onValueChange={(v) => setSelectedClientId(v === "" ? null : v)}>
                    <SelectTrigger className="w-full sm:w-48 h-10 rounded-xl border-slate-100 bg-slate-50 text-xs font-semibold">
                      <SelectValue placeholder="Select Client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {Array.from(new Set(reports.map(report => report.clientId)))
                        .filter(clientId => clientId && clientId !== "unknown" && clientId !== "")
                        .map(clientId => {
                          const client = reports.find(r => r.clientId === clientId);
                          return (
                            <SelectItem key={clientId} value={clientId}>
                              {client?.clientName || clientId}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Inline Add Report Form */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pull New Report</h3>
                <form className="flex flex-col lg:flex-row items-center gap-3" onSubmit={handleAddClientInline}>
                  <Select value={addPlatform} onValueChange={setAddPlatform}>
                    <SelectTrigger className="w-full lg:w-40 h-9 rounded-lg bg-white text-xs font-semibold shadow-sm">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="myfreescorenow">MyFreeScoreNow</SelectItem>
                      <SelectItem value="identityiq">IdentityIQ</SelectItem>
                      <SelectItem value="myscoreiq">MyScoreIQ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-full lg:w-48 h-9 rounded-lg bg-white shadow-sm text-xs"
                    placeholder="Platform Email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                  />
                  <div className="relative w-full lg:w-48">
                    <Input
                      className="w-full h-9 rounded-lg bg-white shadow-sm text-xs pr-10"
                      type={showInlinePassword ? "text" : "password"}
                      placeholder="Platform Password"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowInlinePassword(!showInlinePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#00d4ff]"
                    >
                      {showInlinePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {(addPlatform === "identityiq" || addPlatform === "myscoreiq") && (
                    <Input
                      className="w-full lg:w-28 h-9 rounded-lg bg-white shadow-sm text-xs"
                      placeholder="SSN Last 4"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]{4}"
                      maxLength={4}
                      value={addSsnLast4}
                      onChange={(e) => setAddSsnLast4(e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  )}
                  <div className="flex items-center space-x-2 w-full lg:w-auto px-2">
                    <Checkbox id="reports-inline-authorization" checked={addAuthorization} onCheckedChange={(checked) => setAddAuthorization(checked === true)} />
                    <Label htmlFor="reports-inline-authorization" className="text-[10px] font-bold text-slate-500 cursor-pointer">
                      Authorized for analysis
                    </Label>
                  </div>
                  <Button type="submit" disabled={isAddingClient} size="sm" className="w-full lg:w-auto h-9 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-md text-xs font-bold uppercase tracking-wider ml-auto">
                    {isAddingClient ? <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> Pulling...</> : <><Plus className="mr-2 h-3.5 w-3.5" /> Pull Report</>}
                  </Button>
                </form>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-100">
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 pl-6">Client</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Platform</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Dates</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Bureau Scores</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><div className="animate-pulse flex flex-col items-center"><div className="h-8 w-8 rounded-full border-4 border-[#00d4ff] border-t-transparent animate-spin mb-4"></div><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Vault...</span></div></TableCell></TableRow>
                  ) : filteredReports.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm font-bold text-slate-400">No reports found matching criteria.</TableCell></TableRow>
                  ) : (
                    filteredReports.map((report) => {
                      const displayedScores = {
                        experian: formatCreditScore(report.experian_score),
                        equifax: formatCreditScore(report.equifax_score),
                        transunion: formatCreditScore(report.transunion_score),
                      };

                      const reportPullDateStr = report?.date;
                      const reportPullDateFormatted = reportPullDateStr ? new Date(reportPullDateStr).toLocaleDateString() : 'N/A';
                      
                      const jsonReportDateStr =
                        (report?.jsonData?.CreditReport && Array.isArray(report.jsonData.CreditReport) && report.jsonData.CreditReport[0]?.DateReport) ||
                        (report?.jsonData?.reportData?.CreditReport && Array.isArray(report.jsonData.reportData.CreditReport) && report.jsonData.reportData.CreditReport[0]?.DateReport) ||
                        (Array.isArray(report?.jsonData?.CreditReport) ? report.jsonData.CreditReport[0]?.Date : undefined) ||
                        (Array.isArray(report?.jsonData?.reportData?.CreditReport) ? report.jsonData.reportData.CreditReport[0]?.Date : undefined) ||
                        undefined;
                      const jsonReportDateFormatted = jsonReportDateStr ? new Date(jsonReportDateStr).toLocaleDateString() : (report?.date ? new Date(report.date).toLocaleDateString() : 'N/A');

                      return (
                        <TableRow key={report.id} className="hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 group cursor-pointer" onClick={() => navigate(`/credit-report?clientId=${report.clientId}&clientName=${encodeURIComponent(report.clientName)}`)}>
                          <TableCell className="py-4 pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                <AvatarFallback className="bg-gradient-to-br from-[#00d4ff] to-[#7000ff] text-white font-black">
                                  {report.clientName.split(" ").map((n: string) => n[0]).join("").substring(0,2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-bold text-slate-800">{report.clientName}</div>
                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">ID: {report.clientId}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-slate-200 text-slate-600 bg-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">
                              {report.platform}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs font-bold text-slate-700">Pull: {reportPullDateFormatted}</div>
                            <div className="text-[10px] font-semibold text-slate-400 mt-0.5">Report: {jsonReportDateFormatted}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-emerald-50 text-emerald-700 border-[#00ffcc]/30 text-[10px] font-bold shadow-sm px-2">EX: {displayedScores.experian}</Badge>
                              <Badge className="bg-blue-50 text-blue-700 border-[#00d4ff]/30 text-[10px] font-bold shadow-sm px-2">TU: {displayedScores.transunion}</Badge>
                              <Badge className="bg-purple-50 text-purple-700 border-[#7000ff]/30 text-[10px] font-bold shadow-sm px-2">EQ: {displayedScores.equifax}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleFetchNewReport(String(report.clientId)); }}
                                disabled={fetchingClientId === String(report.clientId)}
                                className="h-8 text-[10px] font-bold uppercase tracking-wider bg-slate-100 hover:text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-100 border-0"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${fetchingClientId === String(report.clientId) ? 'animate-spin text-[#00d4ff]' : ''}`} />
                                {fetchingClientId === String(report.clientId) ? 'Fetching' : 'Pull New Report'}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[#7000ff] hover:bg-[#7000ff] rounded-lg">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </motion.div>
      </div>
  );
}
