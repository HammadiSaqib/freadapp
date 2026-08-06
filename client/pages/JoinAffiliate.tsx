import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Loader2, Users, DollarSign, TrendingUp, CheckCircle, ArrowRight, Sparkles, CreditCard, Shield, Award, Star, Building2, Handshake, Layers, Info, HelpCircle, BarChart3, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { clearStoredAffiliateReferralId, getStoredAffiliateReferralId, persistAffiliateReferralId } from '@/lib/affiliateReferral';
import SiteHeader from '@/components/SiteHeader';
import Footer from '@/components/Footer';

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

interface VerificationData {
  email: string;
  code: string;
}

interface JoinAffiliateProps {
  embed?: boolean;
  forcedReferralAffiliateId?: string;
}

const JoinAffiliate: React.FC<JoinAffiliateProps> = ({
  embed = false,
  forcedReferralAffiliateId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const referralAffiliateId = React.useMemo(() => {
    const normalizedForcedReferralId = String(forcedReferralAffiliateId || '').trim();

    if (normalizedForcedReferralId) {
      return normalizedForcedReferralId;
    }

    const queryReferralId = new URLSearchParams(location.search).get('ref');
    return String(queryReferralId || '').trim() || getStoredAffiliateReferralId();
  }, [forcedReferralAffiliateId, location.search]);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [verificationData, setVerificationData] = useState<VerificationData>({
    email: '',
    code: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const redirectToPath = (path: string) => {
    if (typeof window === 'undefined') {
      navigate(path);
      return;
    }

    if (!embed) {
      navigate(path);
      return;
    }

    try {
      if (window.top === window.self) {
        navigate(path);
        return;
      }
    } catch {}

    const targetUrl = `${window.location.origin}${path}`;

    try {
      if (window.top && window.top !== window.self) {
        window.top.location.href = targetUrl;
        return;
      }
    } catch {}

    const redirected = window.open(targetUrl, '_top');
    if (!redirected) {
      window.location.href = targetUrl;
    }
  };

  React.useEffect(() => {
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
          type: 'scoremachine:join-affiliate-embed-resize',
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
  }, [embed, error, loading, success, showVerification, resendLoading]);

  React.useEffect(() => {
    const queryReferralId = new URLSearchParams(location.search).get('ref');
    const referralIdToPersist = String(forcedReferralAffiliateId || queryReferralId || '').trim();

    if (!referralIdToPersist) {
      return;
    }

    persistAffiliateReferralId(referralIdToPersist);
  }, [forcedReferralAffiliateId, location.search]);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleVerificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVerificationData(prev => ({ ...prev, [name]: value }));
    setError('');
  };



  const validateForm = (): boolean => {
    if (!formData.email || !formData.firstName || !formData.lastName || 
        !formData.password || !formData.confirmPassword) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const profileRes = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const currentEmail = profileData?.user?.email;
          if (currentEmail && currentEmail.toLowerCase() === formData.email.toLowerCase()) {
            setError('You are already logged in with this email');
            return;
          }
        }
      }
    } catch {}

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/affiliate/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          password: formData.password,
          referrerAffiliateId: referralAffiliateId || undefined
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {}

      if (!response.ok) {
        if (response.status === 409) {
          setError('This Email Already Registrated');
        } else {
          setError((data && (data.error || data.message)) || 'Registration failed. Please try again.');
        }
        return;
      }

      // response.ok path
      // data may be null if parsing failed above; guard access
      if (data.success) {
        try {
          const loginRes = await fetch('/api/auth/affiliate/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, password: formData.password }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok && loginData.token) {
            clearStoredAffiliateReferralId();
            localStorage.setItem('auth_token', loginData.token);
            localStorage.setItem('userRole', 'affiliate');
            if (loginData.user?.id) localStorage.setItem('userId', String(loginData.user.id));
            if (loginData.user?.first_name || loginData.user?.last_name) {
              localStorage.setItem('userName', `${loginData.user?.first_name || ''} ${loginData.user?.last_name || ''}`.trim());
            }
            redirectToPath('/affiliate/dashboard');
            return;
          } else {
            setError(loginData.error || 'Login failed');
          }
        } catch (loginErr) {
          setError('Login failed. Please try affiliate login.');
        }
      } else {
        setError((data && (data.error || data.message)) || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationData.code || !verificationData.email) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/affiliate/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationData.email,
          code: verificationData.code
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/affiliate/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: verificationData.email
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Show success message briefly
        setError('');
        // You could add a toast notification here instead
        alert('Verification code sent successfully! Please check your email.');
      } else {
        setError(data.error || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setError('Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`${embed ? 'min-h-[720px]' : 'min-h-screen'} bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center p-4`}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sea-green/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-blue/10 rounded-full blur-3xl"></div>
        </div>
        
        <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-r from-sea-green to-ocean-blue rounded-full flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <Badge className="mx-auto mb-4 bg-gradient-to-r from-sea-green/10 to-ocean-blue/10 text-sea-green border-sea-green/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Application Submitted
            </Badge>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-sea-green to-ocean-blue bg-clip-text text-transparent">
              Welcome to Our Team!
            </CardTitle>
            <CardDescription className="text-lg leading-relaxed mt-4">
              Your affiliate account has been verified and activated successfully! 
              You can now log in to your affiliate dashboard and start earning commissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => redirectToPath('/')} 
              className="w-full bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 shadow-lg text-lg py-6"
            >
              Return to Home
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              onClick={() => redirectToPath('/affiliate/login')} 
              variant="outline"
              className="w-full border-ocean-blue text-ocean-blue hover:bg-ocean-blue hover:text-white"
            >
              Go to Affiliate Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={embed ? 'min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 font-sans py-8' : 'min-h-screen bg-white'}>
      <Helmet>
        <title>{embed ? 'Affiliate Registration Embed - Score Machine' : 'Affiliate Program - Score Machine | Partner & Earn'}</title>
        <meta name="description" content="Join Score Machine’s Affiliate and Partner Programs. Earn recurring commissions by promoting a professional, AI-based credit analysis platform. Access training, analytics, tracking tools, and compliance-ready marketing resources." />
        {embed ? (
          <>
            <meta name="robots" content="noindex,nofollow" />
            <link rel="canonical" href="https://thescoremachine.com/join-affiliate" />
          </>
        ) : (
          <link rel="canonical" href="https://thescoremachine.com/affiliate" />
        )}
      </Helmet>
      {!embed && <SiteHeader />}
      {!embed && (
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-emerald-50/30">
        {/* Multi-layer Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/5 via-transparent to-sea-green/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.1),transparent_50%)]"></div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-ocean-blue/20 to-sea-green/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-sea-green/20 to-ocean-blue/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="text-center max-w-6xl mx-auto">
            {/* Enhanced Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-ocean-blue/10 to-sea-green/10 backdrop-blur-sm border border-ocean-blue/20 rounded-full px-6 py-3 mb-8 shadow-lg">
              <div className="w-2 h-2 bg-gradient-to-r from-ocean-blue to-sea-green rounded-full animate-pulse"></div>
              <Sparkles className="w-4 h-4 text-ocean-blue" />
              <span className="text-ocean-blue font-semibold">Earn with Score Machine</span>
              <div className="w-2 h-2 bg-gradient-to-r from-sea-green to-ocean-blue rounded-full animate-pulse"></div>
            </div>

            {/* Enhanced Title */}
            <h1 className="text-6xl lg:text-8xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-ocean-blue via-sea-green to-ocean-blue bg-clip-text text-transparent">
                Earn More with
              </span>
              <br />
              <span className="bg-gradient-to-r from-sea-green via-ocean-blue to-sea-green bg-clip-text text-transparent">
                Affiliate, Partner, and White Label Programs 
              </span>
            </h1>

            {/* Enhanced Description */}
            <p className="text-xl lg:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Promote the <span className="font-semibold text-ocean-blue">AI-powered credit platform</span> that analyzes and decodes credit files before repair or funding. Choose your path—from a free affiliate track to full brand ownership with our <span className="font-semibold text-orange-600">White Label program (Coming Soon)</span>.
            </p>

            {/* Enhanced CTAs */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button asChild size="lg" className="bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 text-white font-semibold px-10 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-xl">
                <a
                  href="#apply"
                  className="flex items-center"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById('apply');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  Apply to Join
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>

          {/* Enhanced Key Benefits */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-sea-green to-ocean-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Up to 25% Commissions</h3>
                <p className="text-gray-600 leading-relaxed">Earn competitive commissions through our tiered partner program and recurring revenue model.</p>
                <Button
                  variant="link"
                  className="mt-4 text-ocean-blue font-semibold"
                  onClick={() => {
                    const el = document.getElementById('programs');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  <span>Learn More</span>
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-ocean-blue to-sea-green rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Full Support</h3>
                <p className="text-gray-600 leading-relaxed">Comprehensive training, marketing assets, and dedicated account management.</p>
                <Button
                  variant="link"
                  className="mt-4 text-ocean-blue font-semibold"
                  onClick={() => {
                    const el = document.getElementById('apply');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  <span>Get Started</span>
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-sea-green to-ocean-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Real-time Analytics</h3>
                <p className="text-gray-600 leading-relaxed">Track conversions, optimize campaigns, and monitor performance in real-time.</p>
                <Button
                  variant="link"
                  className="mt-4 text-ocean-blue font-semibold"
                  onClick={() => {
                    const el = document.getElementById('programs');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                >
                  <span>View Dashboard</span>
                  <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      )}

      {!embed && (
      <section id="programs" className="py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl -z-10" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-emerald-600 text-white border-0 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              Partnership Programs
            </Badge>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-800 to-emerald-800 bg-clip-text text-transparent">
              Choose Your Success Path
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Start free as an Affiliate, grow with Partner tiers, or build your own brand with <span className="font-semibold text-orange-600">White Label (Coming Soon)</span>—powered by Score Machine's comprehensive funding platform.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Affiliate Program */}
            <Card className="group relative border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
              
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-300">
                    <Handshake className="w-6 h-6 text-blue-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-green-200">Most Popular</Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Affiliate Program</CardTitle>
                <CardDescription className="text-lg font-medium text-blue-600">
                  Free to join • 10–15% recurring commission
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Free entry with instant approval</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">10–15% commission on all paid referrals</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Complete tracking links, dashboards & marketing assets</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 group/btn">
                    <a
                      href="#apply"
                      className="flex items-center justify-center gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.getElementById('apply');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      Apply as Affiliate
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Partner Program */}
            <Card className="group relative border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
              
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors duration-300">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200">Premium</Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Partner Program</CardTitle>
                <CardDescription className="text-lg font-medium text-purple-600">
                  Paid tier • 20–25% recurring commission
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">20–25% commission tier with premium support</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Co-marketing opportunities & advanced training</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Perfect for agencies & high-volume partners</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <Button asChild variant="outline" className="w-full border-2 border-purple-200 text-purple-700 hover:bg-purple-500 hover:border-purple-300 shadow-lg hover:shadow-xl transition-all duration-300 group/btn">
                    <Link to="/pricing" className="flex items-center justify-center gap-2">
                      Apply as Partner
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* White Label Program */}
            <Card className="group relative border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
              
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors duration-300">
                    <Layers className="w-6 h-6 text-emerald-600" />
                  </div>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">Enterprise</Badge>
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">White Label Program <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">(Coming Soon)</span></CardTitle>
                <CardDescription className="text-lg font-medium text-emerald-600">
                  Tiered setup • Full reseller control
                </CardDescription>
              </CardHeader>
              
              <CardContent className="relative space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Flexible profit structures with brand control options</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Set your own reseller pricing & margins</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <Button className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-lg transition-all duration-300" disabled>
                    <span className="flex items-center justify-center gap-2">
                      Join Waitlist for White Label
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      )}

      {!embed && (
      <section className="hidden py-24 bg-gradient-to-br from-indigo-50 via-white to-purple-50/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute top-20 left-20 w-96 h-96 bg-indigo-100/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-100/20 rounded-full blur-3xl -z-10" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-50/10 to-indigo-50/10 rounded-full blur-3xl -z-10" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 px-4 py-2">
              <CreditCard className="w-4 h-4 mr-2" />
              Pricing Tiers
            </Badge>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
              White Label Pricing Tiers <span className="text-lg bg-orange-100 text-orange-700 px-3 py-1 rounded-full">(Coming Soon)</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Choose a tier that matches your brand ambitions and margin goals—while reselling a robust, fundability-ready credit platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {/* Starter Tier */}
            <Card className="group relative border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-gray-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-gray-500" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-slate-600 border-slate-300">
                    Entry Level
                  </Badge>
                  <Building2 className="w-6 h-6 text-slate-500" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Starter</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-600">$2.5K</span>
                  <span className="text-sm text-gray-500">setup</span>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Entry-level branding</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Balanced profit split</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Basic customization</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Standard support</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Growth Tier */}
            <Card className="group relative border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-green-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                    Popular
                  </Badge>
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Growth</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-emerald-600">$10K</span>
                  <span className="text-sm text-gray-500">setup</span>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Expanded features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Improved profit split</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Enhanced branding options</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Priority support</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pro Tier */}
            <Card className="group relative border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                    Advanced
                  </Badge>
                  <Award className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Pro</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-blue-600">$25K</span>
                  <span className="text-sm text-gray-500">setup</span>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Advanced customization</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Premium profit split</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">White-label mobile app</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Dedicated account manager</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enterprise Tier */}
            <Card className="group relative border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-violet-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-violet-500" />
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-purple-600 border-purple-300 bg-purple-50">
                    Premium
                  </Badge>
                  <Star className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Enterprise</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-purple-600">$50K</span>
                  <span className="text-sm text-gray-500">setup</span>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Full brand control</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Maximum profit potential</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Custom integrations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">24/7 premium support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-16">
            <p className="text-gray-600 mb-6">Ready to start your <span className="font-semibold text-orange-600">white label journey (Coming Soon)</span>?</p>
            <Button size="lg" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
              <CreditCard className="w-5 h-5 mr-2" />
              Compare All Tiers
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>
      )}

      {!embed && (
      <section className="py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-100/30 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl -z-10" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-gradient-to-r from-emerald-600 to-blue-600 text-white border-0 px-4 py-2">
              <TrendingUp className="w-4 h-4 mr-2" />
              Simple Process
            </Badge>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-emerald-800 to-blue-800 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Four simple steps to start earning with Score Machine's comprehensive funding platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-emerald-200 via-blue-200 to-emerald-200 -z-10" />
            
            {/* Step 1 */}
            <div className="group relative">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                <CardContent className="p-8 text-center relative">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div className="absolute -inset-3 bg-gradient-to-r from-emerald-600/20 to-emerald-700/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Apply</h3>
                  <p className="text-gray-600 leading-relaxed">Submit your application to join our exclusive network of partners and affiliates.</p>
                </CardContent>
              </Card>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                <CardContent className="p-8 text-center relative">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <Handshake className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Onboard</h3>
                  <p className="text-gray-600 leading-relaxed">Access comprehensive marketing assets and advanced tracking tools for success.</p>
                </CardContent>
              </Card>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                <CardContent className="p-8 text-center relative">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div className="absolute -inset-3 bg-gradient-to-r from-emerald-600/20 to-emerald-700/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Promote</h3>
                  <p className="text-gray-600 leading-relaxed">Launch targeted campaigns and track real-time conversions with detailed analytics.</p>
                </CardContent>
              </Card>
            </div>

            {/* Step 4 */}
            <div className="group relative">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
                <CardContent className="p-8 text-center relative">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-300">
                      <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div className="absolute -inset-3 bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-gray-900">Earn</h3>
                  <p className="text-gray-600 leading-relaxed">Receive verified conversion payouts with transparent reporting.</p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Affiliate Guidelines Note */}
          <div className="mt-12 max-w-3xl mx-auto text-center bg-amber-50 border border-amber-100 rounded-xl p-6">
            <p className="text-amber-800 font-bold text-sm">
              Note: Affiliates must comply with all FTC guidelines. Claims of guaranteed income or credit improvement are strictly prohibited.
            </p>
          </div>
          
          {/* Call to Action */}
          <div className="text-center mt-16">
            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 px-8 py-4 text-lg group">
              <a
                href="#apply"
                className="flex items-center gap-3"
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById('apply');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                Get Started Today
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </Button>
          </div>
        </div>
      </section>
      )}

      {/* Registration Form */}
      <section id="apply" className="py-24 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute top-10 right-10 w-80 h-80 bg-emerald-100/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl -z-10" />
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white border-0 px-4 py-2">
                <Users className="w-4 h-4 mr-2" />
                Join Our Network
              </Badge>
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-emerald-800 to-blue-800 bg-clip-text text-transparent pb-3">
                Start Your Success Journey
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Complete the form to join our Affiliate or Partner network and start promoting Score Machine's industry-leading funding platform.
              </p>
            </div>
            
            <Card className="group relative border-0 shadow-0xl bg-white/90 backdrop-blur-sm hover:shadow-3xl transition-all duration-500 overflow-hidden">
              {/* Card Header Gradient */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />
              
              <CardHeader id="apply" className="pb-8 pt-12 relative">
                <div className="flex items-center justify-center mb-8">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform duration-300">
                      <Users className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -inset-2 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
                <CardTitle className="text-4xl text-center font-bold bg-gradient-to-r from-emerald-700 to-blue-700 bg-clip-text text-transparent mb-8 pb-3">
                  Affiliate & Partner Registration
                </CardTitle>
                <CardDescription className="text-center text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Join thousands earning with Score Machine by promoting a comprehensive credit analysis platform with verified results.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-10">
                {!showVerification ? (
                  <form onSubmit={handleSubmit} className="space-y-10">
                    {error && (
                      <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm">
                        <AlertDescription className="text-red-700 font-medium">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Personal Information Section */}
                    <div className="space-y-8">
                      <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Personal Information</h3>
                          <p className="text-gray-600">Tell us about yourself</p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label htmlFor="firstName" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            First Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                            placeholder="Enter your first name"
                            required
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <Label htmlFor="lastName" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            Last Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            type="text"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                            placeholder="Enter your last name"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="email" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                          Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                          placeholder="Enter your email address"
                          required
                        />
                      </div>
                    </div>

                    {/* Security Section */}
                    <div className="space-y-8">
                      <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Account Security</h3>
                          <p className="text-gray-600">Create a secure password</p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label htmlFor="password" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            Password <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              value={formData.password}
                              onChange={handleInputChange}
                              className="h-12 pr-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                              placeholder="Create a strong password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(v => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              aria-label="Toggle password visibility"
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            Confirm Password <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={formData.confirmPassword}
                              onChange={handleInputChange}
                              className="h-12 pr-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                              placeholder="Confirm your password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(v => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              aria-label="Toggle confirm password visibility"
                            >
                              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-8">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Creating Your Account...
                          </>
                        ) : (
                          <>
                            Join Affiliate Program
                            <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleVerificationSubmit} className="space-y-10">
                    {error && (
                      <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm">
                        <AlertDescription className="text-red-700 font-medium">
                          {error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Email Verification Section */}
                    <div className="space-y-8">
                      <div className="flex items-center space-x-4 pb-4 border-b border-gray-100">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">Email Verification</h3>
                          <p className="text-gray-600">Enter the verification code sent to your email</p>
                        </div>
                      </div>
                      
                      <div className="text-center space-y-6">
                        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-xl border border-emerald-100">
                          <p className="text-gray-700 mb-2">
                            We've sent a 6-digit verification code to:
                          </p>
                          <p className="font-semibold text-emerald-700 text-lg">
                            {verificationData.email}
                          </p>
                        </div>
                        
                        <div className="space-y-3">
                          <Label htmlFor="code" className="text-sm font-semibold text-gray-800 flex items-center justify-center gap-2">
                            Verification Code <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="code"
                            name="code"
                            type="text"
                            value={verificationData.code}
                            onChange={handleVerificationChange}
                            className="h-14 text-center text-2xl font-mono tracking-widest border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl bg-white/80 backdrop-blur-sm transition-all duration-200"
                            placeholder="000000"
                            maxLength={6}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold text-lg rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify Email
                            <CheckCircle className="ml-3 h-5 w-5" />
                          </>
                        )}
                      </Button>
                      
                      <div className="text-center">
                        <p className="text-gray-600 mb-3">Didn't receive the code?</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleResendCode}
                          disabled={resendLoading}
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                        >
                          {resendLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Resend Code'
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {!embed && (
      <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-slate-50/30 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
        <div className="absolute top-20 right-20 w-80 h-80 bg-emerald-100/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-blue-100/20 rounded-full blur-3xl -z-10" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-gradient-to-r from-emerald-600 to-blue-600 text-white border-0 px-4 py-2">
              <HelpCircle className="w-4 h-4 mr-2" />
              Get Answers
            </Badge>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-emerald-800 to-blue-800 bg-clip-text text-transparent pb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Everything you need to know about commissions, tiers, onboarding, and growing your affiliate business.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid gap-6">
              {/* FAQ Item 1 */}
              <Card className="group border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    How fast are commission payouts?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    We process commissions monthly. Payouts are made once per month for confirmed conversions, with reporting available in your affiliate dashboard.
                  </p>
                </CardContent>
              </Card>

              {/* FAQ Item 2 */}
              <Card className="group border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    Can I switch between program tiers later?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Yes, you can upgrade from Affiliate to Partner or <span className="font-semibold text-orange-600">White Label (Coming Soon)</span> at any time. Contact your account manager to discuss tier upgrades and the additional benefits available at higher levels.
                  </p>
                </CardContent>
              </Card>

              {/* FAQ Item 3 */}
              <Card className="group border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    What marketing materials do you provide?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    We only provide a landing page. Nothing else is included.
                  </p>
                </CardContent>
              </Card>

              {/* FAQ Item 4 */}
              <Card className="group border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    How do I track my performance and earnings?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    Your affiliate dashboard provides real-time tracking of clicks, conversions, earnings, and detailed analytics. You'll have access to advanced reporting tools and performance insights to optimize your campaigns.
                  </p>
                </CardContent>
              </Card>

              {/* FAQ Item 5 */}
              <Card className="group border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Handshake className="w-5 h-5 text-white" />
                    </div>
                    What support do you provide to affiliates?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    We offer dedicated account management and technical support. Our team is committed to helping you maximize your earning potential.
                  </p>
                </CardContent>
              </Card>

              {/* FAQ Item 6 */}
              <Card className="group border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500" />
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    Are there any restrictions on promotional methods?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed text-lg">
                    We maintain high standards for brand representation. Spam, misleading claims, and trademark bidding are prohibited. Our affiliate agreement outlines all promotional guidelines to ensure quality partnerships.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Contact Support CTA */}
            <div className="text-center mt-16">
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-8 border border-emerald-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Still have questions?</h3>
                <p className="text-gray-600 mb-6 text-lg">Our affiliate support team is here to help you succeed.</p>
                <Button asChild size="lg" className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 px-8 py-4 text-lg group">
                  <Link to="/contact" className="flex items-center gap-3">
                    Contact Support
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {!embed && (
      <div className="bg-white py-8 px-4 border-t border-gray-100">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Disclaimer: Results vary. Past performance does not guarantee future earnings. All affiliates must adhere to FTC and truthful advertising standards.
          </p>
        </div>
      </div>
      )}

      {!embed && <Footer />}
    </div>
  );
};

export default JoinAffiliate;
