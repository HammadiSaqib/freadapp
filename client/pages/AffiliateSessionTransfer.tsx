import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "@/components/LoadingScreen";
import { authApi } from "@/lib/api";
import {
  consumeCrossSubdomainAuthTransfer,
  clearPortalTransferRedirectPath,
  clearStoredAuth,
  flushTransferDebugQueue,
  getPortalTransferRedirectPath,
  postTransferDebug,
  setPortalReturnContext,
  setPortalTransferRedirectPath,
} from "@/lib/authStorage";
import { getPortalNavigationTarget } from "@/lib/hostRouting";
import { useAuthContext } from "@/contexts/AuthContext";

const DEFAULT_REDIRECT_PATH = "/dashboard";
const ALLOWED_ROLES = ["affiliate", "admin", "super_admin"];

function getSafeRedirectPath(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_REDIRECT_PATH;
  }

  return path;
}

export default function AffiliateSessionTransfer() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuthContext();

  const hydrateDirectHashAuthFallback = () => {
    if (typeof window === "undefined") {
      return false;
    }

    const rawHash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!rawHash || !rawHash.includes("__sm_direct_token=")) {
      return false;
    }

    const directSegments = rawHash
      .split("&")
      .filter((segment) => segment.startsWith("__sm_direct_"));

    if (directSegments.length === 0) {
      return false;
    }

    const params = new URLSearchParams(directSegments.join("&"));
    const token = params.get("__sm_direct_token");
    if (!token) {
      return false;
    }

    const refreshToken = params.get("__sm_direct_refresh");
    const role = params.get("__sm_direct_role");
    const userId = params.get("__sm_direct_user_id");
    const userName = params.get("__sm_direct_user_name");
    const redirectPath = params.get("__sm_direct_redirect");
    const returnLabel = params.get("__sm_direct_return_label");
    const returnTarget = params.get("__sm_direct_return_target");

    window.localStorage.setItem("auth_token", token);
    window.localStorage.setItem("token", token);
    if (refreshToken) {
      window.localStorage.setItem("refresh_token", refreshToken);
    }
    if (role) {
      window.localStorage.setItem("userRole", role);
    }
    if (userId) {
      window.localStorage.setItem("userId", userId);
    }
    if (userName) {
      window.localStorage.setItem("userName", userName);
    }
    if (returnLabel && returnTarget) {
      setPortalReturnContext({
        label: returnLabel,
        targetUrl: returnTarget,
      });
    }
    if (redirectPath && redirectPath.startsWith("/") && !redirectPath.startsWith("//")) {
      setPortalTransferRedirectPath(redirectPath);
    }

    try {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch {
      // Ignore history API failures.
    }

    postTransferDebug("affiliate_direct_hash_applied", {
      tokenApplied: true,
      role,
      userId,
      hasRefreshToken: Boolean(refreshToken),
      redirectPath,
      hasReturnContext: Boolean(returnLabel && returnTarget),
    });

    return true;
  };

  useEffect(() => {
    let cancelled = false;

    const directApplied = hydrateDirectHashAuthFallback();

    // Force consumption here as a safety net in case bootstrap timing or routing
    // prevented main.tsx from consuming the transfer payload.
    postTransferDebug("affiliate_force_consume_before", {
      hashLength: window.location.hash.length,
      windowNameLength: window.name.length,
      tokenExists: Boolean(window.localStorage.getItem("auth_token")),
      directApplied,
    });
    consumeCrossSubdomainAuthTransfer();

    const transferRedirectPath = getSafeRedirectPath(getPortalTransferRedirectPath());
    clearPortalTransferRedirectPath();

    const navigateToAffiliatePath = (pathname: string) => {
      const target = getPortalNavigationTarget("affiliate", pathname);

      if (target.external) {
        window.location.href = target.target;
        return;
      }

      navigate(target.target, { replace: true });
    };

    const finalizeAffiliateSession = async () => {
      await flushTransferDebugQueue();

      const token = window.localStorage.getItem("auth_token");
      postTransferDebug("affiliate_session_start", {
        tokenExists: Boolean(token),
        transferRedirectPath,
        hashLength: window.location.hash.length,
        windowNameLength: window.name.length,
        localStorageKeys: Object.keys(localStorage),
      });

      if (!token) {
        postTransferDebug("affiliate_session_no_token", {
          redirectTo: "/login",
        });
        navigateToAffiliatePath("/login");
        return;
      }

      try {
        postTransferDebug("affiliate_session_verify_call", {});
        const response = await authApi.verifyToken();
        const user = response.data?.user;
        const isAllowed = response.data?.valid && user && ALLOWED_ROLES.includes(user.role);

        postTransferDebug("affiliate_session_verify_result", {
          valid: response.data?.valid,
          user: user ? { id: user.id, role: user.role, email: user.email } : null,
          isAllowed,
        });

        if (!isAllowed) {
          postTransferDebug("affiliate_session_not_allowed", {
            redirectTo: "/login",
          });
          clearStoredAuth();
          if (!cancelled) {
            navigateToAffiliatePath("/login");
          }
          return;
        }

        window.localStorage.setItem("userRole", user.role);
        window.localStorage.setItem("userId", String(user.id));
        window.localStorage.setItem(
          "userName",
          `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        );

        try {
          await refreshProfile();
        } catch {
          // Non-blocking: navigation should proceed even if profile refresh fails.
        }

        postTransferDebug("affiliate_session_success", {
          redirectTo: transferRedirectPath,
        });
        if (!cancelled) {
          navigateToAffiliatePath(transferRedirectPath);
        }
      } catch (err) {
        postTransferDebug("affiliate_session_verify_error", {
          message: err instanceof Error ? err.message : String(err),
        });
        clearStoredAuth();
        if (!cancelled) {
          navigateToAffiliatePath("/login");
        }
      }
    };

    void finalizeAffiliateSession();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <LoadingScreen message="Signing you in to the affiliate portal..." />;
}