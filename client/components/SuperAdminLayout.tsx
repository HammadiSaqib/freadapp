import { ReactNode, useEffect, useState } from "react";
import SuperAdminSidebar from "./SuperAdminSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, Settings, Menu, Moon, Sun, Monitor, LayoutDashboard, UserCheck, Package, Users, FileText, Receipt, HandHeart, ClipboardList, Mail, AlertTriangle, Building2, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { createPortal } from "react-dom";

interface SuperAdminLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function SuperAdminLayout({
  children,
  title,
  description,
}: SuperAdminLayoutProps) {
  const { userProfile } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        if (mediaQuery.matches) {
          root.classList.add("dark");
        } else {
          root.classList.add("light");
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme);
  };

  // Detect small screens and keep it in sync with resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1024px)'); // lg breakpoint
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
      setIsSmallScreen(matches);
    };
    // Initialize
    setIsSmallScreen(mql.matches);
    const handler = (e: MediaQueryListEvent) => onChange(e);
    mql.addEventListener?.('change', handler);
    // Fallback for older browsers
    // @ts-ignore
    mql.addListener?.(handler);
    return () => {
      mql.removeEventListener?.('change', handler);
      // @ts-ignore
      mql.removeListener?.(handler);
    };
  }, []);

  // Bottom navigation items for Super Admin
  const bottomNavItems = [
    { name: 'Overview', href: '/super-admin/overview', icon: LayoutDashboard },
    { name: 'Appointments', href: '/super-admin/appointments', icon: CalendarDays },
    { name: 'Admins', href: '/super-admin/admins', icon: UserCheck },
    { name: 'Plans', href: '/super-admin/plans', icon: Package },
    { name: 'Users', href: '/super-admin/users', icon: Users },
    { name: 'Email', href: '/super-admin/email-campaign', icon: Mail },
    { name: 'Reports', href: '/super-admin/reports', icon: FileText },
    { name: 'Tasks', href: '/super-admin/tasks', icon: ClipboardList },
    { name: 'Directory', href: '/super-admin/business-directory', icon: Building2 },
    { name: 'Subscriptions', href: '/super-admin/subscriptions', icon: Receipt },
    { name: 'Cancellations', href: '/super-admin/cancellation-reports', icon: AlertTriangle },
    { name: 'Affiliates', href: '/super-admin/affiliates', icon: HandHeart },
    { name: 'Settings', href: '/super-admin/settings', icon: Settings },
  ];

  return (
    <div className="admin-purple-theme flex h-screen bg-gradient-light dark:bg-slate-950">
      {/* Sidebar */}
      <SuperAdminSidebar className="hidden lg:flex" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <SuperAdminSidebar className="relative z-50" />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-border/40 dark:border-slate-700 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Page title */}
              <div>
                {title && (
                  <h1 className="text-2xl font-bold gradient-text-primary">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-gradient-light focus:outline-none focus:ring-2 focus:ring-ocean-blue/20 focus:border-ocean-blue/40 w-64"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  3
                </span>
              </Button>

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

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      {userProfile?.avatar && (
                        <AvatarImage src={userProfile.avatar} alt={`${userProfile.first_name} ${userProfile.last_name}` || 'Super Admin'} />
                      )}
                      <AvatarFallback className="gradient-primary text-white text-sm">
                        {userProfile ? 
                          `${userProfile.first_name?.charAt(0) || ''}${userProfile.last_name?.charAt(0) || ''}` 
                          : 'SA'
                        }
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{userProfile?.first_name && userProfile?.last_name ? `${userProfile.first_name} ${userProfile.last_name}` : 'Super Admin'}</p>
                      <p className="w-[200px] truncate text-sm text-slate-600 dark:text-slate-400">
                        {userProfile?.email || 'super@admin.com'}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/super-admin/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      authApi.logout();
                      window.location.href = "/super-admin/login";
                    }}
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
          <div className="w-full">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        {isSmallScreen && typeof document !== 'undefined' && createPortal(
          (
            <nav
              className="fixed inset-x-0 bottom-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 supports-[backdrop-filter]:backdrop-blur border-t border-border/40 dark:border-slate-700 lg:hidden"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="mx-auto max-w-7xl px-2 overflow-x-auto no-scrollbar">
                <ul className="flex items-stretch flex-nowrap gap-1 py-2">
                  {bottomNavItems.map((item) => {
                    const Icon = item.icon as any;
                    const active = location.pathname.startsWith(item.href);
                    return (
                      <li key={item.name} className="flex-none snap-start">
                        <Link
                          to={item.href}
                          className={`group flex h-16 min-w-[80px] px-2 flex-col items-center justify-center gap-0.5 rounded-md text-xs ${
                            active
                              ? 'text-ocean-blue'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${active ? 'text-ocean-blue' : 'text-slate-700 dark:text-slate-300'}`} />
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
