import { ReactNode } from "react";
import ClientSidebar from "./ClientSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, Settings, Menu, Moon, Sun, Monitor } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

interface ClientLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function ClientLayout({ 
  children, 
  title = "Client Dashboard",
  description = "Manage your funding journey and track progress"
}: ClientLayoutProps) {
  const { userProfile } = useAuthContext();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <ClientSidebar
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />
      
      {/* Main Content */}
      <div className="flex-1 transition-all duration-300 ease-in-out lg:ml-64">
        {/* Top Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-border/40 dark:border-slate-700 px-6 py-4 sticky top-0 z-40">
          <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile: open sidebar */}
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex lg:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 w-64 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/40"
                />
              </div>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                      2
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notifications
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">2</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex flex-col items-start p-3 cursor-default">
                    <div className="font-medium">Profile updated</div>
                    <div className="text-xs text-muted-foreground">Your personal information was saved.</div>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start p-3 cursor-default">
                    <div className="font-medium">Welcome</div>
                    <div className="text-xs text-muted-foreground">Thanks for using the client portal.</div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                      <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
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
                    <Link to="/member/settings">
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
                        window.location.href = "/member/login";
                      } catch (error) {
                        console.error("Logout error:", error);
                        // Even if API call fails, clear tokens and redirect
                        localStorage.removeItem('token');
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('userRole');
                        localStorage.removeItem('userId');
                        localStorage.removeItem('userName');
                        window.location.href = "/member/login";
                      }
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <div className="max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
