import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Plus,
  Trash2,
  Mail,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  Pencil,
  ToggleLeft,
  ToggleRight,
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type EmployeeUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'user' | 'funding_manager' | 'admin' | string;
  status: 'active' | 'inactive' | string;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Employee = {
  id: number;
  status: 'active' | 'inactive' | string;
  createdAt: string;
  updatedAt: string;
  user: EmployeeUser;
};

interface EliteEmployeesProps {
  employees: Employee[];
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onEdit: (employee: Employee) => void;
  onToggle: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
  setCreateOpen: (v: boolean) => void;
  setShowAddClient: (v: boolean) => void;
  loading: boolean;
  deactivatePending: boolean;
}

export default function EliteEmployees(props: EliteEmployeesProps) {
  const {
    employees,
    searchTerm,
    setSearchTerm,
    onEdit,
    onToggle,
    onDeactivate,
    setCreateOpen,
    loading,
    deactivatePending
  } = props;

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesStatus =
        statusFilter === "all"
          ? true
          : String(employee.user.status).toLowerCase() === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const term = searchTerm.toLowerCase();
      return employee.user.firstName.toLowerCase().includes(term) ||
        employee.user.lastName.toLowerCase().includes(term) ||
        employee.user.email.toLowerCase().includes(term);
    });
  }, [employees, searchTerm, statusFilter]);

  const activeCount = employees.filter(e => e.user.status === 'active').length;
  const inactiveCount = employees.filter(e => e.user.status === 'inactive').length;
  const statusCards = [
    {
      key: "all" as const,
      label: "Total Team",
      count: employees.length,
      color: "from-[#7000ff] to-[#00d4ff]",
      icon: Users,
    },
    {
      key: "active" as const,
      label: "Active",
      count: activeCount,
      color: "from-[#00ffcc] to-emerald-500",
      icon: CheckCircle,
    },
    {
      key: "inactive" as const,
      label: "Inactive",
      count: inactiveCount,
      color: "from-[#ff0055] to-rose-500",
      icon: AlertCircle,
    },
  ];
  const activeFilterLabel = statusFilter === "all"
    ? "All Team Members"
    : statusFilter === "active"
      ? "Active Members"
      : "Inactive Members";
  const emptyStateMessage = statusFilter === "all"
    ? "No team members found."
    : `No ${statusFilter} team members found.`;

  return (
    <div className="elite-page-shell">
        {/* Background Electric Glows */}
        <div className="elite-page-glow-primary"></div>
        <div className="elite-page-glow-secondary" style={{ animationDelay: "2s" }}></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[1600px] mx-auto space-y-6 relative z-10 elite-nested-wrapper">
          
          {/* STAT CARDS */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statusCards.map((card) => {
              const isActive = statusFilter === card.key;

              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => setStatusFilter(card.key)}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-5 text-left transition-all duration-300 ${isActive ? 'border-[#00d4ff]/50 shadow-[0_8px_30px_rgba(0,212,255,0.15)]' : 'border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md'}`}
                >
                  {isActive && <div className={`absolute top-0 left-0 h-full w-1 bg-gradient-to-b ${card.color}`}></div>}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest transition-colors ${isActive ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}`}>{card.label}</span>
                    <div className={`rounded-xl p-2 shadow-inner ${isActive ? 'bg-blue-50' : 'bg-slate-50 group-hover:bg-slate-100'}`}>
                      <card.icon className={`h-4 w-4 ${isActive ? 'text-[#00d4ff]' : card.key === 'active' ? 'text-[#00ffcc]' : card.key === 'inactive' ? 'text-[#ff0055]' : 'text-[#7000ff]'}`} />
                    </div>
                  </div>
                  <div className="text-4xl font-black text-slate-800">{card.count}</div>
                </button>
              );
            })}
          </motion.div>

          {/* MAIN AREA */}
          <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 pb-4 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-xl font-black text bg-clip-text bg-gradient-to-r from-slate-900 via-[#7000ff] to-[#00d4ff] tracking-tight">Team Management</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your team members, roles, and access permissions</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Filter: {activeFilterLabel}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search team..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10 h-10 border-slate-100 rounded-xl bg-slate-50 text-slate-800 shadow-inner focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 transition-all placeholder:text-slate-400 text-xs font-semibold"
                  />
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)} className="h-10 w-full sm:w-auto px-4 bg-gradient-to-r from-[#00d4ff] to-[#00ffcc] hover:opacity-90 text-slate-900 rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.4)] border-0 text-xs font-black uppercase tracking-wider">
                  <UserPlus className="h-4 w-4 mr-2" /> Add Member
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b border-slate-100">
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 pl-6">Member</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Role</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Status</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Joined</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12"><div className="animate-pulse flex flex-col items-center"><div className="h-8 w-8 rounded-full border-4 border-[#00d4ff] border-t-transparent animate-spin mb-4"></div><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Team...</span></div></TableCell></TableRow>
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-sm font-bold text-slate-400">{emptyStateMessage}</TableCell></TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 group">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                              <AvatarFallback className="bg-gradient-to-br from-[#00d4ff] to-[#7000ff] text-white font-black">
                                {employee.user.firstName.charAt(0)}{employee.user.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-bold text-slate-800">{employee.user.firstName} {employee.user.lastName}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center text-[10px] text-slate-500 font-semibold"><Mail className="h-3 w-3 mr-1 text-slate-400" /> {employee.user.email}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">
                            <Shield className="h-3 w-3 mr-1" /> {employee.user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.user.status === 'active' ? (
                            <Badge className="bg-gradient-to-r from-[#00ffcc] to-emerald-500 text-slate-900 border-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">Active</Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-600 border-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 shadow-sm">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-slate-700">{new Date(employee.createdAt).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                                <DropdownMenuItem onClick={() => onEdit(employee)} className="text-xs font-semibold cursor-pointer">
                                  <Pencil className="mr-2 h-4 w-4 text-blue-500" /> Edit Member
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onToggle(employee)} className="text-xs font-semibold cursor-pointer">
                                  {employee.user.status === 'active' ? <ToggleLeft className="mr-2 h-4 w-4 text-rose-500" /> : <ToggleRight className="mr-2 h-4 w-4 text-emerald-500" />}
                                  {employee.user.status === 'active' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDeactivate(employee)} disabled={deactivatePending} className="text-xs font-semibold text-red-600 focus:text-red-700 cursor-pointer">
                                  <Trash2 className="mr-2 h-4 w-4" /> {deactivatePending ? 'Removing...' : 'Remove'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </motion.div>
        </motion.div>
      </div>
  );
}
