import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isPortalSidebarActive } from "@/lib/hostRouting";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  User,
  CreditCard,
  FileText,
  Search,
  UserCheck,
  Shield,
  TrendingUp,
  BarChart3,
  DollarSign,
  FileSearch,
  Activity,
  History,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Target,
  PieChart,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface ClientSidebarProps {
  className?: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function ClientSidebar({ className = "", mobileOpen = false, onCloseMobile }: ClientSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const navigationSections = [
    {
      title: "Credit Report Section",
      items: [
        { name: "Dashboard", href: "/member/dashboard", icon: LayoutDashboard },
        { name: "Personal", href: "/member/personal", icon: User },
        { name: "Inquiries", href: "/member/inquiries", icon: Search },
        { name: "Public Records", href: "/member/public-records", icon: FileText },
        { name: "Accounts", href: "/member/accounts", icon: User },
      ],
    },
    {
      title: "Activity Area Section",
      items: [
        { name: "Analysis", href: "/member/analysis", icon: BarChart3 },
        { name: "Progress Report", href: "/member/progress-report", icon: TrendingUp },
        { name: "Underwriting", href: "/member/underwriting", icon: FileText },
        { name: "Funding Audit", href: "/member/funding", icon: DollarSign },
      ],
    },
  ];

  // Detect small screens and update state
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const handleChange = () => setIsSmallScreen(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  // Close the mobile sidebar on route change for small screens
  useEffect(() => {
    if (isSmallScreen && mobileOpen && onCloseMobile) {
      onCloseMobile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const isActive = (path: string) => {
    return isPortalSidebarActive(location.pathname, path, 'member');
  };

  const handleLogout = async () => {
    try {
      // Clear all auth-related localStorage items
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      
      // Call the logout API
      await authApi.logout();
      
      // Navigate to login page
       navigate("/member/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear tokens and redirect
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
       navigate("/member/login");
    }
  };

  const translateClass = isSmallScreen ? (mobileOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0';
  // Bottom navigation items (scrollable): include all sidebar pages + key extras
  const bottomNavCore = navigationSections.flatMap((section) => section.items);
  const bottomNavExtras = [
    { name: 'Monitoring', href: '/member/monitoring', icon: Shield },
    { name: 'Score History', href: '/member/score-history', icon: TrendingUp },
    { name: 'Support', href: '/member/support', icon: HelpCircle },
    { name: 'Settings', href: '/member/settings', icon: Settings },
  ];
  const bottomNavItems = [...bottomNavCore, ...bottomNavExtras];

  return (
    <>
      <div
        className={`${
          collapsed ? "w-16" : "w-64"
        } transition-all duration-150 ease-out transform ${translateClass} bg-white dark:bg-slate-900 border-r border-border/40 dark:border-slate-700 flex flex-col shadow-lg fixed left-0 top-0 h-screen z-50 ${className}`}
      >
      {/* Header */}
      <div className="p-4 border-b border-border/40 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
             <Link to="/member" className="flex items-center space-x-2">
               <img src="/image.png" alt="Score Machine" className="w-20 h-14" />
              <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Client Portal
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg mx-auto">
              <User className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-200 focus:text-slate-700 active:text-slate-700" />
              ) : (
                <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-200 focus:text-slate-700 active:text-slate-700" />
              )}
            </Button>
            {isSmallScreen && mobileOpen && (
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-green-50 dark:hover:bg-green-900/20 lg:hidden"
                onClick={() => onCloseMobile && onCloseMobile()}
                aria-label="Close sidebar"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-200 hover:text-slate-700 dark:hover:text-slate-200 focus:text-slate-700 active:text-slate-700" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-green-50/50 dark:bg-green-900/10 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/40"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!collapsed && (
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                {section.title}
              </h4>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
                const iconSize = collapsed ? "h-6 w-6" : "h-5 w-5";

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    active
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg"
                      : "text-slate-600 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-foreground"
                  }`}
                >
                    <Icon
                      className={`${iconSize} transition-none ${
                      active
                        ? "text-white"
                          : `${collapsed ? "text-slate-700 dark:text-slate-200" : "text-slate-600 dark:text-slate-400"} group-hover:text-green-600`
                    }`}
                  />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span className="font-medium">{item.name}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Quick Actions */}
        {!collapsed && (
          <div className="pt-6">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
              Quick Actions
            </h4>
            <div className="space-y-2">
              <Button
                onClick={() => navigate("/member/progress-report")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-green-500/20 text-green-600 hover:bg-green-500 dark:hover:bg-green-900/20"
              >
                <Target className="h-4 w-4 mr-2" />
                View Progress
              </Button>
              <Button
                onClick={() => navigate("/member/analysis")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 dark:hover:bg-emerald-900/20"
              >
                <PieChart className="h-4 w-4 mr-2" />
                Credit Analysis
              </Button>
              <Button
                onClick={() => navigate("/member/monitoring")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-green-500/20 text-green-600 hover:bg-green-500 dark:hover:bg-green-900/20"
              >
                <Shield className="h-4 w-4 mr-2" />
                Monitoring
              </Button>
              <Button
                onClick={() => navigate("/member/score-history")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 dark:hover:bg-emerald-900/20"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Score History
              </Button>
              <Button
                onClick={() => navigate("/member/support")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-green-500/20 text-green-600 hover:bg-green-500 dark:hover:bg-green-900/20"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Support
              </Button>
              <Button
                onClick={() => navigate("/member/settings")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-emerald-500/20 text-emerald-600 hover:bg-emerald-500 dark:hover:bg-emerald-900/20"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/40 dark:border-slate-700 space-y-2">
        {!collapsed && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Credit Progress</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Your score is improving!
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-1.5 rounded-full" style={{width: '72%'}}></div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {!collapsed && (
            <div className="flex-1">
              <Link to="/member/settings" className="w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start hover:bg-green-500 dark:hover:bg-green-900/20"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          )}
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className={`${
              collapsed ? "w-full" : ""
            } hover:bg-red-50 hover:bg-red-500 dark:hover:bg-red-900/20 text-red-600`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>

        {/* User Profile */}
        {!collapsed && userProfile && (
          <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Avatar className="h-8 w-8">
              {userProfile?.avatar ? (
                <AvatarImage 
                  src={userProfile.avatar} 
                  alt={`${userProfile.first_name} ${userProfile.last_name}`}
                  onError={(e) => {
                    console.error('Sidebar avatar failed to load:', userProfile.avatar);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs">
                {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Client
              </p>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Mobile Bottom Nav (persistent via portal) */}
      {isSmallScreen && typeof document !== 'undefined' && createPortal(
        (
          <nav
            className="fixed inset-x-0 bottom-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 supports-[backdrop-filter]:backdrop-blur border-t border-border/40 dark:border-slate-700 lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="mx-auto max-w-[850px] px-2 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
              <ul className="flex items-stretch flex-nowrap gap-1">
                {bottomNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <li key={item.name} className="flex-none">
                      <Link
                        to={item.href}
                        className={`flex h-16 min-w-[80px] px-2 flex-col items-center justify-center gap-0.5 transition-colors ${
                          active ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`} />
                        <span className={`text-[11px] ${active ? 'text-emerald-700' : 'text-slate-600 dark:text-slate-300'}`}>{item.name}</span>
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
