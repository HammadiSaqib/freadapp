import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authApi, getAuthToken } from "@/lib/api";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { usePagePermissions, getPageIdFromPath } from "@/hooks/usePagePermissions";
import { Loader2, Lock } from "lucide-react";
import LoadingScreen from "./LoadingScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowUnpaidAccess?: boolean; // Allow access even without active subscription
  pageId?: string; // Optional page ID for permission checking
}

export default function ProtectedRoute({ children, allowUnpaidAccess = false, pageId }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const subscriptionStatus = useSubscriptionStatus();
  const pagePermissions = usePagePermissions();

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.verifyToken();
        if (response.data?.valid) {
          setIsAuthenticated(true);
          // Try to get user profile to determine role
          try {
            const profileResponse = await authApi.getProfile();
            setUserRole(profileResponse.data?.role || null);
          } catch (profileError) {
            console.warn('Could not fetch user profile:', profileError);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading || subscriptionStatus.isLoading || pagePermissions.isLoading) {
    return <LoadingScreen message="Verifying authentication..." />;
  }

  if (!isAuthenticated) {
    // Save the attempted location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user is admin and needs subscription (unless explicitly allowed unpaid access)
  if (!allowUnpaidAccess && 
      userRole === 'admin' && 
      !subscriptionStatus.hasActiveSubscription && 
      location.pathname !== '/subscription' && 
      location.pathname !== '/pricing') {
    // Redirect unpaid admins to subscription page
    return <Navigate to="/subscription" replace />;
  }

  // Check page permissions for admin users
  const hasPageAccess = userRole !== 'admin' || !pageId && !getPageIdFromPath(location.pathname) || pagePermissions.hasPermission(pageId || getPageIdFromPath(location.pathname));
  
  if (userRole === 'admin' && !allowUnpaidAccess) {
    const currentPageId = pageId || getPageIdFromPath(location.pathname);
    
    if (currentPageId && !pagePermissions.hasPermission(currentPageId)) {
      // Show blurred content with upgrade overlay
      return (
        <div className="relative">
          {/* Blurred content */}
          <div className="blur-sm pointer-events-none select-none">
            {children}
          </div>
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-8 max-w-md mx-4 text-center border border-gray-200 dark:border-slate-700">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Upgrade Required
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your current subscription plan doesn't include access to this feature. 
                Upgrade your plan to unlock this page and many more premium features.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.history.back()}
                  className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={() => window.location.href = '/subscription'}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-md transition-all duration-200 shadow-lg"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
