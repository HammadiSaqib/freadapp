import { useState, useEffect } from 'react';
import { authApi, billingApi, getAuthToken } from '@/lib/api';

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  planName?: string;
  status?: 'active' | 'pending' | 'expired' | 'cancelled' | 'exempt' | 'trial';
  features?: string[];
  isLoading: boolean;
  refetch?: () => void;
}

interface SubscriptionStatusState {
  hasActiveSubscription: boolean;
  planName?: string;
  status?: 'active' | 'pending' | 'expired' | 'cancelled' | 'exempt' | 'trial';
  features?: string[];
  isLoading: boolean;
  hasResolved: boolean;
}

const ANONYMOUS_SUBSCRIPTION_KEY = '__anonymous__';
const DEFAULT_SUBSCRIPTION_STATUS_STATE: SubscriptionStatusState = {
  hasActiveSubscription: false,
  isLoading: false,
  hasResolved: false,
};

const subscriptionStatusCache = new Map<string, SubscriptionStatusState>();
const subscriptionStatusRequests = new Map<string, Promise<void>>();
const subscriptionStatusListeners = new Set<() => void>();

const getSubscriptionCacheKey = () => getAuthToken() || ANONYMOUS_SUBSCRIPTION_KEY;

const getSubscriptionStatusState = (cacheKey: string): SubscriptionStatusState => {
  if (cacheKey === ANONYMOUS_SUBSCRIPTION_KEY) {
    return {
      ...DEFAULT_SUBSCRIPTION_STATUS_STATE,
      hasResolved: true,
    };
  }

  return subscriptionStatusCache.get(cacheKey) || {
    ...DEFAULT_SUBSCRIPTION_STATUS_STATE,
    isLoading: true,
  };
};

const areFeatureListsEqual = (left?: string[], right?: string[]) => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
};

const isSubscriptionStatusStateEqual = (
  left: SubscriptionStatusState,
  right: SubscriptionStatusState,
) => (
  left.hasActiveSubscription === right.hasActiveSubscription &&
  left.planName === right.planName &&
  left.status === right.status &&
  left.isLoading === right.isLoading &&
  left.hasResolved === right.hasResolved &&
  areFeatureListsEqual(left.features, right.features)
);

const notifySubscriptionStatusListeners = () => {
  subscriptionStatusListeners.forEach((listener) => listener());
};

const updateSubscriptionStatusCache = (
  cacheKey: string,
  updater: SubscriptionStatusState | ((current: SubscriptionStatusState) => SubscriptionStatusState),
) => {
  if (cacheKey === ANONYMOUS_SUBSCRIPTION_KEY) {
    return;
  }

  const current = getSubscriptionStatusState(cacheKey);
  const next = typeof updater === 'function' ? updater(current) : updater;

  if (isSubscriptionStatusStateEqual(current, next)) {
    return;
  }

  subscriptionStatusCache.set(cacheKey, next);
  notifySubscriptionStatusListeners();
};

const setResolvedSubscriptionStatus = (
  cacheKey: string,
  nextState: Omit<SubscriptionStatusState, 'isLoading' | 'hasResolved'>,
) => {
  updateSubscriptionStatusCache(cacheKey, {
    ...nextState,
    isLoading: false,
    hasResolved: true,
  });
};

