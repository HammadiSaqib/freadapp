import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, getAuthToken } from "@/lib/api";
import { Loader2, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import LoadingScreen from "./LoadingScreen";

interface SuperAdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function SuperAdminProtectedRoute({ children }: SuperAdminProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkSuperAdminAuth = async () => {
      const token = getAuthToken();
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.verifyToken();
        if (response.data?.valid && response.data?.user) {
          // Only a real super admin session is valid on the super-admin portal.
          if (response.data.user.role === 'super_admin') {
            setIsAuthenticated(true);
            setIsSuperAdmin(true);
          } else {
            setIsAuthenticated(false);
            setIsSuperAdmin(false);
            setError(`Access denied: Your role is '${response.data.user.role}' but 'super_admin' is required.`);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error: any) {
        setIsAuthenticated(false);
        setError(error.message || 'Authentication verification failed');
      }
      
      setIsLoading(false);
    };

    checkSuperAdminAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Verifying super admin credentials..." />;
  }

  if (!isAuthenticated) {
    // Redirect to super admin login instead of regular login
    return <Navigate to="/super-admin/login" state={{ from: location }} replace />;
  }

  if (isAuthenticated && isSuperAdmin === false) {
    // User is authenticated but doesn't have super admin privileges
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <div className="max-w-md w-full">
          <Alert className="border-red-500 bg-red-50 text-red-800 mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Access Denied:</strong> {error || 'Super administrator privileges required to access this area.'}
            </AlertDescription>
          </Alert>
          
          <div className="text-center">
            <div className="mb-4 w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Restricted Area</h2>
            <p className="text-white/80 mb-6">This section is exclusively for super administrators.</p>
            
            <div className="space-y-3">
              <Button
                onClick={() => window.location.href = '/super-admin/login'}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              >
                Login as Super Admin
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and has super admin role
  return <>{children}</>;
}