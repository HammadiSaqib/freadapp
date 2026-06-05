import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isPortalSidebarActive } from "@/lib/hostRouting";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  DollarSign,
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  CreditCard,
  Target,
  PieChart,
  Calculator,
  Banknote,
  HandCoins,
  Building2,
} from "lucide-react";
import { useState } from "react";

interface FundingManagerSidebarProps {
  className?: string;
}

export default function FundingManagerSidebar({ className = "" }: FundingManagerSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigation = [
    {
      name: "Dashboard",
      href: "/funding-manager",
      icon: LayoutDashboard,
    },
    {
      name: "Funding Requests",
      href: "/funding-manager/funding-requests",
      icon: DollarSign,
    },
    {
      name: "Client Portfolio",
      href: "/funding-manager/clients",
      icon: Users,
    },
    {
      name: "Bank Management",
      href: "/funding-manager/banks",
      icon: Building2,
    },
    {
      name: "Card Management",
      href: "/funding-manager/cards",
      icon: CreditCard,
    },
    {
      name: "Commission Tracking",
      href: "/funding-manager/commissions",
      icon: HandCoins,
    },
    {
      name: "Settings",
      href: "/funding-manager/settings",
      icon: Settings,
    },
  ];

  const isActive = (path: string) => {
    return isPortalSidebarActive(location.pathname, path, 'funding-manager');
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
      navigate("/funding-manager/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear tokens and redirect
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate("/funding-manager/login");
    }
  };

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 border-r border-border/40 dark:border-slate-700 flex flex-col shadow-lg fixed left-0 top-0 h-screen ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/40 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Link to="/funding-manager" className="flex items-center space-x-2">
               <img src="/image.png" alt="Score Machine" className="w-20 h-14" />
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Funding Manager
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg mx-auto">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
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
              className="w-full pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                active
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
                  : "text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-400 group-hover:text-emerald-600"
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

        {/* Quick Actions */}
        {!collapsed && (
          <div className="pt-6">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
              Quick Actions
            </h4>
            <div className="space-y-2">
              <Button
                onClick={() => navigate("/funding-manager/clients")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-emerald-500/20 text-emerald-600 dark:hover:bg-emerald-900/20"
              >
                <Target className="h-4 w-4 mr-2" />
                Fund Client
              </Button>
              <Button
                onClick={() => navigate("/funding-manager/analytics")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-teal-500/20 text-teal-600 dark:hover:bg-teal-900/20"
              >
                <PieChart className="h-4 w-4 mr-2" />
                View Analytics
              </Button>

            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/40 dark:border-slate-700 space-y-2">
        {!collapsed && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium">Portfolio Status</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              All investments performing well
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-1.5 rounded-full" style={{width: '85%'}}></div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {!collapsed && (
            <div className="flex-1">
              <Link to="/funding-manager/settings" className="w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start dark:hover:bg-emerald-900/20"
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
            } dark:hover:bg-red-900/20 text-red-600`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>

        {/* User Profile */}
        {!collapsed && userProfile && (
          <div className="flex items-center space-x-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
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
              <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs">
                {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Funding Manager
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}