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
  const [creditReportExpanded, setCreditReportExpanded] = useState(false);

  const currentSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const activeCreditReportTab = currentSearchParams.get("tab");
  const isLawEngineAutoActive = currentSearchParams.get("lawEngineAuto") === "true";
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
        .trim() || String(client.name || "My Profile"),
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
    { name: "My Profile & Documents", tab: "info", icon: User },
    { name: "My Reports", tab: "history", icon: FileText },
    { name: "My Score History", tab: "scores", icon: Activity },
    { name: "Generated Letters", tab: "letters", icon: Mail },
    { name: "Equifax Settlement", tab: "equifax", icon: ShieldAlert },
    { name: "My Raw Data", tab: "json", icon: Database },
  ];

  const buildCreditReportHref = (tab: string, options?: { lawEngineAuto?: boolean }) => {
    if (!clientId) {
      return "#";
    }

    const params = new URLSearchParams();
    params.set("clientId", clientId);
    params.set("tab", tab);

    if (options?.lawEngineAuto) {
      params.set("lawEngineAuto", "true");
    }

    return `/credit-report?${params.toString()}`;
  };

  const workAreaSections = [
    {
      name: "Work Area",
      items: [
        { name: "Basic Analysis Insights", tab: "analysis", icon: BarChart },
        { name: "Progress Report", tab: "progress", icon: TrendingUp },
        { name: "Underwriting Assessment", tab: "underwriting", icon: FileCheck },
      ],
    },
    {
      name: "Credit Repair",
      items: [
        { name: "Credit War Map Strategy", tab: "creditWarMap", icon: Map },
        { name: "Credit Repair", tab: "creditRepair", icon: ShieldAlert },
      ],
    },
  ];

  const creditReportSections = [
    {
      name: "My Report",
      items: [
        { name: "Overview Dashboard", tab: "overview", icon: PieChart },
        { name: "Personal Identity", tab: "personal", icon: User },
        { name: "Inquiries Credit Pulls", tab: "inquiries", icon: Search },
        { name: "Public Records Legal", tab: "public", icon: Gavel },
        { name: "Accounts Credit Lines", tab: "accounts", icon: List },
      ],
    },
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
    <div className="basic-admin-theme min-h-screen flex font-sans">
      
      {/* Sidebar */}
      <aside className="basic-admin-sidebar sticky top-0 h-screen w-64 flex flex-col shrink-0">
        <div className="h-20 border-b border-green-100/80 px-5 dark:border-slate-800">
          <div className="flex h-full items-center justify-between">
            <div className="flex items-center">
              <img src="/capsol-logo.png" alt="CapSol" className="h-10 w-auto object-contain" />
            </div>
          </div>
        </div>
        
        <div className="border-b border-sky-100/80 p-4 dark:border-slate-800">
          <div className="basic-admin-user-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Current User</div>
            <div className="mt-2 font-semibold text-slate-900 dark:text-white">{userProfile?.first_name} {userProfile?.last_name}</div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Basic Access</div>
          {shouldShowRepullAction && repullTargetClient && (
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Last Pulled Report
              </div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{repullTargetClient.name}</div>
              <button
                type="button"
                onClick={handleRepullReport}
                disabled={repullLoading}
                className="basic-admin-primary-action flex w-full items-center justify-center gap-2"
              >
                {repullLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {repullLoading ? "Repulling..." : "Repull Report"}
              </button>
            </div>
          )}
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {/* Top Links */}
            {topNavigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold uppercase ${
                      isActive 
                        ? 'basic-admin-nav-item-active' 
                        : 'basic-admin-nav-item'
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
                className="basic-admin-section-toggle flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-bold uppercase"
                onClick={() => setClientsExpanded(!clientsExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4" />
                  My Profile
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
                          className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase ${
                            isTabActive 
                              ? 'basic-admin-subnav-item-active' 
                              : 'basic-admin-subnav-item'
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
                className="basic-admin-section-toggle flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-bold uppercase"
                onClick={() => setWorkAreaExpanded(!workAreaExpanded)}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  Work Area
                </div>
                {workAreaExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>

              {workAreaExpanded && (
                <div className="pl-6 mt-1 space-y-3">
                  {workAreaSections.map((section) => (
                    <div key={section.name} className="space-y-1">
                      <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {section.name}
                      </div>
                      <ul className="space-y-1">
                        {section.items.map((tab) => {
                          const href = buildCreditReportHref(tab.tab, { lawEngineAuto: tab.lawEngineAuto });
                          const isOverviewLawEngineActive = activeCreditReportTab === "overview" && isLawEngineAutoActive;
                          const isTabActive = location.pathname.includes('/credit-report') && (
                            tab.lawEngineAuto
                              ? isOverviewLawEngineActive
                              : activeCreditReportTab === tab.tab && !(tab.tab === "overview" && isOverviewLawEngineActive)
                          );
                          const Icon = tab.icon;

                          return (
                            <li key={tab.name}>
                              <Link
                                to={href}
                                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase ${
                                  isTabActive
                                    ? 'basic-admin-subnav-item-active'
                                    : 'basic-admin-subnav-item'
                                }`}
                              >
                                <Icon className="h-3 w-3" />
                                {tab.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </li>

            {/* Credit Report Section (Clickable Dropdown) */}
            <li className="pt-2 pb-2">
              <div
                className="basic-admin-section-toggle flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-bold uppercase"
                onClick={() => setCreditReportExpanded(!creditReportExpanded)}
              >
                <div className="flex items-center gap-3">
                  <PieChart className="h-4 w-4" />
                  Credit Report
                </div>
                {creditReportExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>

              {creditReportExpanded && (
                <div className="pl-6 mt-1 space-y-3">
                  {creditReportSections.map((section) => (
                    <div key={section.name} className="space-y-1">
                      <div className="px-3 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {section.name}
                      </div>
                      <ul className="space-y-1">
                        {section.items.map((tab) => {
                          const href = buildCreditReportHref(tab.tab, { lawEngineAuto: (tab as any).lawEngineAuto });
                          const isOverviewLawEngineActive = activeCreditReportTab === "overview" && isLawEngineAutoActive;
                          const isTabActive = location.pathname.includes('/credit-report') && (
                            (tab as any).lawEngineAuto
                              ? isOverviewLawEngineActive
                              : activeCreditReportTab === tab.tab && !(tab.tab === "overview" && isOverviewLawEngineActive)
                          );
                          const Icon = tab.icon;

                          return (
                            <li key={tab.name}>
                              <Link
                                to={href}
                                className={`flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase ${
                                  isTabActive
                                    ? 'basic-admin-subnav-item-active'
                                    : 'basic-admin-subnav-item'
                                }`}
                              >
                                <Icon className="h-3 w-3" />
                                {tab.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
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
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold uppercase ${
                      isActive 
                        ? 'basic-admin-nav-item-active' 
                        : 'basic-admin-nav-item'
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

        <div className="border-t border-sky-100/80 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold uppercase text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navbar */}
        <header className="basic-admin-topbar flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">Basic Workspace</div>
            <div className="mt-1 font-bold text-sm uppercase text-slate-700 dark:text-slate-200">
              {title || "Admin Portal"}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="basic-admin-topbar-badge">Essential View</span>
            {(onAddClient || shouldShowRepullAction) && (
              <button 
                onClick={handlePrimaryAction}
                disabled={repullLoading || (!shouldShowRepullAction && !onAddClient)}
                className="basic-admin-primary-action"
              >
                {repullLoading ? "Repulling..." : shouldShowRepullAction ? "Repull Report" : "+ Add Record"}
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="basic-admin-page flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="basic-admin-content-frame">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
