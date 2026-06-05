import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi, clientsApi, contractsApi, creditReportScraperApi } from "@/lib/api";
import {
  clearPortalReturnContext,
  getPortalReturnContext,
  stageCrossSubdomainAuthTransfer,
} from "@/lib/authStorage";
import { buildAliasUrl } from "@/lib/hostRouting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { usePagePermissions } from "@/hooks/usePagePermissions";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import {
  ArrowLeft,
  CreditCard,
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Target,
  Shield,
  Zap,
  Share2,
  GraduationCap,
  DollarSign,
  Crown,
  Menu,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface SidebarProps {
  className?: string;
  onAddClient?: () => void;
}

export default function Sidebar({ className, onAddClient }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  // Mobile drawer state
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [clientCount, setClientCount] = useState<number>(0);
  const [reportCount, setReportCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const subscriptionStatus = useSubscriptionStatus();
  const { userProfile } = useAuthContext();
  const { hasPermission, isLoading: pagePermissionsLoading } = usePagePermissions();
  const portalReturnContext = getPortalReturnContext();
  const { isEliteActive } = useScoreMachineEliteStatus();

  const openAffiliatePortal = (pathname: string = "/dashboard") => {
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const targetUrl = buildAliasUrl("affiliate", "/session-transfer");

    const encoded = stageCrossSubdomainAuthTransfer(targetUrl, {
      returnContext: {
        label: "Back To Admin Dashboard",
        targetUrl: buildAliasUrl("admin", "/dashboard"),
      },
      transferRedirectPath: normalizedPath,
    });

    const finalUrl = encoded
      ? `${targetUrl}#${"__sm_auth_transfer__:"}${encoded}`
      : targetUrl;

    window.location.href = finalUrl;
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      badge: null,
      pageKey: "dashboard",
    },
    {
      name: isEliteActive ? "CRM" : "Clients",
      href: "/clients",
      icon: Users,
      badge: clientCount > 0 ? clientCount.toString() : null,
      pageKey: "clients",
    },
    {
      name: "Employees",
      href: "/employees",
      icon: Users,
      badge: null,
      pageKey: "employees",
    },
    {
      name: "Work Area",
      href: "/reports",
      icon: FileText,
      badge: reportCount > 0 ? reportCount.toString() : null,
      pageKey: "reports",
    },
    {
      name: "Feature Requests",
      href: "/admin/feature-requests",
      icon: MessageSquare,
      badge: null,
      adminOnly: true,
      pageKey: "feature-requests",
    },
    {
      name: "AI Coach",
      href: "/ai-coach",
      icon: Sparkles,
      badge: "New",
      pageKey: "ai-coach",
    },
    {
      name: "Knowledge Base",
      href: "/school",
      icon: GraduationCap,
      badge: null,
      pageKey: "school",
    },
    {
      name: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      badge: null,
      pageKey: "analytics",
    },
    
    {
      name: "Affiliate Management",
      href: "/affiliate-management",
      icon: Users,
      badge: null,
      superAdminOnly: true,
      pageKey: "affiliate-management",
    },
    {
      name: "Compliance",
      href: "/compliance",
      icon: Shield,
      badge: null,
      pageKey: "compliance",
    },
    {
      name: "Automation",
      href: "/automation",
      icon: Zap,
      badge: "5",
      pageKey: "automation",
    },
    {
      name: "Subscription",
      href: "/subscription",
      icon: CreditCard,
      badge: subscriptionStatus.status === 'pending' ? 'Payment Required' : null,
      pageKey: "subscription",
    },
    {
      name: "Support",
      href: "/support",
      icon: HelpCircle,
      badge: null,
      pageKey: "support",
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      badge: null,
      pageKey: "settings",
    },
  ];

  const isActive = (href: string) => location.pathname === href;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Detect small screens and keep it in sync with resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1024px)'); // lg breakpoint
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
      setIsSmallScreen(matches);
      // Auto-close drawer when switching to large screens
      if (!matches) setIsMobileOpen(false);
    };
    // Initialize
    setIsSmallScreen(mql.matches);
    const handler = (e: MediaQueryListEvent) => onChange(e);
    mql.addEventListener?.('change', handler);
    // Fallback for older browsers (rare in our env)
    // @ts-ignore
    mql.addListener?.(handler);
    return () => {
      mql.removeEventListener?.('change', handler);
      // @ts-ignore
      mql.removeListener?.(handler);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    if (isSmallScreen) setIsMobileOpen(false);
  }, [location.pathname, isSmallScreen]);

  // Fetch client count
  useEffect(() => {
    const fetchClientCount = async () => {
      try {
        const response = await clientsApi.getClients({ limit: 1 });
        if (response.data && response.data.pagination) {
          setClientCount(response.data.pagination.total);
        }
      } catch (error) {
        console.error("Error fetching client count:", error);
      }
    };

    if (userProfile) {
      fetchClientCount();
    }
  }, [userProfile]);

  // Fetch report count for Work Area badge
  useEffect(() => {
    const fetchReportCount = async () => {
      try {
        const response = await creditReportScraperApi.getReportHistory();
        const payload = response?.data;
        let count = 0;
        if (Array.isArray(payload)) {
          count = payload.length;
        } else if (payload && Array.isArray(payload.data)) {
          count = payload.data.length;
        }
        setReportCount(count);
      } catch (error) {
        console.error("Error fetching report count:", error);
      }
    };

    if (userProfile) {
      fetchReportCount();
    }
  }, [userProfile]);

  // Filter navigation based on user role and permissions
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
  const isSuperAdmin = userProfile?.role === 'super_admin';
  
      const filteredNavigation = navigation
        .filter(item => {
          // Unconditionally hide specific sections from the sidebar
          const hiddenPages = ["compliance", "automation", "analytics"];
          if (hiddenPages.includes(item.pageKey)) {
            return false;
          }
          // Hide admin-only items from non-admin users
          if (item.adminOnly && !isAdmin) {
            return false;
          }
          // Hide super admin-only items from non-super admin users
          if (item.superAdminOnly && !isSuperAdmin) {
            return false;
          }
          return true;
        })
        .filter(item => !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery))
        .map(item => ({
          ...item,
          // Primary control via usePagePermissions
          // Defensive guard: ensure admin without active subscription only sees dashboard, subscription and settings
          // Respect subscription exemption by relying on hasActiveSubscription
          disabled: (
            !hasPermission(item.pageKey) ||
            (
              userProfile?.role === 'admin' &&
              !subscriptionStatus.hasActiveSubscription &&
              item.pageKey !== 'dashboard' &&
              item.pageKey !== 'subscription' &&
              item.pageKey !== 'settings' &&
              item.pageKey !== 'school'
            )
          )
        }));

  // Mobile bottom navigation items (compact, icon-first)
  const mobileNavItems = [
    {
      name: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
      key: "dashboard",
      disabled: !hasPermission("dashboard"),
    },
    {
      name: isEliteActive ? "CRM" : "Clients",
      href: "/clients",
      icon: Users,
      key: "clients",
      disabled: !hasPermission("clients"),
    },
    {
      name: "Work",
      href: "/reports",
      icon: FileText,
      key: "reports",
      disabled: !hasPermission("reports"),
    },
    {
      name: "Coach",
      href: "/ai-coach",
      icon: Sparkles,
      key: "ai-coach",
      disabled: !hasPermission("ai-coach"),
    },
    {
      name: "Settings",
      href: "/settings",
      icon: Settings,
      key: "settings",
      disabled: !hasPermission("settings"),
    },
  ];

  const handleLogout = async () => {
    try {
      // Clear all auth-related localStorage items
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      
      await authApi.logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear token and redirect
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate("/login");
    }
  };

  const isCollapsed = collapsed && !isSmallScreen;
  const widthClass = isSmallScreen ? 'w-64' : (isCollapsed ? 'w-16' : 'w-64');
  const translateClass = isSmallScreen ? (isMobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0';
  const visibilityClass = isSmallScreen ? (isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none') : 'opacity-100';

  // Extra items specifically for mobile bottom navigation
  const mobileNavExtras = [
    {
      name: "Invoices",
      href: "/invoices",
      icon: FileText,
      pageKey: "invoices",
      disabled: false,
    },
    {
      name: "Logout",
      href: "#logout",
      icon: LogOut,
      pageKey: "logout",
      disabled: false,
      onClick: handleLogout as unknown as (() => void),
    },
  ] as Array<{
    name: string;
    href: string;
    icon: any;
    pageKey?: string;
    disabled?: boolean;
    onClick?: () => void;
  }>;

  return (
    <>
      {/* Mobile toggle button */}
      {isSmallScreen && !isMobileOpen && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-2 top-2 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur border border-border/40 dark:border-slate-700 shadow hidden"
          aria-hidden="true"
          tabIndex={-1}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Screen overlay when mobile drawer is open */}
      {isSmallScreen && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[900]"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={`${widthClass} ${translateClass} ${visibilityClass} transform transition-transform duration-300 ease-in-out ${isEliteActive ? 'elite-sidebar' : 'bg-white dark:bg-slate-900 border-r border-border/40 dark:border-slate-700'} flex flex-col shadow-lg fixed left-0 top-0 h-screen z-[1000] overflow-hidden ${isCollapsed ? 'min-w-[4rem]' : 'min-w-[16rem]'} min-h-0 ${className ?? ''}`}
      >
      {/* Header */}
      <div className={`p-4 border-b ${isEliteActive ? 'border-white/50' : 'border-border/40 dark:border-slate-700'}`}>
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Link to="/" className="flex items-center space-x-2">
              <img src="/image.png" alt="Score Machine" className="w-20 h-14" />
              <span className={`text-lg font-bold ${isEliteActive ? 'elite-sidebar-logo-text' : 'gradient-text-primary'}`}>
                Score Machine
              </span>
            </Link>
          )}
          {collapsed && (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg mx-auto ${isEliteActive ? 'bg-gradient-to-br from-[#00d4ff] to-[#7000ff]' : 'gradient-primary'}`}>
              <CreditCard className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (isSmallScreen) {
                setIsMobileOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className={isEliteActive ? 'hover:bg-blue-50' : 'hover:bg-gradient-soft'}
            aria-label={isSmallScreen ? 'Close sidebar' : (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          >
            {isSmallScreen ? (
              <X className="h-4 w-4" />
            ) : collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className={`p-4 border-b ${isEliteActive ? 'border-white/50' : 'border-border/40 dark:border-slate-700'}`}>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isEliteActive ? 'text-cyan-500' : 'text-slate-600 dark:text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={isEliteActive ? 'w-full pl-10 pr-4 py-2 text-sm border border-slate-100 rounded-lg bg-slate-50 text-slate-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#00d4ff]/30 focus:border-[#00d4ff]/50 transition-all placeholder:text-slate-400' : 'w-full pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-gradient-light focus:outline-none focus:ring-2 focus:ring-ocean-blue/20 focus:border-ocean-blue/40'}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          const disabled = item.disabled;

          const content = (
            <>
              <Icon
                className={`h-5 w-5 ${
                  disabled
                    ? "text-slate-400 dark:text-slate-600"
                    : active
                    ? (isEliteActive ? "text-[#7000ff]" : "text-white")
                    : (isEliteActive ? "text-slate-500 group-hover:text-[#7000ff]" : "text-slate-600 dark:text-slate-400 group-hover:text-ocean-blue")
                }`}
              />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className={`font-medium ${
                    disabled ? "text-slate-400 dark:text-slate-600" : ""
                  }`}>{item.name}</span>
                  <div className="flex items-center space-x-2">
                    {item.badge && (
                      <Badge
                        variant={active ? "secondary" : "outline"}
                        className={`text-xs ${
                          disabled
                            ? "bg-slate-100 text-slate-400 border-slate-200"
                            : active
                            ? (isEliteActive ? "elite-sidebar-badge" : "bg-white/20 text-white border-white/30")
                            : item.name === 'Subscription' && item.badge === 'Payment Required'
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : (isEliteActive ? "border-[#7000ff]/20 text-[#7000ff]" : "border-ocean-blue/20 text-ocean-blue")
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </>
          );

          if (disabled) {
            return (
              <div
                key={item.name}
                className={`flex items-center py-2.5 rounded-lg transition-all duration-200 cursor-not-allowed opacity-40 hover:opacity-60 relative group ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'}`}
                title="Upgrade your subscription to access this feature"
              >
                {content}
                {/* Subtle lock icon overlay */}
                <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-slate-200 dark:bg-slate-700 rounded-full p-1">
                    <Shield className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center py-2.5 transition-all duration-200 group ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} ${
                active
                  ? (isEliteActive ? "elite-sidebar-item-active" : "gradient-primary text-white shadow-lg rounded-lg")
                  : (isEliteActive ? "elite-sidebar-item" : "rounded-lg text-slate-600 dark:text-slate-400 hover:bg-gradient-soft hover:text-foreground")
              }`}
            >
              {content}
            </Link>
          );
        })}

        {/* Quick Actions */}
        {!collapsed && (
          <div className="pt-6">
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isEliteActive ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
              Quick Actions
            </h4>
            <div className="space-y-2">
              <Button
                onClick={hasPermission('clients') ? (onAddClient || (() => navigate("/clients"))) : undefined}
                variant="outline"
                size="sm"
                disabled={!hasPermission('clients')}
                className={`w-full justify-start relative group ${
                  !hasPermission('clients')
                    ? "border-slate-200 text-slate-400 cursor-not-allowed opacity-40 hover:opacity-60"
                    : isEliteActive ? "bg-gradient-to-r from-[#00d4ff] to-[#00ffcc] text-slate-900 border-0 font-bold shadow-[0_0_15px_rgba(0,212,255,0.4)] hover:shadow-[0_0_25px_rgba(0,212,255,0.6)] hover:opacity-90" : "border-ocean-blue/20 text-ocean-blue hover:ocean-blue"
                }`}
                title={!hasPermission('clients') ? "Upgrade your subscription to access this feature" : ""}
              >
                <Target className="h-4 w-4 mr-2" />
                {isEliteActive ? "Add to CRM" : "Add Client"}
                {!hasPermission('clients') && (
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-slate-200 dark:bg-slate-700 rounded-full p-1">
                      <Shield className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    </div>
                  </div>
                )}
              </Button>
              <Button
                onClick={() => navigate("/invoices")}
                variant="outline"
                size="sm"
                className={`w-full justify-start ${isEliteActive ? 'bg-slate-50 text-slate-700 border border-slate-100 font-bold hover:bg-purple-50 hover:text-[#7000ff] transition-all' : 'border-slate-300/60 text-slate-700 hover:bg-opacity-90'}`}
              >
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/40 dark:border-slate-700 space-y-2">
        {portalReturnContext && !collapsed && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start items-start gap-2 border-ocean-blue/20 text-ocean-blue hover:bg-opacity-90 px-3 py-2 h-auto min-h-[40px] whitespace-normal text-left leading-snug"
            onClick={() => {
              window.location.href = portalReturnContext.targetUrl;
            }}
          >
            <ArrowLeft className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-normal break-words text-left leading-snug">
              {portalReturnContext.label}
            </span>
          </Button>
        )}

        {/* Compact Admin Status for small screens */}
        {!collapsed && isSmallScreen && (
          <div className="mt-2 p-3 rounded-lg border border-cyan-200/60 dark:border-cyan-600/40 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              <span className="text-xs font-medium">
                {subscriptionStatus.planName ? `${subscriptionStatus.planName} Plan` : 'No Active Plan'} {subscriptionStatus.hasActiveSubscription ? 'Active' : 'Inactive'}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => openAffiliatePortal()}
            >
              Affiliate
            </Button>
          </div>
        )}

        {/* Full Admin Status for larger screens */}
        {!collapsed && !isSmallScreen && (
          <div className="mt-3 p-4 bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 dark:from-slate-800/50 dark:via-slate-700/50 dark:to-slate-800/50 rounded-xl border-2 border-cyan-200/60 dark:border-cyan-600/40 shadow-lg">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1 bg-gradient-to-r from-cyan-100 to-teal-100 dark:from-cyan-800/80 dark:to-teal-800/80 rounded-full">
                <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
              </div>
              <span className="text-sm font-bold gradient-text-primary">
                Admin Status
              </span>
            </div>
            <div className="mb-3">
              <div className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
                {subscriptionStatus.planName ? `${subscriptionStatus.planName} Plan` : 'No Active Plan'} {subscriptionStatus.hasActiveSubscription ? 'Active' : 'Inactive'}
              </div>
              <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                {subscriptionStatus.hasActiveSubscription ? 'Admin dashboard access enabled' : 'Limited access until activation'}
              </div>
            </div>
            <Button
              size="sm"
              className="w-full gradient-primary hover:opacity-90 text-white text-[10px] sm:text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center whitespace-nowrap px-2"
              onClick={() => openAffiliatePortal()}
            >
              <Share2 className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">Go to Affiliate Pro Dashboard</span>
            </Button>
          </div>
        )}

        {/* Partner Program Upgrade Section (hide on small screens for space) */}
        {!collapsed && !isSmallScreen && userProfile?.role === 'admin' && !subscriptionStatus.hasActiveSubscription && (
          <div className="mt-3 p-4 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/30 dark:via-indigo-900/30 dark:to-blue-900/30 rounded-xl border-2 border-purple-200 dark:border-purple-600 shadow-lg">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1 bg-purple-100 dark:bg-purple-800 rounded-full">
                <Crown className="h-4 w-4 text-purple-600 dark:text-purple-300" />
              </div>
              <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                Upgrade to Partner Program
              </span>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                <DollarSign className="h-3 w-3 mr-1" />
                <span>20-25% commission rates</span>
              </div>
              <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                <Sparkles className="h-3 w-3 mr-1" />
                <span>Premium marketing materials</span>
              </div>
              <div className="flex items-center text-xs text-purple-600 dark:text-purple-400">
                <Shield className="h-3 w-3 mr-1" />
                <span>Priority support & training</span>
              </div>
            </div>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 hover:from-purple-600 hover:via-purple-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              onClick={() => navigate('/subscription')}
            >
              <Crown className="h-3 w-3 mr-1" />
              Upgrade Now - Get Premium Benefits
            </Button>
          </div>
        )}
      </div>
      </div>

      <div className={`border-t ${isEliteActive ? 'border-white/50' : 'border-border/40 dark:border-slate-700'} p-4`}>
        {!collapsed && (
          <div className={`flex items-center space-x-3 p-2 rounded-xl transition-colors ${isEliteActive ? 'bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:shadow-sm' : 'hover:bg-gradient-soft'}`}>
            <Avatar className="h-8 w-8">
              {userProfile?.avatar && (
                <AvatarImage src={userProfile.avatar} alt="Profile" />
              )}
              <AvatarFallback className={`text-white text-sm font-bold ${isEliteActive ? 'bg-gradient-to-br from-[#00d4ff] to-[#7000ff]' : 'gradient-primary'}`}>
                {userProfile ? 
                  `${userProfile.first_name?.charAt(0) || ''}${userProfile.last_name?.charAt(0) || ''}` 
                  : 'U'
                }
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-sm overflow-hidden">
              <div className={`font-bold truncate ${isEliteActive ? 'text-slate-800' : ''}`}>
                {userProfile ? 
                  `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'User'
                  : 'Loading...'
                }
              </div>
              <div className={`text-xs truncate ${isEliteActive ? 'text-[#7000ff] font-semibold tracking-wide' : 'text-slate-600 dark:text-slate-400'}`}>
                {(() => {
                  if (userProfile?.role === 'super_admin') return 'Super Admin Account';
                  if (userProfile?.role === 'admin') {
                    return isEliteActive ? 'Elite Access' : (subscriptionStatus.hasActiveSubscription ? 'Partner Program' : 'Affiliate Program');
                  }
                  if (userProfile?.role === 'manager') return 'Manager Account';
                  if (userProfile?.role === 'agent') return 'Agent Account';
                  return subscriptionStatus.hasActiveSubscription ? 'Pro Account' : 'Free Account';
                })()}
              </div>
            </div>
            <div className="flex items-center space-x-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={handleLogout} className={isEliteActive ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50' : ''}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Mobile Bottom Nav (persistent via portal to avoid transformed ancestors) */}
      {isSmallScreen && typeof document !== 'undefined' && createPortal(
        (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 supports-[backdrop-filter]:backdrop-blur border-t border-border/40 dark:border-slate-700 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="mx-auto max-w-[850px] px-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <ul className="flex items-stretch flex-nowrap gap-1">
                {[...filteredNavigation, ...mobileNavExtras].map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const disabled = item.disabled;
                  const hasCustomClick = 'onClick' in item && typeof item.onClick === 'function';
                  const baseClasses = disabled
                    ? "text-slate-400 cursor-not-allowed"
                    : active
                    ? "text-ocean-blue"
                    : "text-slate-600 dark:text-slate-300";
                  return (
                    <li key={item.pageKey ?? item.name} className="flex-none">
                      <Link
                        to={disabled || hasCustomClick ? location.pathname : item.href}
                        onClick={disabled
                          ? (e) => e.preventDefault()
                          : hasCustomClick
                          ? (e) => {
                              e.preventDefault();
                              item.onClick();
                            }
                          : undefined}
                        className={`flex h-16 min-w-[80px] px-2 flex-col items-center justify-center gap-0.5 transition-colors ${
                          active ? "bg-slate-100 dark:bg-slate-800" : ""
                        } ${disabled ? "opacity-50" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                        aria-disabled={disabled}
                      >
                        <Icon className={`h-5 w-5 ${baseClasses}`} />
                        <span className={`text-[11px] ${baseClasses}`}>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>
        ),
        document.body
      )}
    </>
  );
}
