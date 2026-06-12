import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Bell, Search, Settings, Menu, Moon, Sun, Monitor, UserPlus, Crown, Sparkles } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useScoreMachineEliteStatus } from "@/hooks/useScoreMachineEliteStatus";
import AdminContractPrompt from "./AdminContractPrompt";
import AdminNotifications from "./AdminNotifications";
import ScoreMachineElitePrompt from "./ScoreMachineElitePrompt";
import AddClientDialog from "./AddClientDialog";
import { AnimatePresence, motion } from "framer-motion";
import { hasAdminBasicPortalAccess } from "@/lib/adminPortalAccess";
import BasicAdminLayout from "./BasicAdminLayout";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  onAddClient?: () => void;
}

export default function DashboardLayout({
  children,
  title,
  description,
  onAddClient,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { userProfile } = useAuthContext();
  const { hasActiveSubscription } = useSubscriptionStatus();
  const {
    hasScoreMachineEliteAccess,
    hasCompletedEliteAgreement,
    hasEliteAgreementAvailable,
    isEliteActive,
    canCompleteEliteAgreement,
  } = useScoreMachineEliteStatus();
  const [isElitePromptOpen, setIsElitePromptOpen] = useState(false);
  const [isSharedAddClientOpen, setIsSharedAddClientOpen] = useState(false);
  const [showEliteTransition, setShowEliteTransition] = useState(false);
  const [eliteTransitionPhase, setEliteTransitionPhase] = useState<'idle' | 'blackout' | 'dissolve' | 'flash' | 'logo' | 'particles' | 'reveal' | 'welcome' | 'done'>('idle');
  const [eliteZoomIn, setEliteZoomIn] = useState(false);
  const isBasicAdminPortalUser = userProfile?.role === 'admin' && hasAdminBasicPortalAccess(userProfile);
  const usesAdminPortalTheme = userProfile?.role === 'admin' && !isBasicAdminPortalUser;

  // Listen for live elite activation after agreement is signed.
  useEffect(() => {
    const transitionTimeoutIds: ReturnType<typeof setTimeout>[] = [];
    const clearTransitionTimeouts = () => {
      while (transitionTimeoutIds.length > 0) {
        const timeoutId = transitionTimeoutIds.pop();
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };
    const queueTransitionStep = (callback: () => void, delay: number) => {
      transitionTimeoutIds.push(setTimeout(callback, delay));
    };

    const handler = () => {
      clearTransitionTimeouts();
      setShowEliteTransition(true);
      setEliteTransitionPhase('blackout');

      queueTransitionStep(() => setEliteTransitionPhase('dissolve'), 1200);
      queueTransitionStep(() => setEliteTransitionPhase('flash'), 2800);
      queueTransitionStep(() => setEliteTransitionPhase('logo'), 5000);
      queueTransitionStep(() => setEliteTransitionPhase('particles'), 8000);
      queueTransitionStep(() => {
        setEliteTransitionPhase('reveal');
        setEliteZoomIn(true);
      }, 11000);
      queueTransitionStep(() => setEliteTransitionPhase('welcome'), 12000);
      queueTransitionStep(() => {
        setEliteTransitionPhase('done');
        setShowEliteTransition(false);
        window.dispatchEvent(new CustomEvent('elite-show-welcome'));
      }, 15000);
    };

    window.addEventListener('elite-agreement-signed', handler);
    return () => {
      clearTransitionTimeouts();
      window.removeEventListener('elite-agreement-signed', handler);
    };
  }, []);

  const shouldShowEliteNotification =
    canCompleteEliteAgreement &&
    hasScoreMachineEliteAccess &&
    hasEliteAgreementAvailable &&
    !hasCompletedEliteAgreement;
  
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

  useEffect(() => {
    const body = window.document.body;

    if (usesAdminPortalTheme) {
      body.classList.add("admin-portal-theme-active");
    } else {
      body.classList.remove("admin-portal-theme-active");
    }

    return () => {
      body.classList.remove("admin-portal-theme-active");
    };
  }, [usesAdminPortalTheme]);

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

  const handleLayoutAddClient = () => {
    if (isEliteActive || !onAddClient) {
      setIsSharedAddClientOpen(true);
      return;
    }

    onAddClient();
  };

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <BasicAdminLayout onAddClient={userProfile?.role === 'admin' ? handleLayoutAddClient : undefined} title={title}>
        {children}
        <AddClientDialog
          isOpen={isSharedAddClientOpen}
          onClose={() => setIsSharedAddClientOpen(false)}
        />
      </BasicAdminLayout>
    );
  }

  return (
    <motion.div
      className={`min-h-screen flex ${
        isEliteActive
          ? 'elite-theme admin-portal-shell'
          : isBasicAdminPortalUser
            ? 'bg-[linear-gradient(135deg,#f7fbff_0%,#eef7f3_52%,#f8fafc_100%)] dark:bg-slate-950'
            : 'admin-portal-shell'
      }`}
      initial={false}
      animate={
        eliteZoomIn
          ? { scale: [0.82, 1.03, 1], opacity: [0, 1, 1] }
          : { scale: 1, opacity: 1 }
      }
      transition={
        eliteZoomIn
          ? { duration: 0.9, ease: [0.22, 1, 0.36, 1], times: [0, 0.7, 1] }
          : { duration: 0 }
      }
      onAnimationComplete={() => {
        if (eliteZoomIn) setEliteZoomIn(false);
      }}
    >
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`lg:block ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 transform transition-transform duration-300 ease-in-out lg:transform-none`}
      >
        <Sidebar onAddClient={userProfile?.role === 'admin' ? handleLayoutAddClient : undefined} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top header */}
        <header className={`sticky top-0 z-30 ${
          isEliteActive
            ? 'elite-navbar'
            : isBasicAdminPortalUser
              ? 'bg-white/88 dark:bg-slate-950/88 backdrop-blur-xl border-b border-sky-100/80 dark:border-slate-800 shadow-sm shadow-sky-100/60 dark:shadow-none'
              : 'admin-portal-header'
        }`}>
          {isEliteActive && <div className="elite-neon-line-thick w-full" />}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              {title && (
                <div>
                  <h1 className={`text-base sm:text-xl font-semibold truncate ${
                    isEliteActive
                      ? 'elite-gradient-text'
                      : isBasicAdminPortalUser
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'gradient-text-primary'
                  }`}>
                    {title}
                  </h1>
                  {description && (
                    <p className={`hidden sm:block text-sm ${isBasicAdminPortalUser ? 'text-slate-500 dark:text-slate-400' : 'text-muted-foreground'}`}>
                      {description}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-nowrap sm:flex-wrap w-full sm:w-auto ml-auto justify-end">
              {/* The Capsol Elite notification bar */}
              {shouldShowEliteNotification && (
                <button
                  onClick={() => setIsElitePromptOpen(true)}
                  className="hidden sm:flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#155332] via-[#d1a505] to-[#ffb500] hover:from-[#06362d] hover:via-[#155332] hover:to-[#d1a505] shadow-lg hover:shadow-xl hover:shadow-[#d1a505]/25 transition-all duration-300 cursor-pointer group border border-[#d1a505]/30 hover:scale-105"
                >
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white dark:bg-slate-900 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white dark:bg-slate-900" />
                  </span>
                  <Crown className="h-5 w-5 text-white drop-shadow-sm" />
                  <span className="text-sm font-bold text-white tracking-wide whitespace-nowrap drop-shadow-sm">
                    🔥 Elite Access Ready
                  </span>
                  <span className="bg-white dark:bg-slate-900/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    Active
                  </span>
                  <Sparkles className="h-4 w-4 text-[#dee2b1] group-hover:text-white" />
                </button>
              )}
              {/* Mobile Elite notification */}
              {shouldShowEliteNotification && (
                <button
                  onClick={() => setIsElitePromptOpen(true)}
                  className="sm:hidden flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#155332] via-[#d1a505] to-[#ffb500] shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Crown className="h-4 w-4 text-white" />
                  <span className="text-xs font-bold text-white whitespace-nowrap">Elite</span>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white dark:bg-slate-900 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white dark:bg-slate-900" />
                  </span>
                </button>
              )}

              {/* Search */}
              <div className="hidden md:block relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                  isEliteActive ? 'text-[#155332] dark:text-[#dee2b1]' : isBasicAdminPortalUser ? 'text-sky-500' : 'text-muted-foreground'
                }`} />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className={
                    isEliteActive
                      ? 'elite-navbar-search pl-10 pr-4 py-2 w-80 text-sm focus:outline-none'
                      : isBasicAdminPortalUser
                        ? 'pl-10 pr-4 py-2 w-72 text-sm border border-sky-100 rounded-lg bg-white/85 text-slate-700 placeholder:text-slate-400 shadow-inner shadow-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:shadow-none'
                        : 'admin-portal-search pl-10 pr-4 py-2 w-80 text-sm'
                  }
                />
              </div>

              {/* Notifications */}
              <AdminNotifications open={notificationsOpen} onOpenChange={setNotificationsOpen} />

              {/* Admin Onboarding Agreement Prompt */}
              <AdminContractPrompt />

              {/* Theme Switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={isEliteActive ? 'elite-navbar-btn' : isBasicAdminPortalUser ? 'hover:bg-sky-50 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white' : 'hover:bg-gradient-soft text-slate-700 dark:text-slate-300 dark:text-slate-200 hover:text-slate-900 dark:text-white dark:hover:text-white'}
                  >
                    {theme === "light" ? (
                      <Sun className="h-4 w-4" />
                    ) : theme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
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

              {/* Add Client - icon on mobile, full button on larger screens */}
              {userProfile?.role === 'admin' && (
                <>
                  {/* Mobile icon-only, placed next to theme switcher */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`sm:hidden ${isEliteActive ? 'elite-navbar-btn' : isBasicAdminPortalUser ? 'hover:bg-sky-50 text-slate-600 dark:text-slate-300 dark:hover:bg-slate-800' : 'hover:bg-gradient-soft'}`}
                    onClick={handleLayoutAddClient}
                    aria-label={isBasicAdminPortalUser ? "Add Report" : "Add New Client"}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>

                  {/* Desktop/full button */}
                  <Button
                    variant="default"
                    size="sm"
                    className={`hidden sm:inline-flex ${isEliteActive ? 'elite-navbar-add-btn' : isBasicAdminPortalUser ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm shadow-slate-200 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 dark:shadow-none' : 'gradient-primary hover:opacity-90'}`}
                    onClick={handleLayoutAddClient}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {isEliteActive ? 'Add to CRM' : isBasicAdminPortalUser ? 'Add Report' : 'Add New Client'}
                  </Button>
                </>
              )}

              {/* Upgrade to Pro - Crown Hover Card */}
              {!hasActiveSubscription && !isBasicAdminPortalUser && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={isEliteActive ? 'elite-navbar-btn' : 'hover:bg-gradient-soft text-slate-700 dark:text-slate-300 dark:text-slate-200 hover:text-slate-900 dark:text-white dark:hover:text-white'}
                    >
                      <Crown className="h-4 w-4 text-[#d1a505]" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent align="end" className="w-80">
                    <div className="flex items-start space-x-3">
                      <Crown className="h-5 w-5 text-[#d1a505] mt-0.5" />
                      <div className="space-y-2">
                        <div className="text-sm font-semibold">Upgrade to Pro</div>
                        <p className="text-xs text-muted-foreground">Unlock premium benefits:</p>
                        <ul className="text-xs list-disc pl-4 space-y-1">
                          <li>Advanced analytics and reporting</li>
                          <li>Priority support</li>
                          <li>Higher commissions</li>
                          <li>Exclusive marketing materials</li>
                        </ul>
                        <Link to="/subscription" className="block">
                          <Button
                            size="sm"
                            className="mt-2 w-full bg-gradient-to-r from-[#155332] to-[#d1a505] hover:from-[#06362d] hover:to-[#ffb500] text-white"
                          >
                            Upgrade Now
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}

              {/* Settings */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={isEliteActive ? 'elite-navbar-btn' : isBasicAdminPortalUser ? 'hover:bg-sky-50 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white' : 'hover:bg-gradient-soft text-slate-700 dark:text-slate-300 dark:text-slate-200 hover:text-slate-900 dark:text-white dark:hover:text-white'}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="w-full cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setNotificationsOpen(true)}>
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User menu */}
              <div className={`flex items-center space-x-3 pl-3 ${isEliteActive ? 'elite-user-divider' : isBasicAdminPortalUser ? 'border-l border-sky-100 dark:border-slate-800' : 'border-l border-border/40'}`}>
                <div className="text-right hidden sm:block">
                  <div className={`text-sm font-medium ${isEliteActive ? 'text-slate-800 dark:text-slate-100' : ''}`}>
                    {userProfile ?
                      `${userProfile.first_name} ${userProfile.last_name}` :
                      'Loading...'
                    }
                  </div>
                  <div className={`text-xs ${isEliteActive ? 'elite-gradient-text font-semibold' : isBasicAdminPortalUser ? 'font-medium text-sky-600 dark:text-sky-300' : 'text-muted-foreground'}`}>
                    {isEliteActive ? 'Elite Account' : isBasicAdminPortalUser ? 'Basic Access' : (userProfile?.role === 'admin' ? 'Admin Account' : 'Pro Account')}
                  </div>
                </div>
                <div className={isEliteActive ? 'elite-avatar-ring' : ''}>
                  <Avatar className="h-8 w-8">
                    {userProfile?.avatar && (
                      <AvatarImage src={userProfile.avatar} alt="Profile" />
                    )}
                    <AvatarFallback className={isEliteActive ? 'bg-gradient-to-br from-[#06362d] to-[#d1a505] text-white' : isBasicAdminPortalUser ? 'bg-slate-900 text-white dark:bg-sky-500 dark:text-slate-950' : 'gradient-primary text-white'}>
                      {userProfile ?
                        `${userProfile.first_name?.[0] || ''}${userProfile.last_name?.[0] || ''}` :
                        'U'
                      }
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-auto ${isEliteActive ? 'elite-page-bg p-6' : isBasicAdminPortalUser ? 'p-4 sm:p-6' : 'p-6'}`}>{children}</main>
      </div>

      {/* The Capsol Elite agreement prompt (moved from sidebar) */}
      <ScoreMachineElitePrompt
        open={isElitePromptOpen}
        onOpenChange={setIsElitePromptOpen}
        onAgreementCompleted={() => {
          // State flip is handled by the event listener with delay so animation covers first.
        }}
      />

      <AddClientDialog
        isOpen={isSharedAddClientOpen}
        onClose={() => setIsSharedAddClientOpen(false)}
      />

      {/* Elite Activation Cinematic Full-Page Transition */}
      <AnimatePresence>
        {showEliteTransition && (
          <motion.div
            key="elite-transition-overlay"
            className="fixed inset-0 z-[9999]"
            style={{ pointerEvents: eliteTransitionPhase === 'done' ? 'none' : 'auto' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1.0 } }}
          >
            {eliteTransitionPhase === 'blackout' && (
              <motion.div className="absolute inset-0 bg-[#031b17]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.0, ease: 'easeInOut' }}
              >
                <motion.div className="absolute inset-0" style={{
                  backgroundImage: 'linear-gradient(rgba(209,165,5,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(21,83,50,0.04) 1px, transparent 1px)',
                  backgroundSize: '40px 40px'
                }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.7 }} />
                <motion.div className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.2, times: [0, 0.3, 0.7, 1] }}
                >
                  <span className="text-xs font-mono tracking-[0.3em] uppercase text-[#d1a505]/70">
                    Initializing Elite Protocol...
                  </span>
                </motion.div>
              </motion.div>
            )}

            {eliteTransitionPhase === 'dissolve' && (
              <motion.div className="absolute inset-0 bg-[#031b17]">
                {Array.from({ length: 12 }).map((_, index) => (
                  <motion.div key={`glitch-${index}`} className="absolute left-0 right-0"
                    style={{
                      height: 2 + Math.random() * 8,
                      top: `${(index / 12) * 100}%`,
                      background: `linear-gradient(90deg, transparent ${Math.random() * 30}%, rgba(209,165,5,${0.1 + Math.random() * 0.3}) ${30 + Math.random() * 40}%, rgba(21,83,50,${0.1 + Math.random() * 0.2}) ${70 + Math.random() * 20}%, transparent 100%)`,
                    }}
                    initial={{ x: 0, opacity: 0 }}
                    animate={{ x: [-200, 200, -100, 150, 0], opacity: [0, 1, 1, 0.5, 0] }}
                    transition={{ delay: index * 0.1, duration: 1.2, ease: 'easeOut' }}
                  />
                ))}
                {Array.from({ length: 20 }).map((_, index) => (
                  <motion.div key={`noise-${index}`} className="absolute"
                    style={{
                      width: 20 + Math.random() * 100,
                      height: 4 + Math.random() * 20,
                      left: `${Math.random() * 90}%`,
                      top: `${Math.random() * 90}%`,
                      background: ['rgba(209,165,5,0.18)', 'rgba(21,83,50,0.16)', 'rgba(222,226,177,0.12)'][index % 3],
                    }}
                    initial={{ opacity: 0, scaleX: 0 }}
                    animate={{ opacity: [0, 1, 0], scaleX: [0, 1, 0] }}
                    transition={{ delay: 0.2 + Math.random() * 0.8, duration: 0.4 + Math.random() * 0.4 }}
                  />
                ))}
                <motion.div className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <div className="text-center">
                    <motion.div className="text-lg font-mono tracking-[0.2em] uppercase text-[#dee2b1]/80"
                      animate={{ opacity: [1, 0.3, 1, 0.5, 1] }}
                      transition={{ duration: 1.0, repeat: 1 }}
                    >
                      ⚡ System Upgrading ⚡
                    </motion.div>
                    <motion.div className="mt-3 h-1 w-48 mx-auto rounded-full overflow-hidden bg-slate-800">
                      <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #155332, #d1a505, #ffb500)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.4, ease: 'easeInOut' }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {eliteTransitionPhase === 'flash' && (
              <motion.div className="absolute inset-0 bg-[#031b17]">
                {[0, 0.3, 0.7].map((delay, index) => (
                  <motion.div key={`scan-${index}`} className="absolute left-0 right-0"
                    style={{
                      height: index === 1 ? 3 : 2,
                      background: ['linear-gradient(90deg, #dee2b1, #d1a505, #155332, #dee2b1)', 'linear-gradient(90deg, #ffb500, #d1a505, #155332)', 'linear-gradient(90deg, #dee2b1, #155332, #d1a505)'][index],
                      boxShadow: `0 0 20px ${['#d1a505', '#155332', '#dee2b1'][index]}`,
                    }}
                    initial={{ top: '-4px', opacity: 0.9 }}
                    animate={{ top: '100vh', opacity: [0.9, 1, 1, 0.5] }}
                    transition={{ delay, duration: 1.2, ease: 'easeIn' }}
                  />
                ))}
                {[0, 0.3, 0.7].map((delay, index) => (
                  <motion.div key={`glow-${index}`} className="absolute left-0 right-0 h-60"
                    style={{ background: `linear-gradient(180deg, ${['rgba(209,165,5,0.2)', 'rgba(21,83,50,0.16)', 'rgba(222,226,177,0.14)'][index]} 0%, transparent 100%)` }}
                    initial={{ top: '-240px' }}
                    animate={{ top: '100vh' }}
                    transition={{ delay, duration: 1.2, ease: 'easeIn' }}
                  />
                ))}
                {Array.from({ length: 30 }).map((_, index) => (
                  <motion.div key={`rain-${index}`} className="absolute text-[10px] font-mono leading-tight"
                    style={{
                      left: `${(index / 30) * 100}%`,
                      color: ['#d1a50540', '#15533235', '#ffb50030', '#dee2b130'][index % 4],
                      writingMode: 'vertical-rl',
                    }}
                    initial={{ top: -200, opacity: 0 }}
                    animate={{ top: '110vh', opacity: [0, 0.6, 0.6, 0] }}
                    transition={{ delay: Math.random() * 1.5, duration: 1.5 + Math.random(), ease: 'linear' }}
                  >
                    {Array.from({ length: 15 }).map(() => String.fromCharCode(0x30A0 + Math.random() * 96)).join('')}
                  </motion.div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div className="w-32 h-32 rounded-full border-2"
                    style={{ borderColor: 'rgba(209,165,5,0.4)', boxShadow: '0 0 60px rgba(209,165,5,0.28), inset 0 0 30px rgba(21,83,50,0.18)' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.6] }}
                    transition={{ delay: 0.8, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.div className="absolute w-20 h-20 rounded-full border"
                    style={{ borderColor: 'rgba(21,83,50,0.5)', boxShadow: '0 0 40px rgba(21,83,50,0.35)' }}
                    initial={{ scale: 0, opacity: 0, rotate: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8], rotate: 180 }}
                    transition={{ delay: 1.0, duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </motion.div>
            )}

            {eliteTransitionPhase === 'logo' && (
              <motion.div className="absolute inset-0 bg-[#031b17]"
                initial={{ opacity: 1 }} animate={{ opacity: 1 }}
              >
                {Array.from({ length: 60 }).map((_, index) => (
                  <motion.div key={`ambient-${index}`} className="absolute rounded-full"
                    style={{
                      width: 1 + Math.random() * 3,
                      height: 1 + Math.random() * 3,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: ['#d1a505', '#155332', '#ffb500', '#dee2b1'][index % 4],
                    }}
                    animate={{ opacity: [0, 0.6, 0], scale: [0, 1, 0] }}
                    transition={{ delay: Math.random() * 2.5, duration: 1 + Math.random() * 1.5, repeat: 1, repeatType: 'loop' }}
                  />
                ))}
                <motion.div className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="text-center relative">
                    <motion.div className="absolute -inset-20 rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(209,165,5,0.18) 0%, rgba(21,83,50,0.1) 40%, transparent 70%)' }}
                      animate={{ scale: [0.8, 1.1, 0.9, 1.05, 1], opacity: [0, 1, 0.8, 1, 0.9] }}
                      transition={{ duration: 2.5, ease: 'easeInOut' }}
                    />
                    <motion.div className="text-4xl sm:text-6xl font-black tracking-tight relative"
                      style={{ background: 'linear-gradient(135deg, #dee2b1 0%, #d1a505 50%, #155332 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 30px rgba(209,165,5,0.38))' }}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                    >
                      THE CAPSOL
                    </motion.div>
                    <motion.div className="text-6xl sm:text-9xl font-black tracking-[0.2em] mt-2 relative"
                      style={{ background: 'linear-gradient(135deg, #dee2b1 0%, #ffb500 30%, #d1a505 60%, #155332 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 50px rgba(209,165,5,0.32)) drop-shadow(0 0 100px rgba(21,83,50,0.22))' }}
                      initial={{ opacity: 0, scale: 0.5, letterSpacing: '0em' }}
                      animate={{ opacity: 1, scale: 1, letterSpacing: '0.2em' }}
                      transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      ELITE
                    </motion.div>
                    <motion.div className="mt-6 h-1 mx-auto rounded-full"
                      style={{ background: 'linear-gradient(90deg, transparent, #dee2b1, #d1a505, #ffb500, #155332, transparent)', boxShadow: '0 0 20px rgba(209,165,5,0.45)' }}
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 400, opacity: 1 }}
                      transition={{ delay: 1.2, duration: 0.8 }}
                    />
                    <motion.p className="mt-6 text-base sm:text-lg font-medium text-[#dee2b1]/90 tracking-[0.3em] uppercase"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.6, duration: 0.6 }}
                    >
                      ✦ Welcome to the Elite ✦
                    </motion.p>
                    <motion.p className="mt-2 text-sm text-[#d1a505]/60 tracking-widest"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.0, duration: 0.5 }}
                    >
                      Your dashboard is transforming...
                    </motion.p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {eliteTransitionPhase === 'particles' && (
              <motion.div className="absolute inset-0 bg-[#031b17]"
                initial={{ opacity: 1 }} animate={{ opacity: 1 }}
              >
                <motion.div className="absolute inset-0 flex items-center justify-center">
                  <motion.div className="w-4 h-4 rounded-full bg-white dark:bg-slate-900"
                    style={{ boxShadow: '0 0 100px 60px rgba(255,255,255,0.75), 0 0 200px 120px rgba(209,165,5,0.35)' }}
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: [0, 8, 30], opacity: [1, 0.8, 0] }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </motion.div>
                {Array.from({ length: 80 }).map((_, index) => {
                  const angle = (index / 80) * Math.PI * 2;
                  const distance = 300 + Math.random() * 400;
                  const size = 2 + Math.random() * 6;
                  const themedColor = ['#d1a505', '#155332', '#ffb500', '#dee2b1', '#ffffff'][index % 5];
                  return (
                    <motion.div key={`burst-${index}`} className="absolute rounded-full"
                      style={{
                        width: size,
                        height: size,
                        left: '50%',
                        top: '50%',
                        background: themedColor,
                        boxShadow: `0 0 ${6 + Math.random() * 12}px ${themedColor}`,
                      }}
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Math.cos(angle) * distance,
                        y: Math.sin(angle) * distance,
                        opacity: [1, 1, 0],
                        scale: [1, 1.5, 0],
                      }}
                      transition={{ delay: Math.random() * 0.3, duration: 1.5 + Math.random() * 1, ease: 'easeOut' }}
                    />
                  );
                })}
                {[0, 0.2, 0.5].map((delay, index) => (
                  <motion.div key={`shock-${index}`}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                    style={{ borderColor: ['rgba(209,165,5,0.6)', 'rgba(21,83,50,0.45)', 'rgba(222,226,177,0.35)'][index] }}
                    initial={{ width: 0, height: 0, opacity: 1 }}
                    animate={{ width: [0, 800], height: [0, 800], opacity: [1, 0] }}
                    transition={{ delay, duration: 1.5, ease: 'easeOut' }}
                  />
                ))}
                <motion.div className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 3 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [3, 1, 1, 0.8] }}
                  transition={{ delay: 1.0, duration: 2.0, times: [0, 0.3, 0.7, 1] }}
                >
                  <div className="text-center">
                    <div className="text-3xl sm:text-5xl font-black tracking-[0.3em] uppercase"
                      style={{ background: 'linear-gradient(135deg, #dee2b1, #d1a505, #ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(209,165,5,0.45))' }}
                    >
                      ✦ ACTIVATED ✦
                    </div>
                    <div className="mt-2 text-sm text-[#dee2b1]/70 tracking-widest">
                      The Capsol Elite is now live
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {eliteTransitionPhase === 'reveal' && (
              <motion.div className="absolute inset-0"
                initial={{ opacity: 1 }} animate={{ opacity: 0 }}
                transition={{ duration: 2.5, ease: 'easeOut' }}
              >
                <motion.div className="absolute inset-0 bg-[#050510]"
                  initial={{ opacity: 1 }} animate={{ opacity: 0 }}
                  transition={{ duration: 2.0, ease: 'easeInOut' }}
                />
                {Array.from({ length: 50 }).map((_, index) => (
                  <motion.div key={`final-${index}`} className="absolute rounded-full"
                    style={{
                      width: 2 + Math.random() * 4,
                      height: 2 + Math.random() * 4,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      background: ['#d1a505', '#155332', '#ffb500', '#dee2b1'][index % 4],
                      boxShadow: `0 0 ${6 + Math.random() * 10}px ${['#d1a505', '#155332', '#ffb500', '#dee2b1'][index % 4]}`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 2, 0], y: -40 - Math.random() * 80 }}
                    transition={{ delay: Math.random() * 1.5, duration: 1.0 + Math.random() * 0.5, ease: 'easeOut' }}
                  />
                ))}
                <motion.div className="absolute inset-3 rounded-2xl"
                  style={{ boxShadow: '0 0 60px rgba(209,165,5,0.38), inset 0 0 60px rgba(21,83,50,0.22), 0 0 120px rgba(222,226,177,0.18)', border: '2px solid rgba(209,165,5,0.52)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.5, 0] }}
                  transition={{ duration: 2.0, ease: 'easeOut' }}
                />
              </motion.div>
            )}

            {eliteTransitionPhase === 'welcome' && (
              <motion.div className="absolute inset-x-0 top-0 flex justify-center pt-20 pointer-events-none"
                initial={{ opacity: 0, y: -60 }}
                animate={{ opacity: [0, 1, 1, 0], y: [-60, 0, 0, -30] }}
                transition={{ duration: 3.0, times: [0, 0.15, 0.75, 1], ease: 'easeOut' }}
              >
                <div className="px-8 py-4 rounded-2xl border border-[#d1a505]/30"
                  style={{ background: 'linear-gradient(135deg, rgba(3,27,23,0.95), rgba(21,83,50,0.94))', boxShadow: '0 0 40px rgba(209,165,5,0.24), 0 0 80px rgba(21,83,50,0.18), 0 20px 60px rgba(0,0,0,0.5)' }}
                >
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-black tracking-wide"
                      style={{ background: 'linear-gradient(135deg, #dee2b1, #d1a505, #ffb500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                    >
                      🎉 Welcome to The Capsol Elite!
                    </div>
                    <div className="mt-1 text-sm text-[#dee2b1]/70">
                      Your dashboard has been upgraded with premium features
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
