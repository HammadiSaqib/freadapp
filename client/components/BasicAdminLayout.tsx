import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { authApi, clientsApi } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { getRememberedBasicAdminClientId, rememberBasicAdminClientId } from "@/lib/basicAdminReportPull";
import { 
  LayoutDashboard, Users, FileText, Settings, HelpCircle, 
  CreditCard, GraduationCap, LogOut, ChevronDown, ChevronRight,
  User, Activity, Mail, Database, Search, 
  PieChart, BarChart, TrendingUp, FileCheck, Map, DollarSign, 
  Calculator, Briefcase, Gavel, List, ShieldAlert, Eye
} from "lucide-react";

interface BasicAdminLayoutProps {
  children: React.ReactNode;
  onAddClient?: () => void;
  title?: string;
}

export default function BasicAdminLayout({ children, onAddClient, title }: BasicAdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useAuthContext();

  const [clientId, setClientId] = useState<string | null>(getRememberedBasicAdminClientId());
  const [clientsExpanded, setClientsExpanded] = useState(true);
  const [workAreaExpanded, setWorkAreaExpanded] = useState(false);

  useEffect(() => {
    if (!clientId) {
      clientsApi.getClients({ limit: 1 }).then((res) => {
        const firstClient = res.data?.data?.[0] || res.data?.[0];
        if (firstClient?.id) {
          setClientId(String(firstClient.id));
          rememberBasicAdminClientId(String(firstClient.id));
        }
      }).catch(console.error);
    }
  }, [clientId]);

  const clientProfileTabs = [
    { name: "Profile & Documents", tab: "info", icon: User },
    { name: "Credit Reports", tab: "history", icon: FileText },
    { name: "Score History", tab: "scores", icon: Activity },
    { name: "Generated Letters", tab: "letters", icon: Mail },
    { name: "Equifax Settlement", tab: "equifax", icon: ShieldAlert },
    { name: "Raw Data", tab: "json", icon: Database },
  ];

  const workAreaTabs = [
    { name: "Overview", tab: "overview", icon: PieChart },
    { name: "Analysis & Insights", tab: "analysis", icon: BarChart },
    { name: "Progress Report", tab: "progress", icon: TrendingUp },
    { name: "Underwriting", tab: "underwriting", icon: FileCheck },
    { name: "Credit War Map", tab: "creditWarMap", icon: Map },
    { name: "Debt Consolidation", tab: "debtConsolidation", icon: DollarSign },
    { name: "Funding Audit", tab: "funding", icon: Calculator },
    { name: "Funding Apply", tab: "fundingApplications", icon: Briefcase },
    { name: "Personal Identity", tab: "personal", icon: User },
    { name: "Inquiries", tab: "inquiries", icon: Search },
    { name: "Public Records", tab: "public", icon: Gavel },
    { name: "Accounts", tab: "accounts", icon: List },
  ];

  const topNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const bottomNavigation = [
    { name: "Academy", href: "/school", icon: GraduationCap },
    { name: "Subscription", href: "/subscription", icon: CreditCard },
    { name: "Support", href: "/support", icon: HelpCircle },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Invoices", href: "/invoices", icon: FileText },
  ];

  const handleLogout = async () => {
    try {
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      await authApi.logout();
      navigate("/login");
    } catch (error) {
      clearPortalReturnContext();
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans text-gray-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-300 flex flex-col shrink-0">
        <div className="h-14 border-b border-gray-300 flex items-center px-4">
          <span className="font-bold text-lg uppercase tracking-wider">Score Machine</span>
        </div>
        
        <div className="p-4 border-b border-gray-300 bg-gray-50">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Current User</div>
          <div className="font-semibold">{userProfile?.first_name} {userProfile?.last_name}</div>
          <div className="text-xs text-gray-600 uppercase">Basic Access</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {/* Top Links */}
            {topNavigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold uppercase transition-colors ${
                      isActive 
                        ? 'bg-black text-white' 
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}

            {/* Clients Section (Non-clickable Header) */}
            <li className="pt-2">
              <div 
                className="flex items-center justify-between px-3 py-2 text-sm font-bold uppercase text-gray-500 cursor-pointer hover:bg-gray-100"
                onClick={() => setClientsExpanded(!clientsExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4" />
                  Client Profile
                </div>
                {clientsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
              
              {clientsExpanded && (
                <ul className="pl-6 space-y-1 mt-1">
                  {clientProfileTabs.map((tab) => {
                    const href = clientId ? `/clients/${clientId}?tab=${tab.tab}` : "#";
                    const isTabActive = location.pathname.includes(`/clients/${clientId}`) && location.search.includes(`tab=${tab.tab}`);
                    const Icon = tab.icon;
                    return (
                      <li key={tab.name}>
                        <Link
                          to={href}
                          className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase transition-colors ${
                            isTabActive 
                              ? 'bg-gray-200 text-black border-l-2 border-black' 
                              : 'text-gray-600 hover:bg-gray-100 hover:text-black border-l-2 border-transparent'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {tab.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {/* Work Area Section (Clickable Dropdown) */}
            <li className="pt-2 pb-2">
              <div 
                className="flex items-center justify-between px-3 py-2 text-sm font-bold uppercase text-gray-500 cursor-pointer hover:bg-gray-100"
                onClick={() => setWorkAreaExpanded(!workAreaExpanded)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  Work Area
                </div>
                {workAreaExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>

              {workAreaExpanded && (
                <ul className="pl-6 space-y-1 mt-1">
                  {workAreaTabs.map((tab) => {
                    const href = clientId ? `/credit-report?clientId=${clientId}&tab=${tab.tab}` : "#";
                    const isTabActive = location.pathname.includes('/credit-report') && location.search.includes(`tab=${tab.tab}`);
                    const Icon = tab.icon;
                    return (
                      <li key={tab.name}>
                        <Link
                          to={href}
                          className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase transition-colors ${
                            isTabActive 
                              ? 'bg-gray-200 text-black border-l-2 border-black' 
                              : 'text-gray-600 hover:bg-gray-100 hover:text-black border-l-2 border-transparent'
                          }`}
                        >
                          <Icon className="h-3 w-3" />
                          {tab.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>

            {/* Bottom Links */}
            {bottomNavigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold uppercase transition-colors ${
                      isActive 
                        ? 'bg-black text-white' 
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-300">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-semibold uppercase text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navbar */}
        <header className="h-14 bg-white border-b border-gray-300 flex items-center justify-between px-6 shrink-0">
          <div className="font-bold text-sm uppercase text-gray-700">
            {title || "Admin Portal"}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase">Standard View</span>
            {onAddClient && (
              <button 
                onClick={onAddClient}
                className="border border-black bg-black text-white px-4 py-1.5 text-xs font-bold uppercase hover:bg-gray-800 transition-colors"
              >
                + Add Record
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>

      </div>
    </div>
  );
}
