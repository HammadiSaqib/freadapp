import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, getAuthToken } from "@/lib/api";
import { Loader2, CreditCard } from "lucide-react";
import LoadingScreen from "./LoadingScreen";

interface ClientProtectedRouteProps {
  children: React.ReactNode;
}

const ClientProtectedRoute = ({ children }: ClientProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        console.log('🔐 ClientProtectedRoute: Checking authentication...');
        console.log('🔐 ClientProtectedRoute: Token found:', !!token);
        
        if (!token) {
          console.log('❌ ClientProtectedRoute: No token found, redirecting to login');
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }

        console.log('📡 ClientProtectedRoute: Calling getProfile API...');
        const response = await authApi.getProfile();
        console.log('📡 ClientProtectedRoute: API response:', response);
        console.log('📡 ClientProtectedRoute: Response data:', response.data);
        
        if (response.data?.success && response.data?.user) {
          console.log('✅ ClientProtectedRoute: Profile retrieved successfully');
          console.log('👤 ClientProtectedRoute: User role:', response.data.user.role);
          
          setIsAuthenticated(true);
          // Check if user has client role
          const isClientRole = response.data.user.role === 'client';
          setIsClient(isClientRole);
          
          console.log('🎯 ClientProtectedRoute: Is client role:', isClientRole);
          
          if (isClientRole) {
            console.log('🚀 ClientProtectedRoute: Access granted - user is a client');
          } else {
            console.log('🚫 ClientProtectedRoute: Access denied - user is not a client');
          }
        } else {
          console.log('❌ ClientProtectedRoute: Profile API failed:', response);
          console.log('❌ ClientProtectedRoute: Response data check failed - success:', response.data?.success, 'user:', !!response.data?.user);
          setIsAuthenticated(false);
          setIsClient(false);
        }
      } catch (error) {
        console.error('💥 ClientProtectedRoute: Auth check failed:', error);
        setIsAuthenticated(false);
        setIsClient(false);
      } finally {
        console.log('🏁 ClientProtectedRoute: Auth check completed');
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/member/login" state={{ from: location }} replace />;
  }

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <CreditCard className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
          <p className="text-red-700 mb-6">
            This area is restricted to clients only. Please contact your funding specialist for access.
          </p>
          <div className="space-y-2">
            <a 
              href="/member/login" 
              className="inline-block w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Client Login
            </a>
            <a 
              href="/login" 
              className="inline-block w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
            >
              Professional Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ClientProtectedRoute;