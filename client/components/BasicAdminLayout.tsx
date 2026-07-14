import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { authApi, clientsApi } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import {
  BASIC_ADMIN_CLIENT_CHANGED_EVENT,
  getRememberedBasicAdminClientId,
  getRememberedBasicAdminLastPulledClientId,
  hasReadyReportPullCredentials,
  hasStoredClientReport,
  rememberBasicAdminClientId,
  rememberBasicAdminLastPulledClientId,
  saveAndPullClientReport,
} from "@/lib/basicAdminReportPull";
import { useToast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, Users, FileText, Settings, HelpCircle, 
  CreditCard, GraduationCap, LogOut, ChevronDown, ChevronRight,
  User, Activity, Mail, Database, Search, 
  PieChart, BarChart, TrendingUp, FileCheck, Map, DollarSign,
  Gavel, List, ShieldAlert, Eye, Loader2, RefreshCw
} from "lucide-react";

interface BasicAdminLayoutProps {
  children: React.ReactNode;
  onAddClient?: () => void;
  title?: string;
}

type BasicAdminPrimaryClient = {
  id: string;
  name: string;
  latestJsonData?: unknown;
  platform?: string | null;
  platform_email?: string | null;
  platform_password?: string | null;
  ssn_last_four?: string | null;
};

