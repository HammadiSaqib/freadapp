import { ReactNode } from "react";
import { createPortal } from "react-dom";
import FundingManagerSidebar from "./FundingManagerSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Search,
  Settings,
  Menu,
  Moon,
  Sun,
  Monitor,
  LayoutDashboard,
  DollarSign,
  Users,
  Building2,
  CreditCard,
  HandCoins,
  PieChart,
  BarChart3,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

interface FundingManagerLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function FundingManagerLayout({ 
  children, 
  title = "Funding Manager Dashboard",
  description = "Manage funding operations and client portfolios"
}: FundingManagerLayoutProps) {
  const location = useLocation();
  const { userProfile } = useAuthContext();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    // Apply theme logic here
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const bottomNavItems = [
    { label: "Dashboard", href: "/funding-manager", Icon: LayoutDashboard },
    { label: "Requests", href: "/funding-manager/funding-requests", Icon: DollarSign },
    { label: "Clients", href: "/funding-manager/clients", Icon: Users },
    { label: "Banks", href: "/funding-manager/banks", Icon: Building2 },
    { label: "Cards", href: "/funding-manager/cards", Icon: CreditCard },
    { label: "Commissions", href: "/funding-manager/commissions", Icon: HandCoins },
    { label: "Analytics", href: "/funding-manager/analytics", Icon: PieChart },
    { label: "Revenue", href: "/funding-manager/revenue", Icon: BarChart3 },
    { label: "Settings", href: "/funding-manager/settings", Icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <FundingManagerSidebar className="hidden lg:flex" />
      
      {/* Main Content */}
      <div className="ml-0 lg:ml-64 transition-all duration-300 ease-in-out">
        {/* Top Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-border/40 dark:border-slate-700 px-6 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h1>
              {description && (
                <p className="hidden sm:block text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-64 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>

              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {theme === 'light' && <Sun className="h-5 w-5" />}
                    {theme === 'dark' && <Moon className="h-5 w-5" />}
                    {theme === 'system' && <Monitor className="h-5 w-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      {userProfile?.avatar ? (
                        <AvatarImage 
                          src={userProfile.avatar} 
                          alt={`${userProfile.first_name} ${userProfile.last_name}`}
                          onError={(e) => {
                            console.error('Top nav avatar failed to load:', userProfile.avatar);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                        {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">
                      {userProfile?.first_name} {userProfile?.last_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {userProfile?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/funding-manager/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={async () => {
                      try {
                        // Clear all auth-related localStorage items
                        localStorage.removeItem('token');
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('userRole');
                        localStorage.removeItem('userId');
                        localStorage.removeItem('userName');
                        
                        await authApi.logout();
                        window.location.href = "/funding-manager/login";
                      } catch (error) {
                        console.error("Logout error:", error);
                        // Even if API call fails, clear tokens and redirect
                        localStorage.removeItem('token');
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('userRole');
                        localStorage.removeItem('userId');
                        localStorage.removeItem('userName');
                        window.location.href = "/funding-manager/login";
                      }
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 pb-20">
          {children}
        </main>
        {/* Mobile bottom navigation */}
        {typeof document !== "undefined" &&
          createPortal(
            (
              <nav
                className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/40 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/60"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                aria-label="Funding Manager mobile navigation"
              >
                <div className="max-w-7xl mx-auto px-2 sm:px-4">
                  <ul className="flex items-center justify-between overflow-x-auto no-scrollbar gap-1 py-2 sm:py-3">
                    {bottomNavItems.map(({ label, href, Icon }) => {
                      const active = location.pathname.startsWith(href);
                      return (
                        <li key={href} className="min-w-[72px] flex-1">
                          <Link
                            to={href}
                            aria-label={label}
                            className={`flex flex-col items-center justify-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-md transition-colors ${
                              active
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${active ? "" : "opacity-80"}`} />
                            <span className="text-[11px] sm:text-xs mt-1 font-medium truncate">
                              {label}
                            </span>
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