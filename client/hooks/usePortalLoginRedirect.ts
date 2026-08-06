import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { clearStoredAuth } from "@/lib/authStorage";
import { resolveAdminPortalTarget } from "@/lib/adminPortalAccess";
import { getPortalNavigationTarget, type PortalAlias } from "@/lib/hostRouting";

interface UsePortalLoginRedirectOptions {
  allowedRoles: string[];
  redirectPath?: string;
  portalAlias?: PortalAlias;
}

function getSafeRedirectPath(search: string, fallbackPath: string) {
  const redirect = new URLSearchParams(search).get("redirect");

  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return fallbackPath;
  }

  return redirect;
}

export function usePortalLoginRedirect({
  allowedRoles,
  redirectPath = "/dashboard",
  portalAlias,
}: UsePortalLoginRedirectOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const allowedRoleKey = allowedRoles.join("|");
  const resolvedRedirectPath = getSafeRedirectPath(location.search, redirectPath);

  useEffect(() => {
    let cancelled = false;

    const existingToken = window.localStorage.getItem("auth_token");
    if (!existingToken) {
      return;
    }

    const verifyExistingSession = async () => {
      try {
        const response = await authApi.verifyToken();
        const user = response.data?.user;
        const isAllowed = response.data?.valid && user && allowedRoles.includes(user.role);

        if (!isAllowed) {
          clearStoredAuth();
          return;
        }

        if (cancelled) {
          return;
        }

        window.localStorage.setItem("userRole", user.role);
        window.localStorage.setItem("userId", String(user.id));
        window.localStorage.setItem(
          "userName",
          `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        );

        let profile = user;
        try {
          const profileResponse = await authApi.getProfile();
          profile = profileResponse.data?.user || profileResponse.data || user;
        } catch {
          profile = user;
        }

        const target = portalAlias
          ? getPortalNavigationTarget(portalAlias, resolvedRedirectPath)
          : resolveAdminPortalTarget(resolvedRedirectPath, profile);
        if (target.external) {
          window.location.href = target.target;
          return;
        }

        navigate(target.target, { replace: true });
      } catch {
        if (!cancelled) {
          clearStoredAuth();
        }
      }
    };

    void verifyExistingSession();

    return () => {
      cancelled = true;
    };
  }, [allowedRoleKey, navigate, portalAlias, resolvedRedirectPath]);
}