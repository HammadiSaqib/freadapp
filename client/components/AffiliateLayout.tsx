import { ReactNode } from "react";
import AffiliateSidebar from "./AffiliateSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, Settings, Menu, Moon, Sun, Monitor, Crown, User, DollarSign, Clock, BarChart3, Users, CreditCard, Link as LinkIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { authApi, affiliateApi } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuthContext } from "@/contexts/AuthContext";

interface AffiliateLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function AffiliateLayout({
  children,
  title,
  description,
}: AffiliateLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userProfile } = useAuthContext();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { hasActiveSubscription, isLoading } = useSubscriptionStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) return savedTheme;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove existing theme classes
    root.classList.remove("light", "dark");

    let effectiveTheme = theme;
    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    root.classList.add(effectiveTheme);
  }, [theme]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await affiliateApi.getStats();
        if (response.data && response.data.success) {
          // Use pending commissions as notification count
          setNotificationCount(response.data.data.pendingCommissions || 0);
          
          // Create mock notification data based on pending commissions
          const mockNotifications = [];
          const pendingCount = response.data.data.pendingCommissions || 0;
          
          for (let i = 0; i < Math.min(pendingCount, 5); i++) {
            mockNotifications.push({
              id: i + 1,
              type: 'pending_commission',
              title: `New referral signup`,
              message: `Someone joined through your referral link`,
              time: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
              read: false
            });
          }
          
          setNotifications(mockNotifications);
        }
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    fetchNotificationCount();
  }, []);

  const handleLogout = async () => {
    try {
      clearPortalReturnContext();
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");

      await authApi.logout();
      navigate("/affiliate/login");
    } catch (error) {
      console.error("Logout error:", error);

      clearPortalReturnContext();
      localStorage.removeItem("token");
      localStorage.removeItem("auth_token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      navigate("/affiliate/login");
    }
  };

  const setThemeMode = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const affiliateNavItems = [
    { name: "Dashboard", href: "/affiliate/dashboard", icon: BarChart3 },
    { name: "Referrals", href: "/affiliate/referrals", icon: Users },
    { name: "Earnings", href: "/affiliate/earnings", icon: DollarSign },
    { name: "Links", href: "/affiliate/links", icon: LinkIcon },
    { name: "Commissions", href: "/affiliate/commissions", icon: CreditCard },
    { name: "Subscription", href: "/affiliate/subscription", icon: Crown },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-teal-50 dark:from-slate-950 dark:to-green-950">
      {/* Sidebar */}
      <AffiliateSidebar className="hidden lg:flex" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <AffiliateSidebar className="relative z-50" />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-border/40 dark:border-slate-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Page title */}
              <div>
                {title && (
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Search referrals..."
                  className="pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/40 w-64"
                />
              </div>

              {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                  {notificationCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {notificationCount}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 ? (
                  <>
                    {notifications.map((notification) => (
                      <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 cursor-pointer">
                        <div className="flex items-start gap-3 w-full">
                          <div className="flex-shrink-0 mt-1">
                            {notification.type === 'pending_commission' ? (
                              <DollarSign className="h-4 w-4 text-green-500" />
                            ) : (
                              <User className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{notification.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(notification.time).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/affiliate/commissions" className="w-full text-center text-sm text-blue-600 hover:text-blue-800">
                        View all commissions
                      </Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem disabled className="text-center text-muted-foreground">
                    No new notifications
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

              {/* Theme toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {theme === "light" && <Sun className="h-5 w-5" />}
                    {theme === "dark" && <Moon className="h-5 w-5" />}
                    {theme === "system" && <Monitor className="h-5 w-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => toggleTheme("light")}>
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleTheme("dark")}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleTheme("system")}>
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Upgrade CTA in top navigation */}
              {!isLoading && !hasActiveSubscription && (
                <>
                  {/* Mobile: icon-only */}
                  <Link to="/affiliate/subscription" className="sm:hidden" title="Upgrade to Pro" aria-label="Upgrade to Pro">
                    <Button variant="ghost" size="sm" className="hover:bg-gradient-soft">
                      <Crown className="h-5 w-5 text-purple-600" />
                    </Button>
                  </Link>
                  {/* Desktop: full button with text */}
                  <Link to="/affiliate/subscription" className="hidden sm:inline-flex">
                    <Button size="sm" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                  </Link>
                </>
              )}

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      {userProfile?.avatar && (
                        <AvatarImage src={userProfile.avatar} alt="Profile" />
                      )}
                      <AvatarFallback className="bg-gradient-to-r from-green-600 to-teal-600 text-white text-sm">
                        {userProfile ? 
                          `${userProfile.first_name?.charAt(0) || ''}${userProfile.last_name?.charAt(0) || ''}` 
                          : 'AF'
                        }
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">
                        {userProfile ? 
                          `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Affiliate Partner'
                          : 'Loading...'
                        }
                      </p>
                      <p className="w-[200px] truncate text-sm text-slate-600 dark:text-slate-400">
                        {userProfile?.email || 'affiliate@partner.com'}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        Affiliate Partner
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/affiliate/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleLogout}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        {createPortal(
          (
            <nav className="fixed inset-x-0 bottom-0 z-40 w-full lg:hidden bg-white/95 dark:bg-slate-900/95 supports-[backdrop-filter]:backdrop-blur border-t border-border/40 dark:border-slate-700" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <div className="mx-auto max-w-7xl px-2 overflow-x-auto no-scrollbar">
                <ul className="flex items-stretch flex-nowrap gap-1 py-2">
                  {affiliateNavItems.map((item) => {
                    const Icon = item.icon as any;
                    const active = location.pathname.startsWith(item.href);
                    return (
                      <li key={item.name} className="flex-none snap-start">
                        <Link
                          to={item.href}
                          className={`group flex h-16 min-w-[80px] px-2 flex-col items-center justify-center gap-0.5 rounded-md text-xs ${
                            active
                              ? "text-green-600"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${active ? 'text-green-600' : 'text-slate-700 dark:text-slate-300'}`} />
                          <span className="leading-none">{item.name}</span>
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
      </div>
    </div>
  );
}