import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, getAuthToken } from "@/lib/api";
import { Loader2, DollarSign, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import LoadingScreen from "./LoadingScreen";

interface FundingManagerProtectedRouteProps {
  children: React.ReactNode;
}

export default function FundingManagerProtectedRoute({ children }: FundingManagerProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const verifyFundingManagerAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        const response = await authApi.verifyToken();
        if (response.data.valid && response.data.user) {
          const user = response.data.user;
          
          // Check if user has funding manager role
          if (user.role === 'funding_manager') {
            setIsAuthenticated(true);
            setUserRole(user.role);
          } else {
            setError(`Access denied. This area is restricted to Funding Managers only. Your role: ${user.role}`);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error: any) {
        console.error("Funding Manager auth verification failed:", error);
        setError(error.response?.data?.message || "Authentication verification failed");
        setIsAuthenticated(false);
      }
    };

    verifyFundingManagerAuth();
  }, []);

  // Show loading state
  if (isAuthenticated === null) {
    return <LoadingScreen message="Verifying Funding Manager Access..." />;
  }

  // Show error state for wrong role
  if (!isAuthenticated && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl mb-6 mx-auto">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Access Restricted
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Funding Manager credentials required
            </p>
          </div>

          <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button 
              onClick={() => window.location.href = "/funding-manager/login"}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Go to Funding Manager Login
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/login"}
              className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Regular User Login
            </Button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need access? Contact your system administrator to request Funding Manager privileges.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/funding-manager/login" state={{ from: location }} replace />;
  }

  // Render protected content
  return <>{children}</>;
}