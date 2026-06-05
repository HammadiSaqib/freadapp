import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { isPortalSidebarActive } from "@/lib/hostRouting";
import {
  Headphones,
  Ticket,
  MessageSquare,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
  Clock,
  Shield,
  UserPlus,
  HelpCircle,
  UserCog,
  Newspaper,
  Video,
  ClipboardList,
  Mail,
} from "lucide-react";
import { useState, useEffect } from "react";

interface SupportSidebarProps {
  className?: string;
}

export default function SupportSidebar({ className }: SupportSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const navigation = [
    {
      name: "Dashboard",
      href: "/support/dashboard",
      icon: BarChart3,
      badge: null,
    },
    {
      name: "Tickets",
      href: "/support/tickets",
      icon: Ticket,
      badge: "12",
    },
    {
      name: "Live Chat",
      href: "/support/live-chat",
      icon: MessageSquare,
      badge: "3",
    },
    {
      name: "Tasks",
      href: "/support/tasks",
      icon: ClipboardList,
      badge: null,
    },
    {
      name: "Users",
      href: "/support/users",
      icon: Users,
      badge: null,
    },
    {
      name: "Email Campaign",
      href: "/support/email-campaign",
      icon: Mail,
      badge: null,
    },
    {
      name: "Admin Management",
      href: "/support/admin-management",
      icon: UserCog,
      badge: null,
    },
    {
      name: "Knowledge Base",
      href: "/support/knowledge-base",
      icon: BookOpen,
      badge: null,
    },
    {
      name: "Blog Management",
      href: "/support/blog",
      icon: Newspaper,
      badge: null,
    },
    {
      name: "Testimonials",
      href: "/support/testimonials",
      icon: Video,
      badge: null,
    },
    {
      name: "Reports",
      href: "/support/reports",
      icon: FileText,
      badge: null,
    },
    {
      name: "Escalations",
      href: "/support/escalations",
      icon: AlertTriangle,
      badge: "2",
    },
  ];

  const isActive = (href: string) => isPortalSidebarActive(location.pathname, href, 'support');

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await authApi.getProfile();
        if (response.data && !response.error) {
          setUserProfile(response.data);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

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
      navigate("/support/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear token and redirect
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate("/support/login");
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
            <Link to="/support/dashboard" className="flex items-center space-x-2">
              <img src="/image.png" alt="Score Machine" className="w-20 h-14" loading="lazy" />
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Support Portal
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg mx-auto">
              <Headphones className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-purple-50 dark:hover:bg-purple-900/20"
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
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40"
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
                  ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg"
                  : "text-slate-600 dark:text-slate-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-400 group-hover:text-purple-600"
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
                          : "border-purple-500/20 text-purple-600 bg-purple-50 dark:bg-purple-900/20"
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
                onClick={() => navigate("/support/users")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-violet-500/20 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/40 dark:border-slate-700 space-y-2">
        {!collapsed && (
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10 p-3 rounded-lg mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Support Status</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              24/7 Support Active
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div className="bg-gradient-to-r from-purple-600 to-violet-600 h-1.5 rounded-full" style={{width: '92%'}}></div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {!collapsed && (
            <div className="flex-1">
              <Link to="/support/settings" className="w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          )}
          {collapsed && (
            <Link to="/support/settings" className="w-full">
              <Button
                variant="ghost"
                size="sm"
                className="w-full hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm">
                SP
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-sm">
              <div className="font-medium">{userProfile?.name || 'Support Team'}</div>
              <div className="text-slate-600 dark:text-slate-400 text-xs">
                Support Agent
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
