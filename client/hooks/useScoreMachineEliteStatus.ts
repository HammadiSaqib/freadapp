import { useEffect, useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { contractsApi } from "@/lib/api";
import { getAdminPortalMode } from "@/lib/adminPortalAccess";

type EliteStatusCacheEntry = {
  hasAccess: boolean;
  hasCompletedAgreement: boolean;
  hasAgreementAvailable: boolean;
  hasResolvedAgreement: boolean;
  isAgreementLoading: boolean;
  canCompleteAgreement: boolean;
};

type UseScoreMachineEliteStatusResult = {
  hasScoreMachineEliteAccess: boolean;
  hasCompletedEliteAgreement: boolean;
  hasEliteAgreementAvailable: boolean;
  isEliteStatusLoading: boolean;
  isEliteActive: boolean;
  canCompleteEliteAgreement: boolean;
};

const EMPTY_ELITE_STATUS_CACHE: EliteStatusCacheEntry = {
  hasAccess: false,
  hasCompletedAgreement: false,
  hasAgreementAvailable: false,
  hasResolvedAgreement: false,
  isAgreementLoading: false,
  canCompleteAgreement: false,
};

const eliteStatusCache = new Map<string, EliteStatusCacheEntry>();
const eliteStatusRequests = new Map<string, Promise<void>>();
const eliteStatusListeners = new Set<() => void>();

const getEliteStatusCache = (userId: string | null): EliteStatusCacheEntry => {
  if (!userId) {
    return EMPTY_ELITE_STATUS_CACHE;
  }

  return eliteStatusCache.get(userId) ?? EMPTY_ELITE_STATUS_CACHE;
};

const hasEliteStatusChanged = (
  current: EliteStatusCacheEntry,
  next: EliteStatusCacheEntry,
) => (
  current.hasAccess !== next.hasAccess ||
  current.hasCompletedAgreement !== next.hasCompletedAgreement ||
  current.hasAgreementAvailable !== next.hasAgreementAvailable ||
  current.hasResolvedAgreement !== next.hasResolvedAgreement ||
  current.isAgreementLoading !== next.isAgreementLoading ||
  current.canCompleteAgreement !== next.canCompleteAgreement
);

const notifyEliteStatusListeners = () => {
  eliteStatusListeners.forEach((listener) => listener());
};

const updateEliteStatusCache = (
  userId: string,
  updater: EliteStatusCacheEntry | ((current: EliteStatusCacheEntry) => EliteStatusCacheEntry),
) => {
  const current = getEliteStatusCache(userId);
  const next = typeof updater === "function" ? updater(current) : updater;

  if (!hasEliteStatusChanged(current, next)) {
    return;
  }

  eliteStatusCache.set(userId, next);
  notifyEliteStatusListeners();
};

const fetchEliteAgreementStatus = async (userId: string) => {
  const existingRequest = eliteStatusRequests.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  updateEliteStatusCache(userId, (current) => ({
    ...current,
    isAgreementLoading: true,
  }));

  const request = contractsApi.getLatestTsmEliteAgreement()
    .then((response) => {
      const agreement = response?.data?.data;
      const hasAccess = response?.data?.has_access !== false && !!agreement;

      if (!hasAccess) {
        updateEliteStatusCache(userId, {
          ...EMPTY_ELITE_STATUS_CACHE,
          hasResolvedAgreement: true,
        });
        return;
      }

      const isSigned = String(agreement?.status || "").trim().toLowerCase() === "signed";
      const canSign = Boolean(agreement?.can_sign);

      updateEliteStatusCache(userId, {
        hasAccess: true,
        hasCompletedAgreement: isSigned,
        hasAgreementAvailable: !!agreement,
        hasResolvedAgreement: true,
        isAgreementLoading: false,
        canCompleteAgreement: canSign,
      });
    })
    .catch((error: any) => {
      const status = error?.response?.status;

      if (status === 403) {
        updateEliteStatusCache(userId, {
          ...EMPTY_ELITE_STATUS_CACHE,
          hasResolvedAgreement: true,
        });
        return;
      }

      if (status === 404) {
        updateEliteStatusCache(userId, {
          ...EMPTY_ELITE_STATUS_CACHE,
          hasAccess: true,
          hasResolvedAgreement: true,
        });
        return;
      }

      updateEliteStatusCache(userId, (current) => ({
        ...current,
        hasResolvedAgreement: true,
        isAgreementLoading: false,
        canCompleteAgreement: false,
      }));
    })
    .finally(() => {
      eliteStatusRequests.delete(userId);
    });

  eliteStatusRequests.set(userId, request);
  return request;
};

export function useScoreMachineEliteStatus(): UseScoreMachineEliteStatusResult {
  const { userProfile } = useAuthContext();
  const [cachedStatus, setCachedStatus] = useState<EliteStatusCacheEntry>(() => {
    return getEliteStatusCache(userProfile?.id ? String(userProfile.id) : null);
  });

  const userId = userProfile?.id ? String(userProfile.id) : null;
  const canResolveEliteStatus = Boolean(
    userId && ['admin', 'employee', 'user', 'funding_manager'].includes(String(userProfile?.role || ''))
  );
  const portalMode = getAdminPortalMode(userProfile);
  const hasProfileEliteAccess = Boolean(
    userProfile?.role === "super_admin" ||
    portalMode === "elite" ||
    userProfile?.has_score_machine_elite_access ||
    userProfile?.has_direct_score_machine_elite_permission ||
    userProfile?.has_plan_score_machine_elite_access
  );

  useEffect(() => {
    const syncStatus = () => {
      setCachedStatus(getEliteStatusCache(userId));
    };

    syncStatus();
    eliteStatusListeners.add(syncStatus);

    return () => {
      eliteStatusListeners.delete(syncStatus);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !canResolveEliteStatus || !hasProfileEliteAccess) {
      return;
    }

    updateEliteStatusCache(userId, (current) => ({
      ...current,
      hasAccess: true,
      hasResolvedAgreement: current.hasResolvedAgreement && current.hasAccess
        ? current.hasResolvedAgreement
        : false,
    }));
  }, [canResolveEliteStatus, hasProfileEliteAccess, userId]);

  useEffect(() => {
    if (!userId || !canResolveEliteStatus) {
      return;
    }

    if (cachedStatus.hasResolvedAgreement || cachedStatus.isAgreementLoading) {
      return;
    }

    void fetchEliteAgreementStatus(userId);
  }, [
    cachedStatus.hasResolvedAgreement,
    cachedStatus.isAgreementLoading,
    canResolveEliteStatus,
    userId,
  ]);

  const hasScoreMachineEliteAccess = canResolveEliteStatus && (cachedStatus.hasAccess || hasProfileEliteAccess);

  useEffect(() => {
    if (!userId || userProfile?.role !== "admin") {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleAgreementSigned = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        updateEliteStatusCache(userId, (current) => ({
          ...current,
          hasAccess: true,
          hasCompletedAgreement: true,
          hasAgreementAvailable: true,
          hasResolvedAgreement: true,
          isAgreementLoading: false,
          canCompleteAgreement: true,
        }));
      }, 1000);
    };

    window.addEventListener("elite-agreement-signed", handleAgreementSigned);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      window.removeEventListener("elite-agreement-signed", handleAgreementSigned);
    };
  }, [userProfile?.role, userId]);

  const isEliteStatusLoading = canResolveEliteStatus && (
    cachedStatus.isAgreementLoading || !cachedStatus.hasResolvedAgreement
  );
  const hasCompletedEliteAgreement = hasScoreMachineEliteAccess && cachedStatus.hasCompletedAgreement;
  const hasEliteAgreementAvailable = hasScoreMachineEliteAccess && cachedStatus.hasAgreementAvailable;
  const isEliteActive = hasScoreMachineEliteAccess && !isEliteStatusLoading && hasCompletedEliteAgreement;
  const canCompleteEliteAgreement = hasScoreMachineEliteAccess && cachedStatus.canCompleteAgreement;

  return {
    hasScoreMachineEliteAccess,
    hasCompletedEliteAgreement,
    hasEliteAgreementAvailable,
    isEliteStatusLoading,
    isEliteActive,
    canCompleteEliteAgreement,
  };
}
