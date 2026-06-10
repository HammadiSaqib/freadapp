import { useState, useEffect } from 'react';
import { authApi, billingApi, superAdminApi, getAuthToken } from '@/lib/api';

interface PagePermissions {
  hasPermission: (pageId: string) => boolean;
  allowedPages: string[];
  isLoading: boolean;
  error?: string;
  refetch: () => void;
}

interface PagePermissionsState {
  allowedPages: string[];
  currentRole: string | null;
  isLoading: boolean;
  error?: string;
  hasResolved: boolean;
}

// 定义所有可用的页面权限
export const AVAILABLE_PAGES = [
  { id: 'dashboard', name: 'Dashboard', path: '/dashboard' },
  { id: 'clients', name: 'Clients', path: '/clients' },
  { id: 'employees', name: 'Employees', path: '/employees' },
  { id: 'reports', name: 'Reports', path: '/reports' },
  { id: 'credit-report', name: 'Credit Report', path: '/credit-report' },
  { id: 'credit-reports-scraper', name: 'Credit Reports Scraper', path: '/credit-reports/scraper' },
  { id: 'credit-reports-scraper-logs', name: 'Scraper Logs', path: '/credit-reports/scraper-logs' },
  { id: 'disputes', name: 'Disputes', path: '/disputes' },
  { id: 'ai-coach', name: 'AI Coach', path: '/ai-coach' },
  { id: 'school', name: 'School', path: '/school' },
  { id: 'analytics', name: 'Analytics', path: '/analytics' },
  { id: 'affiliate', name: 'Affiliate', path: '/affiliate' },
  { id: 'affiliate-management', name: 'Affiliate Management', path: '/affiliate-management' },
  { id: 'compliance', name: 'Compliance', path: '/compliance' },
  { id: 'automation', name: 'Automation', path: '/automation' },
  { id: 'settings', name: 'Settings', path: '/settings' },
  { id: 'support', name: 'Support', path: '/support' },
  { id: 'subscription', name: 'Subscription', path: '/subscription' },
  { id: 'feature-requests', name: 'Feature Requests', path: '/admin/feature-requests' },
  { id: 'score-machine-elite', name: 'Fread App Elite', path: '/score-machine-elite' },
  { id: 'score-machine-basic', name: 'Fread App Basic', path: '/score-machine-basic' }
];

// 根据路径获取页面ID
export const getPageIdFromPath = (path: string): string | null => {
  // 处理动态路由，如 /credit-report/:clientId
  if (path.startsWith('/credit-report/') && path !== '/credit-report') {
    return 'credit-report';
  }
  
  const page = AVAILABLE_PAGES.find(p => p.path === path);
  return page?.id || null;
};

const ANONYMOUS_PAGE_PERMISSIONS_KEY = '__anonymous__';
const DEFAULT_PAGE_PERMISSIONS_STATE: PagePermissionsState = {
  allowedPages: [],
  currentRole: null,
  isLoading: false,
  error: undefined,
  hasResolved: false,
};

const pagePermissionsCache = new Map<string, PagePermissionsState>();
const pagePermissionsRequests = new Map<string, Promise<void>>();
const pagePermissionsListeners = new Set<() => void>();

const getPagePermissionsCacheKey = () => getAuthToken() || ANONYMOUS_PAGE_PERMISSIONS_KEY;

const getPagePermissionsState = (cacheKey: string): PagePermissionsState => {
  if (cacheKey === ANONYMOUS_PAGE_PERMISSIONS_KEY) {
    return {
      ...DEFAULT_PAGE_PERMISSIONS_STATE,
      hasResolved: true,
    };
  }

  return pagePermissionsCache.get(cacheKey) || {
    ...DEFAULT_PAGE_PERMISSIONS_STATE,
    isLoading: true,
  };
};

const arePermissionListsEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
};

const isPagePermissionsStateEqual = (
  left: PagePermissionsState,
  right: PagePermissionsState,
) => (
  left.currentRole === right.currentRole &&
  left.isLoading === right.isLoading &&
  left.error === right.error &&
  left.hasResolved === right.hasResolved &&
  arePermissionListsEqual(left.allowedPages, right.allowedPages)
);

const notifyPagePermissionsListeners = () => {
  pagePermissionsListeners.forEach((listener) => listener());
};

const updatePagePermissionsCache = (
  cacheKey: string,
  updater: PagePermissionsState | ((current: PagePermissionsState) => PagePermissionsState),
) => {
  if (cacheKey === ANONYMOUS_PAGE_PERMISSIONS_KEY) {
    return;
  }

  const current = getPagePermissionsState(cacheKey);
  const next = typeof updater === 'function' ? updater(current) : updater;

  if (isPagePermissionsStateEqual(current, next)) {
    return;
  }

  pagePermissionsCache.set(cacheKey, next);
  notifyPagePermissionsListeners();
};

