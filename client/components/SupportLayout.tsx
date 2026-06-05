import { ReactNode } from "react";
import { createPortal } from "react-dom";
import SupportSidebar from "./SupportSidebar";
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
  BarChart3,
  Ticket,
  MessageSquare,
  Users,
  BookOpen,
  UserCog,
  FileText,
  AlertTriangle,
  Newspaper,
  ClipboardList,
  Mail,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

interface SupportLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function SupportLayout({
  children,
  title,
  description,
}: SupportLayoutProps) {
  const { userProfile } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
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

  const bottomNavItems = [
    { label: "Dashboard", href: "/support/dashboard", Icon: BarChart3 },
    { label: "Tickets", href: "/support/tickets", Icon: Ticket },
    { label: "Tasks", href: "/support/tasks", Icon: ClipboardList },
    { label: "Live Chat", href: "/support/live-chat", Icon: MessageSquare },
    { label: "Users", href: "/support/users", Icon: Users },
    { label: "Email", href: "/support/email-campaign", Icon: Mail },
    { label: "Admins", href: "/support/admin-management", Icon: UserCog },
    { label: "Knowledge", href: "/support/knowledge-base", Icon: BookOpen },
    { label: "Blog", href: "/support/blog", Icon: Newspaper },
    { label: "Reports", href: "/support/reports", Icon: FileText },
    { label: "Escalations", href: "/support/escalations", Icon: AlertTriangle },
    { label: "Settings", href: "/support/settings", Icon: Settings },
  ];

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

  const toggleTheme = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-purple-50 to-violet-50 dark:from-slate-950 dark:to-purple-950">
      {/* Sidebar */}
      <SupportSidebar className="hidden lg:flex" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <SupportSidebar className="relative z-50" />
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
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
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
                  placeholder="Search tickets..."
                  className="pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/10 dark:to-violet-900/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 w-64"
                />
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  5
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
                        <AvatarImage src={userProfile.avatar} alt={`${userProfile.first_name} ${userProfile.last_name}` || 'User'} />
                      )}
                      <AvatarFallback className="bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm">
                        {userProfile?.first_name?.charAt(0) || 'SP'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{userProfile?.first_name && userProfile?.last_name ? `${userProfile.first_name} ${userProfile.last_name}` : 'Support Team'}</p>
                      <p className="w-[200px] truncate text-sm text-slate-600 dark:text-slate-400">
                        {userProfile?.email || 'support@team.com'}
                      </p>
                      <p className="text-xs text-purple-600 font-medium">
                        Support Agent
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/support/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => {
                      authApi.logout();
                      window.location.href = "/support/login";
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        {/* Mobile bottom navigation */}
        {typeof document !== "undefined" &&
          createPortal(
            (
              <nav
                className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/40 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/60"
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                aria-label="Support mobile navigation"
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
                                ? "text-purple-600 dark:text-purple-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                active ? "" : "opacity-80"
                              }`}
                            />
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
