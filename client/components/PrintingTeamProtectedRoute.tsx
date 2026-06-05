import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi } from "@/lib/api";
import LoadingScreen from "./LoadingScreen";

interface PrintingTeamProtectedRouteProps {
  children: ReactNode;
}

export default function PrintingTeamProtectedRoute({ children }: PrintingTeamProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        const response = await authApi.verifyToken();

        if (response.data?.valid && response.data?.user) {
          const user = response.data.user;

          if (user.role === "printing_team") {
            setIsAuthenticated(true);
            localStorage.setItem("userRole", user.role);
            localStorage.setItem("userId", user.id.toString());
            localStorage.setItem(
              "userName",
              `${user.first_name} ${user.last_name}`.trim()
            );
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [location.pathname]);

  if (isAuthenticated === null) {
    return <LoadingScreen message="Verifying access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
