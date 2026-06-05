import { useState, useEffect } from 'react';
import { authApi } from '../lib/api';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  role: string;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const response = await authApi.verifyToken();
      if (response.data?.valid && response.data?.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // Update stored user info
        localStorage.setItem('userRole', response.data.user.role);
        localStorage.setItem('userId', response.data.user.id.toString());
        localStorage.setItem('userName', `${response.data.user.first_name} ${response.data.user.last_name}`);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        // Clear invalid tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
      }
    } catch (error) {
      console.error('Auth verification failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      // Clear invalid tokens
      localStorage.removeItem('auth_token');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.data?.token && response.data?.user) {
        localStorage.setItem('auth_token', response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        // Store user info
        localStorage.setItem('userRole', response.data.user.role);
        localStorage.setItem('userId', response.data.user.id.toString());
        localStorage.setItem('userName', `${response.data.user.first_name} ${response.data.user.last_name}`);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    // Clear all possible token keys
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    setUser(null);
    setIsAuthenticated(false);
    authApi.logout();
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshAuth
  };
}