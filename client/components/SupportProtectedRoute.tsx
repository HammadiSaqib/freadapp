import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "@/lib/api";
import LoadingScreen from "./LoadingScreen";

interface SupportProtectedRouteProps {
  children: ReactNode;
}

export default function SupportProtectedRoute({ children }: SupportProtectedRouteProps) {
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
          
          // Check if user has support role
          if (user.role === "support") {
            setIsAuthenticated(true);
            setUserRole(user.role);
            
            // Update stored user info
            localStorage.setItem("userRole", user.role);
            localStorage.setItem("userId", user.id.toString());
            localStorage.setItem("userName", `${user.first_name} ${user.last_name}`);
          } else {
            console.log("Access denied: User role is", user.role, "but support required");
            setIsAuthenticated(false);
            setUserRole(user.role);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Support auth check failed:", error);
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
    return <LoadingScreen message="Verifying support access..." />;
  }

  // Redirect to support login if not authenticated or not support role
  if (!isAuthenticated || userRole !== "support") {
    return <Navigate to="/support/login" state={{ from: location }} replace />;
  }

  // Render protected content for authenticated support users
  return <>{children}</>;
}