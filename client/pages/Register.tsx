import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authApi, setAuthToken } from '@/lib/api';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield, Zap, Star, User, Users, Home, CreditCard, Phone, DollarSign, Menu, X } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';

interface RegisterProps {
  embed?: boolean;
}

export default function Register({ embed = false }: RegisterProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [referralInfo, setReferralInfo] = useState<{
    affiliateId?: string;
  }>({});
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    password: '',
    confirmPassword: '',
    terms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleConfigLoaded, setGoogleConfigLoaded] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const affiliateIdParam = searchParams.get('ref');
    let storedAffiliateId: string | null = null;
    try {
      storedAffiliateId = typeof window !== 'undefined' ? localStorage.getItem('referral_affiliate_id') : null;
    } catch (e) {
      storedAffiliateId = null;
    }
    const finalAffiliateId = affiliateIdParam || storedAffiliateId || undefined;
    if (finalAffiliateId) {
      setReferralInfo({ affiliateId: finalAffiliateId });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!embed || typeof window === 'undefined' || window.parent === window) {
      return;
    }

    const postEmbedHeight = () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      );

      window.parent.postMessage(
        {
          type: 'scoremachine:register-embed-resize',
          height,
        },
        '*',
      );
    };

    postEmbedHeight();

    const frameId = window.requestAnimationFrame(postEmbedHeight);
    const resizeObserver = new ResizeObserver(() => {
      postEmbedHeight();
    });

    resizeObserver.observe(document.body);
    window.addEventListener('resize', postEmbedHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', postEmbedHeight);
    };
  }, [embed, showVerification, loading, verificationLoading, formData.terms]);

  // Load Google config
  useEffect(() => {
    let cancelled = false;
    const loadGoogleConfig = async () => {
      try {
        const response = await authApi.getGoogleConfig();
        const clientId = String(response.data?.clientId || '').trim();
        if (!cancelled && response.data?.enabled && clientId) {
          setGoogleClientId(clientId);
        }
      } catch (error) {
        console.warn('Google sign-in config unavailable:', error);
      } finally {
        if (!cancelled) setGoogleConfigLoaded(true);
      }
    };
    loadGoogleConfig();
    return () => { cancelled = true; };
  }, []);

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setIsGoogleLoading(true);
      try {
        const response = await authApi.googleLogin({
          credential,
          referral_affiliate_id: referralInfo.affiliateId || undefined,
        });

        if (response.data?.token) {
          setAuthToken(response.data.token);
          await refreshProfile();
          try { localStorage.removeItem('referral_affiliate_id'); } catch {}
          toast.success('Account created successfully! Welcome!');
          navigateToAppPath('/dashboard');
        } else {
          toast.error('Google sign-in succeeded but no token received. Please try logging in.');
        }
      } catch (error: any) {
        console.error('Google signup error:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Google sign-in failed. Please try again.';
        toast.error(errorMessage);
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [referralInfo.affiliateId, refreshProfile],
  );

  // Render Google button
  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let cancelled = false;
    const isDarkMode = document.documentElement.classList.contains('dark');

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) return;

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: any) => {
          if (response?.credential) {
            handleGoogleCredential(response.credential);
            return;
          }
          toast.error('Google did not return a sign-in credential.');
        },
        ux_mode: 'popup',
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signup',
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: isDarkMode ? 'filled_black' : 'outline',
        size: 'large',
        text: 'signup_with',
        shape: 'rectangular',
        width: Math.min(360, googleButtonRef.current.offsetWidth || 360),
        logo_alignment: 'left',
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => { cancelled = true; };
    }

    let script = document.getElementById('google-identity-services') as HTMLScriptElement | null;
    const handleLoad = () => renderGoogleButton();
    const handleError = () => {
      if (!cancelled) toast.error('Google sign-in script could not be loaded.');
    };

    if (!script) {
      script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);
      if (window.google?.accounts?.id) renderGoogleButton();
    }

    return () => {
      cancelled = true;
      script?.removeEventListener('load', handleLoad);
      script?.removeEventListener('error', handleError);
    };
  }, [googleClientId, handleGoogleCredential]);

  const resolveAppUrl = (path: string) => {
    if (typeof window === 'undefined') {
      return path;
    }

    return new URL(path, window.location.origin).toString();
  };

  const navigateToAppPath = (path: string) => {
    if (!embed) {
      navigate(path);
      return;
    }

    const targetUrl = resolveAppUrl(path);

    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = targetUrl;
        return;
      }
    } catch {}

    window.location.href = targetUrl;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      toast.error('First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      toast.error('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    const normalizedPhone = formData.phone.replace(/[^\d+]/g, '');
    if (!normalizedPhone) {
      toast.error('Phone number is required');
      return false;
    }
    if (!/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      toast.error('Please enter a valid phone number');
      return false;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (!formData.terms) {
      toast.error('You must accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const normalizedPhone = formData.phone.replace(/[^\d+]/g, '');
      const registrationData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: normalizedPhone,
        company_name: formData.company_name || null,
        password: formData.password,
        // Send referral affiliate id under the server-supported key
        referral_affiliate_id: referralInfo.affiliateId || undefined
      };

      const response = await authApi.register(registrationData);
      
      console.log('Registration response:', response.data);
      
      if (response.data?.success) {
        // Store the token and redirect to dashboard
        if (response.data.data?.token) {
          setAuthToken(response.data.data.token);
          await refreshProfile();
          try {
            localStorage.removeItem('referral_affiliate_id');
          } catch (e) {
            // ignore
          }
          toast.success('Registration successful! Welcome! Please verify your email address in the dashboard.');
          navigateToAppPath('/dashboard');
        } else {
          toast.error('Registration successful but no token received. Please try logging in.');
        }
      } else {
        toast.error(response.data?.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setVerificationLoading(true);
    try {
      const response = await authApi.verifyEmail({
        email: formData.email,
        code: verificationCode
      });
      
      console.log('Verification response:', response.data);
      
      if (response.data?.success) {
        // Store the token and user data for auto-login
        if (response.data.token) {
          localStorage.setItem('auth_token', response.data.token);
          console.log('Token stored for auto-login');
        }
        
        toast.success('Email verified successfully! Logging you in...');
        
        // Navigate to admin dashboard after successful verification and auto-login
        setTimeout(() => {
          navigateToAppPath('/dashboard');
          // Refresh the dashboard after navigation to ensure fresh data
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }, 1500);
      } else {
        toast.error(response.data?.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Verification failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className={embed ? 'relative overflow-hidden bg-transparent py-4' : 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/30 relative overflow-hidden'}>
      {!embed && <SiteHeader />}
      
      {!embed && (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-ocean-blue/20 to-sea-green/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-sea-green/20 to-ocean-blue/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-ocean-blue/10 to-sea-green/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      )}

      <div className={embed ? 'relative z-10 flex items-center justify-center p-4' : 'relative z-10 flex items-center justify-center min-h-screen p-4'}>
        <div className="w-full max-w-md">
          {!showVerification ? (
            <Card className="backdrop-blur-sm bg-white/90 shadow-2xl border-0">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-ocean-blue to-sea-green rounded-full flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Create Admin Account</CardTitle>
                <CardDescription className="text-gray-600">
                  Join our platform and start managing your funding business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="border-gray-300 focus:border-ocean-blue focus:ring-ocean-blue"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="border-gray-300 focus:border-ocean-blue focus:ring-ocean-blue"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="border-gray-300 focus:border-ocean-blue focus:ring-ocean-blue"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="border-gray-300 focus:border-ocean-blue focus:ring-ocean-blue"
                      placeholder="e.g. +15551234567"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name (Optional)</Label>
                    <Input
                      id="company_name"
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      className="border-gray-300 focus:border-ocean-blue focus:ring-ocean-blue"
                      placeholder="Your company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="border-gray-300 focus:border-ocean-blue focus:ring-ocean-blue pr-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-0 h-full px-3 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="border-gray-300 focus:border-ocean-blue focus:ring-ocean-blue pr-12"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute inset-y-0 right-0 h-full px-3 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.terms}
                      onCheckedChange={(checked) => handleInputChange('terms', checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm text-gray-600">
                      I agree to the{" "}
                      <Link to="/terms" target={embed ? '_blank' : undefined} rel={embed ? 'noopener noreferrer' : undefined} className="text-ocean-blue hover:text-sea-green font-medium hover:underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" target={embed ? '_blank' : undefined} rel={embed ? 'noopener noreferrer' : undefined} className="text-ocean-blue hover:text-sea-green font-medium hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-medium py-2 px-4 rounded-md transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Creating Account...</span>
                      </div>
                    ) : (
                      'Create Admin Account'
                    )}
                  </Button>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest text-gray-500">
                      <span className="bg-white px-3">Or continue with</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div
                      ref={googleButtonRef}
                      className="flex min-h-[44px] items-center justify-center overflow-hidden rounded-xl"
                    />
                    {isGoogleLoading && (
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ocean-blue" />
                        <span>Signing up with Google...</span>
                      </div>
                    )}
                    {googleConfigLoaded && !googleClientId && (
                      <p className="text-center text-xs text-gray-500">
                        Google sign-in is currently unavailable.
                      </p>
                    )}
                  </div>

                  <div className="text-center text-gray-600">
                    Already have an account?{" "}
                    <Link to="/login" target={embed ? '_top' : undefined} className="text-ocean-blue hover:text-sea-green font-medium hover:underline">
                      Sign in here
                    </Link>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="backdrop-blur-sm bg-white/90 shadow-2xl border-0">
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto w-16 h-16 bg-sea-green/10 border border-sea-green/30 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-8 h-8 text-sea-green" />
                </div>
                <CardTitle className="text-2xl font-bold text-ocean-blue">Verify Your Email</CardTitle>
                <CardDescription className="text-gray-600">
                  We've sent a verification code to {formData.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerification} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Verification Code</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="border-gray-300 focus:border-sea-green focus:ring-sea-green text-center text-lg tracking-widest"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-medium py-2 px-4 rounded-md transition-all duration-200"
                    disabled={verificationLoading}
                  >
                    {verificationLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      'Verify Email'
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowVerification(false)}
                      className="text-ocean-blue hover:text-sea-green"
                    >
                      Go back to registration
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}