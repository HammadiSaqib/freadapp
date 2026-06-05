import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { clearStoredAuth } from "@/lib/authStorage";

interface UsePortalLoginRedirectOptions {
  allowedRoles: string[];
  redirectPath?: string;
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
        navigate(resolvedRedirectPath, { replace: true });
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
  }, [allowedRoleKey, navigate, resolvedRedirectPath]);
}