export default function BasicAdminLayout({ children, onAddClient, title }: BasicAdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useAuthContext();
  const { toast } = useToast();

  const [clientId, setClientId] = useState<string | null>(getRememberedBasicAdminClientId());
  const [primaryClient, setPrimaryClient] = useState<BasicAdminPrimaryClient | null>(null);
  const [lastPulledClient, setLastPulledClient] = useState<BasicAdminPrimaryClient | null>(null);
  const [primaryClientRefreshNonce, setPrimaryClientRefreshNonce] = useState(0);
  const [repullLoading, setRepullLoading] = useState(false);
  const [clientsExpanded, setClientsExpanded] = useState(true);
  const [workAreaExpanded, setWorkAreaExpanded] = useState(false);

  const currentSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const routeClientId = useMemo(() => {
    const queryClientId = String(currentSearchParams.get("clientId") || "").trim();
    if (queryClientId) {
      return queryClientId;
    }

    const match = location.pathname.match(/^\/clients\/([^/?#]+)/i);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [currentSearchParams, location.pathname]);

  useEffect(() => {
    if (routeClientId) {
      setClientId(routeClientId);
      rememberBasicAdminClientId(routeClientId);
    }
  }, [routeClientId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBasicAdminClientChanged = () => {
      setPrimaryClientRefreshNonce((current) => current + 1);
    };

    window.addEventListener(BASIC_ADMIN_CLIENT_CHANGED_EVENT, handleBasicAdminClientChanged);
    return () => {
      window.removeEventListener(BASIC_ADMIN_CLIENT_CHANGED_EVENT, handleBasicAdminClientChanged);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const mapClientSummary = (client: any): BasicAdminPrimaryClient => ({
      id: String(client.id),
      name: [client.first_name, client.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || String(client.name || "Client"),
      latestJsonData: client.latestJsonData,
      platform: client.platform,
      platform_email: client.platform_email,
      platform_password: client.platform_password,
      ssn_last_four: client.ssn_last_four,
    });

    const fetchPrimaryClient = async () => {
      try {
        const response = await clientsApi.getClients({ limit: 1 });
        const payload = response.data;
        const clients = Array.isArray(payload?.clients)
          ? payload.clients
          : Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : [];

        const preferredClientId = routeClientId || getRememberedBasicAdminClientId();
  const lastPulledClientId = getRememberedBasicAdminLastPulledClientId();
        let resolvedClient = clients[0];

        if (preferredClientId) {
          try {
            const preferredClientResponse = await clientsApi.getClient(preferredClientId);
            if (preferredClientResponse?.data?.id !== undefined && preferredClientResponse?.data?.id !== null) {
              resolvedClient = preferredClientResponse.data;
            }
          } catch (preferredClientError) {
            console.warn("Error fetching preferred basic admin client:", preferredClientError);
          }
        }

        if (cancelled) {
          return;
        }

        const resolvedPrimaryClient = resolvedClient?.id !== undefined && resolvedClient?.id !== null
          ? mapClientSummary(resolvedClient)
          : null;

        let resolvedLastPulledClient: BasicAdminPrimaryClient | null = null;

        if (lastPulledClientId) {
          if (resolvedPrimaryClient?.id === String(lastPulledClientId)) {
            resolvedLastPulledClient = resolvedPrimaryClient;
          } else {
            try {
              const lastPulledClientResponse = await clientsApi.getClient(lastPulledClientId);
              if (lastPulledClientResponse?.data?.id !== undefined && lastPulledClientResponse?.data?.id !== null) {
                resolvedLastPulledClient = mapClientSummary(lastPulledClientResponse.data);
              }
            } catch (lastPulledClientError) {
              console.warn("Error fetching last pulled basic admin client:", lastPulledClientError);
            }
          }
        }

        if (!resolvedLastPulledClient && resolvedPrimaryClient && hasStoredClientReport(resolvedPrimaryClient)) {
          resolvedLastPulledClient = resolvedPrimaryClient;
        }

        if (cancelled) {
          return;
        }

        if (resolvedClient?.id !== undefined && resolvedClient?.id !== null) {
          const resolvedClientId = String(resolvedClient.id);

          setClientId(resolvedClientId);
          rememberBasicAdminClientId(resolvedClientId);
          setPrimaryClient(resolvedPrimaryClient);
          setLastPulledClient(resolvedLastPulledClient);

          if (!lastPulledClientId && resolvedLastPulledClient?.id) {
            rememberBasicAdminLastPulledClientId(resolvedLastPulledClient.id);
          }

          return;
        }

        setPrimaryClient(null);
        setLastPulledClient(resolvedLastPulledClient);
      } catch (error) {
        console.error("Error fetching basic admin client:", error);
        if (!cancelled) {
          setPrimaryClient(null);
          setLastPulledClient(null);
        }
      }
    };

    if (userProfile?.role === "admin") {
      fetchPrimaryClient();
    } else {
      setPrimaryClient(null);
      setLastPulledClient(null);
    }

    return () => {
      cancelled = true;
    };
  }, [primaryClientRefreshNonce, routeClientId, userProfile]);

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
    { name: "Personal Identity", tab: "personal", icon: User },
    { name: "Inquiries", tab: "inquiries", icon: Search },
    { name: "Public Records", tab: "public", icon: Gavel },
    { name: "Accounts", tab: "accounts", icon: List },
  ];

  const repullTargetClient = lastPulledClient;
  const shouldShowRepullAction = Boolean(repullTargetClient?.id);

  const handleRepullReport = async () => {
    if (!repullTargetClient?.id) {
      return;
    }

    const profileHref = `/clients/${repullTargetClient.id}?tab=info`;
    rememberBasicAdminClientId(repullTargetClient.id);

    if (!hasReadyReportPullCredentials(repullTargetClient)) {
      navigate(`${profileHref}&reportPullPrompt=true`);
      return;
    }

    try {
      setRepullLoading(true);

      await saveAndPullClientReport({
        clientId: repullTargetClient.id,
        platform: String(repullTargetClient.platform || ""),
        platformEmail: String(repullTargetClient.platform_email || ""),
        platformPassword: String(repullTargetClient.platform_password || ""),
        ssnLast4: repullTargetClient.ssn_last_four,
      });

      toast({
        title: "Report Scraping Started",
        description: `Re-pulling the last report for ${repullTargetClient.name}.`,
      });

      window.setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error re-pulling basic admin report:", error);
      toast({
        title: "Scraping Failed",
        description:
          (error as any)?.response?.data?.message
          || (error instanceof Error ? error.message : "Failed to start credit report scraping. Please try again."),
        variant: "destructive",
      });
    } finally {
      setRepullLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (shouldShowRepullAction) {
      void handleRepullReport();
      return;
    }

    onAddClient?.();
  };

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
        <div className="h-16 border-b border-gray-300 flex items-center px-4">
          <Link to="/dashboard" className="flex w-full items-center">
            <img src="/capsol-logo.png" alt="CapSol" className="h-10 w-full max-w-[180px] object-contain" />
          </Link>
        </div>
        
        <div className="p-4 border-b border-gray-300 bg-gray-50">
          <div className="text-xs font-bold text-gray-500 uppercase mb-1">Current User</div>
          <div className="font-semibold">{userProfile?.first_name} {userProfile?.last_name}</div>
          <div className="text-xs text-gray-600 uppercase">Basic Access</div>
          {shouldShowRepullAction && repullTargetClient && (
            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Last Pulled Client
              </div>
              <div className="text-sm font-medium text-gray-800">{repullTargetClient.name}</div>
              <button
                type="button"
                onClick={handleRepullReport}
                disabled={repullLoading}
                className="flex w-full items-center justify-center gap-2 border border-black bg-black px-3 py-2 text-xs font-bold uppercase text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {repullLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {repullLoading ? "Repulling..." : "Repull Report"}
              </button>
            </div>
          )}
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
            {(onAddClient || shouldShowRepullAction) && (
              <button 
                onClick={handlePrimaryAction}
                disabled={repullLoading || (!shouldShowRepullAction && !onAddClient)}
                className="border border-black bg-black text-white px-4 py-1.5 text-xs font-bold uppercase hover:bg-gray-800 transition-colors"
              >
                {repullLoading ? "Repulling..." : shouldShowRepullAction ? "Repull Report" : "+ Add Record"}
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
