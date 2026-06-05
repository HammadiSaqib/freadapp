import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, getAuthToken } from '@/lib/api';

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  title?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  timezone?: string;
  role: string;
  avatar?: string;
  email_verified?: boolean;
  // Custom credit repair URL override
  credit_repair_url?: string;
  onboarding_slug?: string;
  intake_redirect_url?: string | null;
  intake_logo_url?: string | null;
  intake_primary_color?: string | null;
  // NMI gateway settings (privileged roles only)
  nmi_merchant_id?: string;
  nmi_public_key?: string;
  nmi_api_key?: string;
  nmi_username?: string;
  nmi_password?: string;
  nmi_test_mode?: boolean;
  nmi_gateway_logo?: string | null;
  funding_override_enabled?: boolean;
  funding_override_signature_text?: string | null;
  funding_override_signed_at?: string | null;
  permissions?: string[];
  is_subscription_exempt?: boolean;
}

interface AuthContextType {
  userProfile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      console.log('🔄 AuthContext: Refreshing profile...');
      
      // Check if we have a token before making the request
      const token = getAuthToken();
      if (!token) {
        console.log('🔍 AuthContext: No token found, skipping profile refresh');
        setUserProfile(null);
        setIsLoading(false);
        return;
      }
      
      console.log('🔑 AuthContext: Token found, proceeding with profile refresh');
      setIsLoading(true);
      const response = await authApi.getProfile();
      console.log('✅ AuthContext: Profile response:', response.data);
      
      if (response.data) {
        // Check for new API format: { success: true, user: {...} }
        if (response.data.success && response.data.user) {
          setUserProfile(response.data.user);
          console.log('✅ AuthContext: Profile updated with user:', response.data.user);
        }
        // Check for legacy format where user data is directly in response.data
        else if (response.data.id && response.data.email && response.data.role) {
          setUserProfile(response.data);
          console.log('✅ AuthContext: Profile updated with direct data:', response.data);
        }
        // If neither format matches, log the issue
        else {
          console.error('❌ AuthContext: Unexpected response format:', response.data);
          setUserProfile(null);
        }
      } else {
        console.error('❌ AuthContext: No data in response');
        setUserProfile(null);
      }
    } catch (error: any) {
      // Only log errors that aren't 401 (unauthorized) - 401 is expected when not logged in
      if (error?.response?.status !== 401) {
        console.error('Error fetching user profile:', error);
      }
      // For 401 errors, silently set userProfile to null (user not authenticated)
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const value = {
    userProfile,
    isLoading,
    refreshProfile,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
