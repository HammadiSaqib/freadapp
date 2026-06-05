import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "@/lib/api";
import LoadingScreen from "./LoadingScreen";

interface AffiliateProtectedRouteProps {
  children: ReactNode;
}

export default function AffiliateProtectedRoute({ children }: AffiliateProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const storedRole = localStorage.getItem("userRole");
        
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        // Verify token with backend
        const response = await authApi.verifyToken();
        
        if (response.data?.valid && response.data?.user) {
          const user = response.data.user;

          // Allow affiliate, admin, and super_admin roles
          const allowedRoles = ["affiliate", "admin", "super_admin"];
          if (allowedRoles.includes(user.role)) {
            setIsAuthenticated(true);
            setUserRole(user.role);

            // Update stored user info
            localStorage.setItem("userRole", user.role);
            localStorage.setItem("userId", user.id.toString());
            localStorage.setItem("userName", `${user.first_name} ${user.last_name}`);
          } else {
            setIsAuthenticated(false);
            setUserRole(user.role);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Affiliate auth check failed:", error);
        setIsAuthenticated(false);
        
        // Clear invalid tokens
        localStorage.removeItem("auth_token");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
      }
    };

    checkAuth();
  }, [location.pathname]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return <LoadingScreen message="Verifying affiliate access..." />;
  }

  // Redirect to affiliate login if not authenticated or not allowed role
  if (!isAuthenticated || !["affiliate", "admin", "super_admin"].includes(userRole || "")) {
    return <Navigate to="/affiliate/login" state={{ from: location }} replace />;
  }

  // Render protected content for authenticated affiliate users
  return <>{children}</>;
}