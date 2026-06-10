import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi, superAdminApi } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthContext } from "@/contexts/AuthContext";
import { isPortalSidebarActive } from "@/lib/hostRouting";
import {
  CreditCard,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  Package,
  UserCheck,
  Receipt,
  Shield,
  HandHeart,
  FileText,
  Headphones,
  GraduationCap,
  ClipboardList,
  Mail,
  CalendarClock,
  AlertTriangle,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";

interface SuperAdminSidebarProps {
  className?: string;
}

export default function SuperAdminSidebar({ className }: SuperAdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { userProfile } = useAuthContext();

  const navigation = [
    {
      name: "Overview",
      href: "/super-admin/overview",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "Plans",
      href: "/super-admin/plans",
      icon: Package,
      badge: null,
    },
    {
      name: "Admins",
      href: "/super-admin/admins",
      icon: UserCheck,
      badge: null,
    },
    {
      name: "Contracts",
      href: "/super-admin/contracts",
      icon: Shield,
      badge: null,
    },
    {
      name: "Users",
      href: "/super-admin/users",
      icon: Users,
      badge: null,
    },
    {
      name: "Shop Management",
      href: "/super-admin/shop-management",
      icon: Package,
      badge: null,
    },
    {
      name: "School Management",
      href: "/super-admin/school-management",
      icon: GraduationCap,
      badge: null,
    },
    {
      name: "Business Directory",
      href: "/super-admin/business-directory",
      icon: Building2,
      badge: null,
    },
    {
      name: "Support Users",
      href: "/super-admin/support-users",
      icon: Headphones,
      badge: null,
    },
    {
      name: "Email Campaign",
      href: "/super-admin/email-campaign",
      icon: Mail,
      badge: null,
    },
    {
      name: "Reports",
      href: "/super-admin/reports",
      icon: FileText,
      badge: null,
    },
    {
      name: "Tasks",
      href: "/super-admin/tasks",
      icon: ClipboardList,
      badge: null,
    },
    {
      name: "Feature Requests",
      href: "/admin/feature-requests",
      icon: FileText,
      badge: null,
    },
    {
      name: "Subscriptions",
      href: "/super-admin/subscriptions",
      icon: Receipt,
      badge: null,
    },
    {
      name: "Cancellation Reports",
      href: "/super-admin/cancellation-reports",
      icon: AlertTriangle,
      badge: null,
    },
    {
      name: "Affiliates",
      href: "/super-admin/affiliates",
      icon: HandHeart,
      badge: null,
    },
    {
      name: "Affiliate Trial Plans",
      href: "/super-admin/affiliate-trial-plans",
      icon: CalendarClock,
      badge: null,
    },
    {
      name: "Admin Import",
      href: "/super-admin/admin-import",
      icon: Receipt,
      badge: null,
    },
    {
      name: "Affiliate Referal Import",
      href: "/super-admin/affiliate-import",
      icon: HandHeart,
      badge: null,
    },
    {
      name: "Client Import",
      href: "/super-admin/client-import",
      icon: FileText,
      badge: null,
    },
    {
      name: "Report Upload",
      href: "/super-admin/credit-report-upload",
      icon: FileText,
      badge: null,
    },
    {
      name: "Letter Templates",
      href: "/super-admin/letters",
      icon: FileText,
      badge: null,
    },
    {
      name: "Settings",
      href: "/super-admin/settings",
      icon: Settings,
      badge: null,
    },
  ];

  const isActive = (href: string) => isPortalSidebarActive(location.pathname, href, 'super-admin');

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
      navigate("/super-admin/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear token and redirect
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate("/super-admin/login");
    }
  };

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 border-r border-border/40 dark:border-slate-700 flex flex-col shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/40 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Link to="/super-admin/overview" className="flex items-center space-x-2">
               <img src="/company-logo.svg" alt="Fread App" className="w-20 h-14" />
              <span className="text-lg font-bold gradient-text-primary">
                Super Admin
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center shadow-lg mx-auto">
              <Crown className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-gradient-soft"
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
        <div className="p-4 border-b border-border/40 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-gradient-light focus:outline-none focus:ring-2 focus:ring-ocean-blue/20 focus:border-ocean-blue/40"
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
                  ? "gradient-primary text-white shadow-lg"
                  : "text-slate-600 dark:text-slate-400 hover:bg-gradient-soft hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-400 group-hover:text-ocean-blue"
                }`}
              />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className="font-medium">{item.name}</span>
                  {item.badge && (
                    <Badge
                      variant={active ? "secondary" : "outline"}
                      className={`text-xs ${
                        active
                          ? "bg-white/20 text-white border-white/30"
                          : "border-ocean-blue/20 text-ocean-blue"
                      }`}
                    >
                      {item.badge}
                    </Badge>
                  )}
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
                onClick={() => navigate("/super-admin/plans")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-ocean-blue/20 text-ocean-blue hover:bg-gradient-soft"
              >
                <Package className="h-4 w-4 mr-2" />
                Add Plan
              </Button>
              <Button
                onClick={() => navigate("/super-admin/admins")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-sea-green/20 text-sea-green hover:bg-gradient-soft"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Manage Admins
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/40 dark:border-slate-700 space-y-2">
        {!collapsed && (
          <div className="gradient-light p-3 rounded-lg mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-ocean-blue" />
              <span className="text-sm font-medium">System Status</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              All systems operational
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-ocean-blue to-sea-green h-1.5 rounded-full" style={{width: '95%'}}></div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {!collapsed && (
            <div className="flex-1">
              <Link to="/super-admin/settings" className="w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start hover:bg-gradient-soft"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          )}
          {collapsed && (
            <Link to="/super-admin/settings" className="w-full">
              <Button
                variant="ghost"
                size="sm"
                className="w-full hover:bg-gradient-soft"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gradient-soft transition-colors">
            <Avatar className="h-8 w-8">
              {userProfile?.avatar && (
                <AvatarImage src={userProfile.avatar} alt="Profile" />
              )}
              <AvatarFallback className="gradient-primary text-white text-sm">
                {userProfile ? 
                  `${userProfile.first_name?.charAt(0) || ''}${userProfile.last_name?.charAt(0) || ''}` 
                  : 'SA'
                }
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-sm">
              <div className="font-medium">
                {userProfile ? 
                  `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Super Admin'
                  : 'Super Admin'
                }
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-xs">
                Super Admin
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
