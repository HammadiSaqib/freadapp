import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi, affiliateApi, billingApi } from "@/lib/api";
import {
  clearPortalReturnContext,
  getPortalReturnContext,
  stageCrossSubdomainAuthTransfer,
} from "@/lib/authStorage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPortalNavigationTarget, isPortalSidebarActive } from "@/lib/hostRouting";
import {
  ArrowLeft,
  DollarSign,
  BarChart3,
  Users,
  Link as LinkIcon,
  Settings,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Activity,
  Briefcase,
  Shield,
  Crown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAuthContext } from "@/contexts/AuthContext";

interface AffiliateSidebarProps {
  className?: string;
}

export default function AffiliateSidebar({ className }: AffiliateSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [affiliateStats, setAffiliateStats] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const { hasActiveSubscription, isLoading } = useSubscriptionStatus();
  const { userProfile } = useAuthContext();
  const portalReturnContext = getPortalReturnContext();
  const adminDashboardTarget = getPortalNavigationTarget("admin", "/dashboard");
  const adminSessionTransferTarget = getPortalNavigationTarget("admin", "/session-transfer");
  const superAdminAffiliatesTarget = getPortalNavigationTarget("super-admin", "/affiliates");
  const isSuperAdminAffiliateReturn = (() => {
    if (!portalReturnContext?.targetUrl) {
      return false;
    }

    try {
      const parsed = new URL(portalReturnContext.targetUrl, window.location.href);
      return (
        parsed.hostname.toLowerCase().startsWith("super-admin.") &&
        parsed.pathname.startsWith("/affiliates")
      );
    } catch {
      return false;
    }
  })();
  const showAffiliateBackLink = Boolean(portalReturnContext) || userProfile?.role === 'admin';
  
  console.log('🔍 AffiliateSidebar - hasActiveSubscription:', hasActiveSubscription);
  console.log('🔍 AffiliateSidebar - isLoading:', isLoading);
  console.log('🔍 AffiliateSidebar - subscription state:', subscription);

  // Calculate progress percentage based on subscription status and affiliate stats
  const calculateProgressPercentage = () => {
    if (isLoading) return 0;
    
    if (!hasActiveSubscription) {
      // For non-subscribers, show progress based on referrals (max 50%)
      const referrals = affiliateStats?.totalReferrals || 0;
      return Math.min((referrals / 10) * 50, 50); // 50% max for free tier
    } else {
      // For subscribers, show higher progress based on performance
      const referrals = affiliateStats?.totalReferrals || 0;
      const commissions = affiliateStats?.totalCommissions || 0;
      
      // Base progress for having subscription (50%)
      let progress = 50;
      
      // Add progress based on referrals (up to 30%)
      progress += Math.min((referrals / 20) * 30, 30);
      
      // Add progress based on commissions (up to 20%)
      progress += Math.min((commissions / 1000) * 20, 20);
      
      return Math.min(progress, 100);
    }
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/affiliate/dashboard",
      icon: BarChart3,
      badge: null,
    },
    {
      name: "Referrals",
      href: "/affiliate/referrals",
      icon: Users,
      badge: affiliateStats?.totalReferrals ? String(affiliateStats.totalReferrals) : null,
    },
    {
      name: "Earnings",
      href: "/affiliate/earnings",
      icon: DollarSign,
      badge: null,
    },
    {
      name: "Referral Links",
      href: "/affiliate/links",
      icon: LinkIcon,
      badge: null,
    },
    {
      name: "Commissions",
      href: "/affiliate/commissions",
      icon: CreditCard,
      badge: null,
    },
    {
      name: "Subscription",
      href: "/affiliate/subscription",
      icon: Crown,
      badge: null,
    },
  ];

  const isActive = (href: string) => isPortalSidebarActive(location.pathname, href, 'affiliate');
  const filteredNavigation = navigation.filter((item) => item.href !== "/affiliate/analytics");

  // Fetch affiliate stats
  useEffect(() => {
    const fetchAffiliateStats = async () => {
      try {
        const response = await affiliateApi.getStats();
        if (response.data && response.data.success) {
          setAffiliateStats(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching affiliate stats:", error);
      }
    };

    fetchAffiliateStats();
  }, []);

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await billingApi.getSubscription();
        if (response.data && response.data.success && response.data.subscription) {
          setSubscription(response.data.subscription);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    };

    fetchSubscription();
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
      navigate("/affiliate/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear token and redirect
      clearPortalReturnContext();
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      navigate("/affiliate/login");
    }
  };

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-64"
      } transition-all duration-300 ease-in-out bg-white dark:bg-slate-900 border-r border-border/40 dark:border-slate-700 flex flex-col shadow-lg max-h-screen overflow-y-auto ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/40 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <Link to="/affiliate/dashboard" className="flex items-center space-x-2">
               <img src="/image.png" alt="Score Machine" className="w-20 h-14" />
              <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                Affiliate Portal
              </span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg mx-auto">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-green-50 dark:hover:bg-green-900/20"
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
              placeholder="Search referrals..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border/40 dark:border-slate-700 rounded-lg bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500/40"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                active
                  ? "bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg"
                  : "text-slate-600 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${
                  active
                    ? "text-white"
                    : "text-slate-600 dark:text-slate-400 group-hover:text-green-600"
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
                          : "border-green-500/20 text-green-600 bg-green-50 dark:bg-green-900/20"
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
                onClick={() => navigate("/affiliate/links")}
                variant="outline"
                size="sm"
                className="w-full justify-start border-green-500/20 text-green-600 hover:black dark:hover:bg-green-900/20"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                Generate Link
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-border/40 dark:border-slate-700 space-y-2">
        {!collapsed && (
          <div className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/10 dark:to-teal-900/10 p-3 rounded-lg mb-3">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Affiliate Status</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {isLoading
                ? 'Checking subscription...'
                : (!hasActiveSubscription
                    ? 'Free Plan - Upgrade to Pro for 20-25% Commission'
                    : (subscription?.plan_name ? `${subscription.plan_name} Plan Active` : 'Active Partner'))}
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
              <div 
                className="bg-gradient-to-r from-green-600 to-teal-600 h-1.5 rounded-full transition-all duration-500 ease-in-out" 
                style={{width: `${calculateProgressPercentage()}%`}}
              ></div>
            </div>
            <div className="mt-3">
              {showAffiliateBackLink ? (
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start items-start gap-2 border-green-500/20 text-green-700 dark:text-green-300 dark:hover:bg-green-900/20 px-3 py-2 h-auto min-h-[40px] whitespace-normal text-left leading-snug"
                    onClick={() => {
                      const fallbackTargetUrl = adminDashboardTarget.external
                        ? adminDashboardTarget.target
                        : null;
                      const directTargetUrl = fallbackTargetUrl;

                      // Use admin session-transfer route so role/profile is re-validated on admin host.
                      const transferTargetUrl = adminSessionTransferTarget.external
                        ? adminSessionTransferTarget.target
                        : directTargetUrl;

                      if (transferTargetUrl) {
                        const transferRedirectPath = (() => {
                          if (!directTargetUrl) {
                            return "/dashboard";
                          }

                          try {
                            const parsed = new URL(directTargetUrl, window.location.href);
                            return parsed.pathname || "/dashboard";
                          } catch {
                            return "/dashboard";
                          }
                        })();

                        const encoded = stageCrossSubdomainAuthTransfer(transferTargetUrl, {
                          transferRedirectPath,
                        });

                        const directParams = new URLSearchParams();
                        const directToken = window.localStorage.getItem('auth_token') || window.localStorage.getItem('token');
                        const directRefresh = window.localStorage.getItem('refresh_token');
                        const directRole = window.localStorage.getItem('userRole');
                        const directUserId = window.localStorage.getItem('userId');
                        const directUserName = window.localStorage.getItem('userName');

                        if (directToken) {
                          directParams.set('__sm_direct_token', directToken);
                        }
                        if (directRefresh) {
                          directParams.set('__sm_direct_refresh', directRefresh);
                        }
                        if (directRole) {
                          directParams.set('__sm_direct_role', directRole);
                        }
                        if (directUserId) {
                          directParams.set('__sm_direct_user_id', directUserId);
                        }
                        if (directUserName) {
                          directParams.set('__sm_direct_user_name', directUserName);
                        }
                        directParams.set('__sm_direct_redirect', transferRedirectPath);

                        clearPortalReturnContext();
                        const hashParts: string[] = [];
                        if (encoded) {
                          hashParts.push(`${"__sm_auth_transfer__:"}${encoded}`);
                        }
                        if (directParams.toString()) {
                          hashParts.push(directParams.toString());
                        }

                        const finalUrl = hashParts.length > 0
                          ? `${transferTargetUrl}#${hashParts.join('&')}`
                          : transferTargetUrl;
                        window.location.href = finalUrl;
                        return;
                      }

                      clearPortalReturnContext();
                      if (adminDashboardTarget.external) {
                        window.location.href = adminDashboardTarget.target;
                        return;
                      }

                      navigate(adminDashboardTarget.target);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="whitespace-normal break-words text-left leading-snug">
                      Back To Admin Dashboard
                    </span>
                  </Button>

                  {isSuperAdminAffiliateReturn && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start items-start gap-2 border-blue-500/20 text-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20 px-3 py-2 h-auto min-h-[40px] whitespace-normal text-left leading-snug"
                      onClick={() => {
                        const target = portalReturnContext?.targetUrl || (superAdminAffiliatesTarget.external
                          ? superAdminAffiliatesTarget.target
                          : null);

                        clearPortalReturnContext();
                        if (target) {
                          window.location.href = target;
                          return;
                        }
                      }}
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="whitespace-normal break-words text-left leading-snug">
                        Back To Super-Admin Dashboard
                      </span>
                    </Button>
                  )}
                </div>
              ) : !isLoading && !hasActiveSubscription ? (
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                  onClick={() => navigate('/affiliate/subscription')}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-green-500/20 text-green-700 dark:text-green-300"
                  onClick={() => navigate('/dashboard')}
                >
                  Go to Admin Dashboard
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-3">
          {!collapsed && (
            <div className="flex-1">
              <Link to="/affiliate/settings" className="w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start hover:black dark:hover:bg-green-900/20"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          )}
          {collapsed && (
            <Link to="/affiliate/settings" className="w-full">
              <Button
                variant="ghost"
                size="sm"
                className="w-full hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        {!collapsed && (
          <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
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
            <div className="flex-1 text-sm">
              <div className="font-medium">
                {userProfile ? 
                  `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || 'Affiliate Partner'
                  : 'Loading...'
                }
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-xs">
                {hasActiveSubscription ? 
                  (subscription?.plan_name ? `${subscription.plan_name} Plan` : 'Active Partner') : 
                  'Free Plan - Upgrade to Pro for 20-25% Commission'
                }
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {/* Dashboard Switcher for Admin users */}
              {userProfile?.role === 'admin' && !showAffiliateBackLink && (
                <Button 
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  title="Go to Admin Dashboard"
                  className="text-xs px-3 py-2 h-8 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white shadow-sm"
                >
                  <Briefcase className="h-4 w-4 mr-1" />
                  Admin
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