const fetchSubscriptionStatusForCacheKey = async (cacheKey: string, force = false) => {
  if (cacheKey === ANONYMOUS_SUBSCRIPTION_KEY) {
    return;
  }

  const cached = subscriptionStatusCache.get(cacheKey);
  if (!force && cached?.hasResolved) {
    return;
  }

  const existingRequest = subscriptionStatusRequests.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  updateSubscriptionStatusCache(cacheKey, (current) => ({
    ...current,
    isLoading: true,
  }));

  const request = (async () => {
    try {
      const userProfile = await authApi.getProfile();
      console.log('🔍 useSubscriptionStatus - FULL User profile response:', userProfile);
      console.log('🔍 useSubscriptionStatus - User profile data:', userProfile.data);

      const user = userProfile.data?.user || userProfile.data;
      const userRole: string | undefined = user?.role;
      const permissions: string[] = Array.isArray(user?.permissions) ? user.permissions : [];
      const isExempt = !!user?.is_subscription_exempt || (Array.isArray(permissions) && (permissions.includes('subscription_exempt') || permissions.includes('no_subscription_required')));

      console.log('🔍 useSubscriptionStatus - Parsed user role:', userRole);
      console.log('🔍 useSubscriptionStatus - Parsed permissions:', permissions);
      console.log('🔍 useSubscriptionStatus - is_subscription_exempt:', isExempt);

      if (!userRole) {
        console.error('❌ useSubscriptionStatus - Could not extract user role from profile response');
      }

      if (isExempt) {
        console.log('✅ useSubscriptionStatus - User marked as subscription-exempt; granting active access');
        setResolvedSubscriptionStatus(cacheKey, {
          hasActiveSubscription: true,
          status: 'exempt',
        });
        return;
      }

      if (userRole === 'admin') {
        const subscriptionResponse = await billingApi.getSubscription();
        console.log('🔍 useSubscriptionStatus - Admin subscription response:', subscriptionResponse);
        console.log('🔍 useSubscriptionStatus - Full response data:', JSON.stringify(subscriptionResponse, null, 2));

        if (subscriptionResponse.data && subscriptionResponse.data.subscription) {
          const subscription = subscriptionResponse.data.subscription;
          console.log('🔍 useSubscriptionStatus - Subscription data:', subscription);
          console.log('🔍 useSubscriptionStatus - Subscription status:', subscription.status);
          console.log('🔍 useSubscriptionStatus - Status type:', typeof subscription.status);
          const normalizedStatus = String(subscription.status || '').trim().toLowerCase();
          const isActive = normalizedStatus === 'active' || normalizedStatus === 'exempt';
          console.log('🔍 useSubscriptionStatus - Is active calculation:', isActive);
          console.log('🔍 useSubscriptionStatus - Status comparison:', subscription.status, '===', 'active', '=', subscription.status === 'active');
          console.log('🔍 useSubscriptionStatus - Is active:', isActive);

          setResolvedSubscriptionStatus(cacheKey, {
            hasActiveSubscription: isActive,
            planName: subscription.plan_name,
            status: subscription.status,
            features: Array.isArray(subscription.features) ? subscription.features : undefined,
          });
        } else {
          console.log('🔍 useSubscriptionStatus - No subscription found for admin');
          setResolvedSubscriptionStatus(cacheKey, {
            hasActiveSubscription: false,
            status: 'trial',
          });
        }
        return;
      }

      if (userRole === 'affiliate') {
        const subscriptionResponse = await billingApi.getSubscription();
        console.log('🔍 useSubscriptionStatus - Affiliate subscription response:', subscriptionResponse);

        if (subscriptionResponse.data && subscriptionResponse.data.subscription) {
          const subscription = subscriptionResponse.data.subscription;
          console.log('🔍 useSubscriptionStatus - Affiliate subscription data:', subscription);
          const normalizedStatus = String(subscription.status || '').trim().toLowerCase();
          const isActive = normalizedStatus === 'active' || normalizedStatus === 'exempt';
          console.log('🔍 useSubscriptionStatus - Affiliate is active:', isActive);

          setResolvedSubscriptionStatus(cacheKey, {
            hasActiveSubscription: isActive,
            planName: subscription.plan_name,
            status: subscription.status,
            features: Array.isArray(subscription.features) ? subscription.features : undefined,
          });
        } else {
          console.log('🔍 useSubscriptionStatus - No subscription found for affiliate');
          setResolvedSubscriptionStatus(cacheKey, {
            hasActiveSubscription: false,
            status: 'pending',
          });
        }
        return;
      }

      console.log('🔍 useSubscriptionStatus - Non-admin user, checking subscription anyway');
      const subscriptionResponse = await billingApi.getSubscription();
      console.log('🔍 useSubscriptionStatus - Non-admin subscription response:', subscriptionResponse);

      if (subscriptionResponse.data && subscriptionResponse.data.subscription) {
        const subscription = subscriptionResponse.data.subscription;
        const normalizedStatus = String(subscription.status || '').trim().toLowerCase();
        const isActive = normalizedStatus === 'active' || normalizedStatus === 'exempt';
        console.log('🔍 useSubscriptionStatus - Non-admin subscription found, is active:', isActive);
        setResolvedSubscriptionStatus(cacheKey, {
          hasActiveSubscription: isActive || userRole === 'super_admin' || userRole === 'user',
          planName: subscription.plan_name,
          status: isActive ? 'active' : 'pending',
          features: Array.isArray(subscription.features) ? subscription.features : undefined,
        });
      } else {
        console.log('🔍 useSubscriptionStatus - No subscription found for non-admin user');
        const hasFullAccess = userRole === 'super_admin' || userRole === 'user';
        setResolvedSubscriptionStatus(cacheKey, {
          hasActiveSubscription: hasFullAccess,
          status: hasFullAccess ? 'active' : 'pending',
        });
      }
    } catch (error: any) {
      console.error('Error checking subscription status:', error);

      if (error?.response) {
        console.error('Response error:', error.response.status, error.response.data);
      } else if (error?.request) {
        console.error('Request error:', error.request);
      } else {
        console.error('General error:', error?.message);
      }

      setResolvedSubscriptionStatus(cacheKey, {
        hasActiveSubscription: false,
        status: 'pending',
      });
    } finally {
      subscriptionStatusRequests.delete(cacheKey);
    }
  })();

  subscriptionStatusRequests.set(cacheKey, request);
  return request;
};

export function useSubscriptionStatus(): SubscriptionStatus {
  const cacheKey = getSubscriptionCacheKey();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusState>(() => getSubscriptionStatusState(cacheKey));

  useEffect(() => {
    const syncState = () => {
      setSubscriptionStatus(getSubscriptionStatusState(cacheKey));
    };

    syncState();
    subscriptionStatusListeners.add(syncState);

    if (cacheKey !== ANONYMOUS_SUBSCRIPTION_KEY && !getSubscriptionStatusState(cacheKey).hasResolved) {
      void fetchSubscriptionStatusForCacheKey(cacheKey);
    }

    return () => {
      subscriptionStatusListeners.delete(syncState);
    };
  }, [cacheKey]);

  const refetch = () => {
    if (cacheKey === ANONYMOUS_SUBSCRIPTION_KEY) {
      return;
    }

    void fetchSubscriptionStatusForCacheKey(cacheKey, true);
  };

  return {
    hasActiveSubscription: subscriptionStatus.hasActiveSubscription,
    planName: subscriptionStatus.planName,
    status: subscriptionStatus.status,
    features: subscriptionStatus.features,
    isLoading: subscriptionStatus.isLoading,
    refetch,
  };
}