const setResolvedPagePermissions = (
  cacheKey: string,
  options: {
    allowedPages: string[];
    currentRole: string | null;
    error?: string;
  },
) => {
  updatePagePermissionsCache(cacheKey, {
    allowedPages: options.allowedPages,
    currentRole: options.currentRole,
    isLoading: false,
    error: options.error,
    hasResolved: true,
  });
};

const fetchPermissionsForCacheKey = async (cacheKey: string, force = false) => {
  if (cacheKey === ANONYMOUS_PAGE_PERMISSIONS_KEY) {
    return;
  }

  const cached = pagePermissionsCache.get(cacheKey);
  if (!force && cached?.hasResolved) {
    return;
  }

  const existingRequest = pagePermissionsRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  updatePagePermissionsCache(cacheKey, (current) => ({
    ...current,
    isLoading: true,
    error: undefined,
  }));

  const request = (async () => {
    try {
      console.log('🚀 usePagePermissions - Starting permission fetch...');

      const profileResponse = await authApi.getProfile();
      const user = profileResponse.data?.user || profileResponse.data;
      const userRole = user?.role;
      const permissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
      const isExempt = !!user?.is_subscription_exempt || (Array.isArray(permissions) && (permissions.includes('subscription_exempt') || permissions.includes('no_subscription_required')));

      console.log('👤 usePagePermissions - User profile response:', profileResponse);
      console.log('👤 usePagePermissions - Parsed user:', user);
      console.log('👤 usePagePermissions - User role:', userRole);
      console.log('👤 usePagePermissions - User permissions:', permissions);
      console.log('👤 usePagePermissions - is_subscription_exempt:', isExempt);

      if (userRole === 'super_admin') {
        console.log('🔑 Super admin detected, granting all permissions');
        setResolvedPagePermissions(cacheKey, {
          allowedPages: AVAILABLE_PAGES.map((page) => page.id),
          currentRole: userRole || null,
        });
        return;
      }

      if (userRole !== 'admin') {
        console.log('👥 Non-admin user, granting all permissions for backward compatibility');
        setResolvedPagePermissions(cacheKey, {
          allowedPages: AVAILABLE_PAGES.map((page) => page.id),
          currentRole: userRole || null,
        });
        return;
      }

      if (isExempt) {
        console.log('✅ Admin marked as subscription-exempt, granting all pages');
        setResolvedPagePermissions(cacheKey, {
          allowedPages: AVAILABLE_PAGES.map((page) => page.id),
          currentRole: userRole || null,
        });
        return;
      }

      console.log('🔍 usePagePermissions - Admin user detected, checking subscription...');
      const subscriptionResponse = await billingApi.getSubscription();
      const subscriptionData = subscriptionResponse.data;
      const actualSubscription = subscriptionData?.subscription;

      console.log('🔍 usePagePermissions - Admin user subscription check:');
      console.log('   - subscriptionResponse:', subscriptionResponse);
      console.log('   - subscriptionData:', subscriptionData);
      console.log('   - actualSubscription:', actualSubscription);
      console.log('   - subscription status:', actualSubscription?.status);

      const normalizedSubStatus = String(actualSubscription?.status || '').trim().toLowerCase();
      if (!actualSubscription || (normalizedSubStatus !== 'active' && normalizedSubStatus !== 'exempt')) {
        console.log('⚠️ Admin user has no active subscription, checking email verification status...');
        console.log('🔍 Subscription data:', actualSubscription);
        console.log('🔍 User email verified:', user?.email_verified);
        console.log('✅ Pre-purchase access - allowing dashboard, subscription, settings, and school');
        console.log('🔍 Setting allowedPages to:', ['dashboard', 'subscription', 'settings', 'school']);

        setResolvedPagePermissions(cacheKey, {
          allowedPages: ['dashboard', 'subscription', 'settings', 'school'],
          currentRole: userRole || null,
        });
        return;
      }

      console.log('✅ usePagePermissions - Admin has active subscription, checking plan permissions...');

      const limit = 100;
      const maxPages = 1000;
      let page = 1;
      let pages = 1;
      const allPlans: any[] = [];

      while (page <= pages && page <= maxPages) {
        const plansResponse = await superAdminApi.getPlans({ page, limit });
        console.log('🔍 Plans response:', plansResponse);
        console.log('🔍 Plans response.data:', plansResponse.data);
        console.log('🔍 Plans response.data.data:', plansResponse.data?.data);

        const plansArray = plansResponse.data?.data || [];
        allPlans.push(...(Array.isArray(plansArray) ? plansArray : []));

        const paginationPages = Number((plansResponse.data as any)?.pagination?.pages);
        pages = !Number.isNaN(paginationPages) && paginationPages > 0 ? paginationPages : 1;
        page += 1;
      }

      const uniquePlans = Array.from(
        new Map(allPlans.map((plan: any) => [String(plan?.id ?? ''), plan])).values()
      ).filter((plan: any) => String(plan?.id ?? '') !== '');

      console.log('🔍 Final plans array:', uniquePlans);
      console.log('🔍 Plans array length:', uniquePlans.length);
      console.log('🔍 Plans array type:', typeof uniquePlans);
      console.log('🔍 Is plans array?', Array.isArray(uniquePlans));

      const subscriptionPlanName = String(actualSubscription.plan_name || '').trim().toLowerCase();
      const userPlan = uniquePlans.find((plan: any) => String(plan?.name || '').trim().toLowerCase() === subscriptionPlanName);

      console.log('🔍 Found user plan:', userPlan?.name, 'with page_permissions:', userPlan?.page_permissions);

      if (userPlan) {
        const planPages: string[] = Array.isArray(userPlan.page_permissions) ? userPlan.page_permissions : [];

        if (planPages.length > 0) {
          const resolvedPermissions = Array.from(
            new Set(['dashboard', 'settings', 'subscription', 'feature-requests', ...planPages])
          );
          console.log('✅ Using plan-defined permissions:', resolvedPermissions);

          setResolvedPagePermissions(cacheKey, {
            allowedPages: resolvedPermissions,
            currentRole: userRole || null,
          });
        } else {
          console.log('⚠️ Plan has no page permissions defined, granting all pages by default');
          setResolvedPagePermissions(cacheKey, {
            allowedPages: AVAILABLE_PAGES.map((pageItem) => pageItem.id),
            currentRole: userRole || null,
          });
        }

        return;
      }

      console.log('⚠️ Could not find plan in plans list but subscription is active — granting all pages (trial / unknown plan)');
      setResolvedPagePermissions(cacheKey, {
        allowedPages: AVAILABLE_PAGES.map((pageItem) => pageItem.id),
        currentRole: userRole || null,
      });
    } catch (error: any) {
      console.error('❌ Error fetching page permissions:', error);

      if (error?.response) {
        console.error('Response error:', error.response.status, error.response.data);
      } else if (error?.request) {
        console.error('Request error:', error.request);
      } else {
        console.error('General error:', error?.message);
      }

      try {
        const profileResponse = await authApi.getProfile();
        const user = profileResponse.data?.user || profileResponse.data;
        const userRole = user?.role;

        if (userRole === 'super_admin') {
          setResolvedPagePermissions(cacheKey, {
            allowedPages: AVAILABLE_PAGES.map((page) => page.id),
            currentRole: userRole || null,
            error: 'Failed to fetch page permissions',
          });
          return;
        }

        if (userRole === 'admin') {
          console.log('⚠️ API error for admin user, restricting to subscription, settings, dashboard, and school');
          setResolvedPagePermissions(cacheKey, {
            allowedPages: ['subscription', 'settings', 'dashboard', 'school'],
            currentRole: userRole || null,
            error: 'Failed to fetch page permissions',
          });
          return;
        }

        setResolvedPagePermissions(cacheKey, {
          allowedPages: ['dashboard', 'subscription'],
          currentRole: userRole || null,
          error: 'Failed to fetch page permissions',
        });
      } catch (profileError) {
        console.error('❌ Failed to get user profile for fallback permissions:', profileError);
        setResolvedPagePermissions(cacheKey, {
          allowedPages: ['subscription'],
          currentRole: null,
          error: 'Failed to fetch page permissions',
        });
      }
    } finally {
      pagePermissionsRequests.delete(cacheKey);
    }
  })();

  pagePermissionsRequests.set(cacheKey, request);
  return request;
};

