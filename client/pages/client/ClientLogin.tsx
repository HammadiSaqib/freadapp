import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CreditCard, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from "sonner";
import { authApi, setAuthToken } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { usePortalLoginRedirect } from "@/hooks/usePortalLoginRedirect";
import { getPortalNavigationTarget } from "@/lib/hostRouting";

const ClientLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  usePortalLoginRedirect({ allowedRoles: ['client'] });

  useEffect(() => {
    const prefillEmail = searchParams.get('email');
    if (prefillEmail) {
      setFormData(prev => ({ ...prev, email: prefillEmail }));
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔄 ClientLogin: Starting login process for:', formData.email);
      
      const response = await authApi.clientLogin(
        formData.email,
        formData.password
      );

      console.log('📥 ClientLogin: Raw API response:', response);
      console.log('📥 ClientLogin: Response structure:', {
        success: response.data?.success,
        hasToken: !!response.data?.token,
        hasUser: !!response.data?.user,
        userRole: response.data?.user?.role
      });

      if (response.data?.success) {
        console.log('✅ ClientLogin: Login successful, storing token...');
        console.log('🔑 ClientLogin: Token to store:', response.data.token?.substring(0, 50) + '...');
        
        // Store token using the consistent method
        setAuthToken(response.data.token);
        
        // Verify token was stored
        const storedToken = localStorage.getItem('auth_token');
        console.log('🔍 ClientLogin: Token verification after setAuthToken:', {
          tokenStored: !!storedToken,
          tokensMatch: storedToken === response.data.token,
          storedTokenPreview: storedToken?.substring(0, 50) + '...'
        });
        
        // Store user info in localStorage (consistent with other login pages)
        if (response.data.user) {
          console.log('👤 ClientLogin: Storing user info:', {
            role: response.data.user.role,
            id: response.data.user.id,
            name: `${response.data.user.first_name} ${response.data.user.last_name}`
          });
          
          localStorage.setItem('userRole', response.data.user.role);
          localStorage.setItem('userId', response.data.user.id.toString());
          localStorage.setItem('userName', `${response.data.user.first_name} ${response.data.user.last_name}`);
          
          // Verify user info was stored
          console.log('🔍 ClientLogin: User info verification:', {
            storedRole: localStorage.getItem('userRole'),
            storedUserId: localStorage.getItem('userId'),
            storedUserName: localStorage.getItem('userName')
          });
        }
        
        // Final localStorage check
        console.log('📋 ClientLogin: Final localStorage state:', {
          auth_token: localStorage.getItem('auth_token')?.substring(0, 50) + '...',
          userRole: localStorage.getItem('userRole'),
          userId: localStorage.getItem('userId'),
          userName: localStorage.getItem('userName')
        });
        
        // Check if user is a client
        if (response.data.user.role === 'client') {
          console.log('🎯 ClientLogin: User is client, navigating to dashboard...');
          toast.success('Welcome back!');
          clearPortalReturnContext();
          // Set a session flag so dashboard can refresh once after login
          try {
            sessionStorage.setItem('client_just_logged_in', '1');
          } catch (e) {
            // ignore storage errors
          }
          const dashboardTarget = getPortalNavigationTarget('member', '/dashboard');
          if (dashboardTarget.external) {
            window.location.href = dashboardTarget.target;
            return;
          }
          navigate(dashboardTarget.target);
        } else {
          console.log('❌ ClientLogin: User is not a client, role:', response.data.user.role);
          toast.error('Access denied. Client credentials required.');
        }
      } else {
        console.log('❌ ClientLogin: Login failed:', response.data?.message);
        toast.error(response.data?.message || 'Login failed');
      }
    } catch (error) {
      console.error('💥 ClientLogin: Login error:', error);
      console.error('💥 ClientLogin: Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home */}
        <div className="mb-6">
          <Link 
            to="/" 
            className="inline-flex items-center text-green-600 hover:text-green-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Client Portal
            </CardTitle>
            <CardDescription className="text-gray-600">
              Access Professional Dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, rememberMe: checked as boolean }))
                    }
                  />
                  <Label 
                    htmlFor="rememberMe" 
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>

                <Link 
                  to="/forgot-password" 
                  className="text-sm text-green-600 hover:text-green-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>


            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <Link 
                  to="/contact" 
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  User Your Monitoring Site Email and Password to login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Your information is protected with bank-level security
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