export const usePagePermissions = (): PagePermissions => {
  const cacheKey = getPagePermissionsCacheKey();
  const [state, setState] = useState<PagePermissionsState>(() => getPagePermissionsState(cacheKey));

  useEffect(() => {
    const syncState = () => {
      setState(getPagePermissionsState(cacheKey));
    };

    syncState();
    pagePermissionsListeners.add(syncState);

    if (cacheKey !== ANONYMOUS_PAGE_PERMISSIONS_KEY && !getPagePermissionsState(cacheKey).hasResolved) {
      void fetchPermissionsForCacheKey(cacheKey);
    }

    return () => {
      pagePermissionsListeners.delete(syncState);
    };
  }, [cacheKey]);

  const hasPermission = (pageId: string): boolean => {
    if (state.currentRole === 'admin' && (pageId === 'dashboard' || pageId === 'subscription' || pageId === 'settings')) {
      return true;
    }
    const hasAccess = state.allowedPages.includes(pageId);
    console.log(`🔍 hasPermission("${pageId}"):`, hasAccess, '| allowedPages:', state.allowedPages);
    return hasAccess;
  };

  const refetch = () => {
    if (cacheKey === ANONYMOUS_PAGE_PERMISSIONS_KEY) {
      return;
    }

    void fetchPermissionsForCacheKey(cacheKey, true);
  };

  return {
    hasPermission,
    allowedPages: state.allowedPages,
    isLoading: state.isLoading,
    error: state.error,
    refetch
  };
};
