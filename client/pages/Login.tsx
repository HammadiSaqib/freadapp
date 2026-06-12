import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { authApi, setAuthToken } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { usePortalLoginRedirect } from "@/hooks/usePortalLoginRedirect";
import { isBasicAdminPortalHost, resolveAdminPortalTarget } from "@/lib/adminPortalAccess";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import BasicLogin from "@/components/BasicLogin";
import {
  CreditCard,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Users,
  TrendingUp,
  Award,
  Globe,
  Building,
  Zap,
  Star,
  Play,
  BarChart3,
  Target,
  Brain,
  MessageSquare,
  Calendar,
  FileText,
  UserPlus,
  DollarSign,
  Rocket,
  Lightbulb,
  Phone,
} from "lucide-react";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [animationStep, setAnimationStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleConfigLoaded, setGoogleConfigLoaded] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshProfile } = useAuthContext();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  usePortalLoginRedirect({ allowedRoles: ["admin", "super_admin"] });

  // Form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
    phone: "",
    company_name: "",
    terms: false,
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

  const [verificationData, setVerificationData] = useState({
    email: "",
    code: "",
  });

  const [showVerification, setShowVerification] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState("email"); // "email", "code", "reset"
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
    resetToken: "",
  });

  // Check for existing theme and apply it
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const shouldBeDark =
      savedTheme === "dark" || (savedTheme === "system" && prefersDark);

    setIsDarkMode(shouldBeDark);

    // Apply theme to document
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (shouldBeDark) {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
  }, []);

  // Add a temporary toggle for testing
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (newTheme) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  };

  // Animated statistics
  const [stats, setStats] = useState({
    professionals: 0,
    successRate: 0,
    reportsProcessed: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep((prev) => (prev + 1) % 4);
    }, 3000);

    // Animate stats on load
    const timer = setTimeout(() => {
      setStats({
        professionals: 10000,
        successRate: 95,
        reportsProcessed: 1000,
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const completeAdminLogin = useCallback(
    async (payload: any, successTitle: string, successDescription: string) => {
      if (!payload?.token) {
        toast({
          title: "Login Error",
          description: "Authentication succeeded but no token was returned.",
          variant: "destructive",
        });
        return;
      }

      setAuthToken(payload.token);
      const profileResponse = await authApi.getProfile();
      const profile = profileResponse.data?.user || profileResponse.data;
      await refreshProfile();
      clearPortalReturnContext();
      toast({
        title: successTitle,
        description: successDescription,
      });

      const dashboardTarget = resolveAdminPortalTarget("/dashboard", profile);
      if (dashboardTarget.external) {
        window.location.href = dashboardTarget.target;
        return;
      }

      navigate(dashboardTarget.target);
    },
    [navigate, refreshProfile, toast],
  );

  useEffect(() => {
    let cancelled = false;

    const loadGoogleConfig = async () => {
      try {
        const response = await authApi.getGoogleConfig();
        const clientId = String(response.data?.clientId || "").trim();

        if (!cancelled && response.data?.enabled && clientId) {
          setGoogleClientId(clientId);
        }
      } catch (error) {
        console.warn("Google sign-in config unavailable:", error);
      } finally {
        if (!cancelled) {
          setGoogleConfigLoaded(true);
        }
      }
    };

    loadGoogleConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoogleCredential = useCallback(
    async (credential: string) => {
      setIsGoogleLoading(true);

      try {
        const response = await authApi.googleLogin({ credential });
        await completeAdminLogin(
          response.data,
          "Welcome back!",
          "Successfully signed in with Google.",
        );
      } catch (error: any) {
        console.error("Google login error:", error);
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          "Google sign-in failed. Please try again.";

        toast({
          title: "Google Sign-In Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsGoogleLoading(false);
      }
    },
    [completeAdminLogin, toast],
  );

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) {
        return;
      }

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: GoogleCredentialResponse) => {
          if (response?.credential) {
            handleGoogleCredential(response.credential);
            return;
          }

          toast({
            title: "Google Sign-In Failed",
            description: "Google did not return a sign-in credential.",
            variant: "destructive",
          });
        },
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: true,
        context: "signin",
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: isDarkMode ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: Math.min(360, googleButtonRef.current.offsetWidth || 360),
        logo_alignment: "left",
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    let script = document.getElementById(
      "google-identity-services",
    ) as HTMLScriptElement | null;

    const handleLoad = () => renderGoogleButton();
    const handleError = () => {
      if (!cancelled) {
        toast({
          title: "Google Sign-In Unavailable",
          description: "The Google sign-in script could not be loaded.",
          variant: "destructive",
        });
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = "google-identity-services";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);

      if (window.google?.accounts?.id) {
        renderGoogleButton();
      }
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, [googleClientId, handleGoogleCredential, isDarkMode, toast]);

  const testApiConnection = async () => {
    try {
      console.log("Testing API connection...");
      const response = await fetch("/api/ping");
      console.log("Ping response status:", response.status);
      const data = await response.json();
      console.log("Ping response data:", data);
      alert("API connection test successful!");
    } catch (error) {
      console.error("API connection test failed:", error);
      alert("API connection test failed: " + error.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Attempting login with:", loginData.email);

      // First, check if demo user exists
      const checkResponse = await fetch("/api/check-demo-user");
      if (checkResponse.ok) {
        const userCheck = await checkResponse.json();
        console.log("Demo user check:", userCheck);
      }

      const response = await authApi.login({
        email: loginData.email,
        password: loginData.password
      });

      console.log("Login response:", response);

      if (response.error) {
        toast({
          title: "Login Failed",
          description: response.error,
          variant: "destructive",
        });
        return;
      }

      await completeAdminLogin(
        response.data,
        "Welcome back!",
        "Successfully logged in to your dashboard.",
      );
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation logic matching Register page
    if (!signupData.first_name.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive",
      });
      return;
    }
    if (!signupData.last_name.trim()) {
      toast({
        title: "Validation Error", 
        description: "Last name is required",
        variant: "destructive",
      });
      return;
    }
    if (!signupData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }
    if (!signupData.email.includes('@') || !signupData.email.includes('.')) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    const normalizedPhone = signupData.phone.replace(/[^\d+]/g, '');
    if (!normalizedPhone) {
      toast({
        title: "Validation Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }
    if (!/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    if (signupData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (!signupData.terms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms of Service to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const registrationData = {
        first_name: signupData.first_name,
        last_name: signupData.last_name,
        email: signupData.email,
        phone: normalizedPhone,
        company_name: signupData.company_name || null,
        password: signupData.password,
      };

      const response = await authApi.register(registrationData);

      console.log('Registration response:', response.data);

      if (response.data?.success) {
        // Store the token and redirect to dashboard
        if (response.data.data?.token) {
          setAuthToken(response.data.data.token);
          await refreshProfile();
          toast({
            title: "Registration Successful",
            description: "Welcome! Please verify your email address in the dashboard.",
          });
          navigate("/dashboard");
        } else {
          toast({
            title: "Registration Error",
            description: "Registration successful but no token received. Please try logging in.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Registration Failed",
          description: response.data?.message || "Registration failed",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Registration failed. Please try again.';
      toast({
        title: "Registration Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationData.code.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.verifyEmail({
        email: verificationData.email,
        code: verificationData.code,
      });

      console.log('Verification response:', response.data);

      if (response.data?.success) {
        // Store the token and user data for auto-login
        if (response.data.token) {
          setAuthToken(response.data.token);
          await refreshProfile();
          console.log('Token stored for auto-login');
        }
        
        toast({
          title: "Account Created!",
          description: "Welcome to The Capsol. Your account has been created successfully.",
        });
        
        // Navigate to admin dashboard after successful verification and auto-login
        setTimeout(() => {
          navigate('/dashboard');
          // Refresh the dashboard after navigation to ensure fresh data
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }, 1500);
      } else {
        toast({
          title: "Verification Failed",
          description: response.data?.message || "Invalid verification code",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Verification failed. Please try again.';
      toast({
        title: "Verification Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password functions
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotPasswordData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordStep("code");
        toast({
          title: "Verification Code Sent",
          description: "Please check your email for the verification code.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to send verification code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotPasswordData.email,
          code: forgotPasswordData.code,
        }),
      });

      const data = await response.json();

      if (response.ok && data.resetToken) {
        setForgotPasswordData(prev => ({ ...prev, resetToken: data.resetToken }));
        setForgotPasswordStep("reset");
        toast({
          title: "Code Verified",
          description: "Please enter your new password.",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid verification code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (forgotPasswordData.newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resetToken: forgotPasswordData.resetToken,
          newPassword: forgotPasswordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Reset all forgot password state
        setShowForgotPassword(false);
        setForgotPasswordStep("email");
        setForgotPasswordData({
          email: "",
          code: "",
          newPassword: "",
          confirmPassword: "",
          resetToken: "",
        });
        
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset. Please log in with your new password.",
        });
      } else {
        toast({
          title: "Reset Failed",
          description: data.error || "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForgotPasswordFlow = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep("email");
    setForgotPasswordData({
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
      resetToken: "",
    });
  };

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Credit File Insights & Readiness Indicators",
      description: "Informational underwriting-style review tools",
    },
    {
      icon: Shield,
      title: "Secure Data Encryption",
      description: "End-to-end encryption for client data and communications",
    },
    {
      icon: Users,
      title: "Client Management",
      description: "Complete CRM for funding professionals with The Capsol",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Deep insights into your business performance",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Rodriguez",
      company: "Credit Solutions Inc.",
      text: "The Capsol improved our workflow efficiency significantly.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      company: "Elite Funding",
      text: "The AI tools helped us structure our disputes more effectively.",
      rating: 5,
    },
    {
      name: "David Johnson",
      company: "Financial Freedom LLC",
      text: "White label solution allowed us to scale our operations effectively.",
      rating: 5,
    },
  ];

  if (isBasicAdminPortalHost(window.location.hostname, window.location.port)) {
    return (
      <BasicLogin
        loginData={loginData}
        setLoginData={setLoginData}
        signupData={signupData}
        setSignupData={setSignupData}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isLoading={isLoading}
        isGoogleLoading={isGoogleLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogin={handleLogin}
        handleSignup={handleSignup}
        setShowForgotPassword={setShowForgotPassword}
        setForgotPasswordData={setForgotPasswordData}
        googleButtonRef={googleButtonRef}
        showVerification={showVerification}
        verificationData={verificationData}
        setVerificationData={setVerificationData}
        handleVerification={handleVerification}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800/95 dark:to-slate-900 relative overflow-hidden">
      {/* Animated background elements with images */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background image overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white/40 to-emerald-50/60 dark:from-slate-800/90 dark:via-slate-700/80 dark:to-slate-800/90"></div>

        {/* Floating business images */}
        <div className="absolute top-20 right-20 w-64 h-40 rounded-2xl overflow-hidden shadow-2xl opacity-10 rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/577195/pexels-photo-577195.jpeg"
            alt="Financial analytics dashboard"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute bottom-32 left-20 w-56 h-36 rounded-2xl overflow-hidden shadow-2xl opacity-10 -rotate-12 hover:opacity-20 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/7821529/pexels-photo-7821529.jpeg"
            alt="Credit analysis professional"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="absolute top-1/3 left-1/3 w-48 h-32 rounded-2xl overflow-hidden shadow-2xl opacity-5 rotate-45 hover:opacity-15 transition-opacity duration-500">
          <img
            src="https://images.pexels.com/photos/5816286/pexels-photo-5816286.jpeg"
            alt="Business meeting collaboration"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-ocean-blue/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sea-green/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-300/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Left Side - Enhanced Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-ocean-blue via-cyan-blue to-sea-green dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 p-8 xl:p-12 text-white relative overflow-hidden">
          {/* Background pattern with credit-themed imagery */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 dark:from-slate-600/20 to-transparent"></div>

          {/* Hero image overlay */}
          <div className="absolute top-0 right-0 w-1/2 h-1/2 opacity-20 rounded-bl-3xl overflow-hidden">
            <img
              src="https://images.pexels.com/photos/577195/pexels-photo-577195.jpeg"
              alt="Credit Score analytics dashboard"
              className="w-full h-full object-cover scale-110 hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-ocean-blue/20 dark:via-slate-600/30 to-sea-green/40 dark:to-slate-500/40"></div>
          </div>

          <div className="absolute bottom-0 left-0 w-1/2 h-1/3 opacity-15 rounded-tr-3xl overflow-hidden">
            <img
              src="https://images.pexels.com/photos/5816286/pexels-photo-5816286.jpeg"
              alt="Professional funding consultation"
              className="w-full h-full object-cover scale-110 hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-sea-green/20 dark:via-slate-600/30 to-cyan-blue/40 dark:to-slate-500/40"></div>
          </div>

          <div
            className={
              'absolute inset-0 bg-[url(\'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\')] opacity-10'
            }
          ></div>

          <div className="relative z-10 flex flex-col justify-between w-full">
            {/* Header */}
            <div>
              <Link to="/" className="flex items-center space-x-3 mb-12">
                <img src="/company-logo.svg" alt="The Capsol" className="w-20 h-14" />
                <div>
                  <span className="text-3xl font-bold">The Capsol</span>
                  <div className="text-white/80 text-sm">
                    AI-Powered Credit Solutions
                  </div>
                </div>
              </Link>

              <div className="space-y-10">
                <div>
                  <h1 className="text-4xl xl:text-5xl font-bold mb-6 leading-tight">
                    Analyze and manage your
                    <span className="block bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                      credit data with AI-powered insights.
                    </span>
                  </h1>
                  <p className="text-lg xl:text-xl text-white/90 leading-relaxed max-w-lg">
                    Used by many credit professionals for analysis and workflow automation
                    to streamline their operations.
                  </p>

                  {/* Success metrics highlight */}
                  <div className="mt-6 flex items-center space-x-6 text-white/80">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        AI-Assisted Credit Insights
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse delay-300"></div>
                      <span className="text-sm font-medium">
                        Informational underwriting-style review tools
                      </span>
                    </div>
                  </div>
                </div>

                {/* Animated Features */}
                <div className="space-y-6">
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    const isActive = animationStep === index;
                    return (
                      <div
                        key={index}
                        className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-500 ${
                          isActive
                            ? "bg-white/20 scale-105 shadow-lg"
                            : "bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500 ${
                            isActive ? "bg-white/30 scale-110" : "bg-white/10"
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {feature.title}
                          </div>
                          <div className="text-white/80 text-sm">
                            {feature.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side - Enhanced Authentication Forms */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
          <div className="w-full max-w-md lg:max-w-lg xl:max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center mb-8">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-ocean-blue to-sea-green rounded-2xl flex items-center justify-center shadow-lg">
                  <CreditCard className="h-7 w-7 text-white" />
                </div>
                <div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-ocean-blue to-sea-green bg-clip-text text-transparent">
                    The Capsol
                  </span>
                  <div className="text-muted-foreground text-sm">
                    AI-Powered Platform
                  </div>
                </div>
              </Link>
            </div>

            <Card className="border-0 shadow-2xl bg-white/95 dark:bg-gradient-to-br dark:from-slate-800/95 dark:to-slate-700/95 dark:border-slate-600/30 backdrop-blur-lg">
              <CardHeader className="text-center pb-4 pt-6">
                <div className="w-16 h-16 bg-gradient-to-r from-ocean-blue to-sea-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl gradient-text-primary mb-2">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Access your professional A.I Power Funding Solution Dashboard
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 px-6 pb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-light dark:bg-gradient-to-r dark:from-slate-700/80 dark:to-slate-600/80 dark:border-slate-600">
                    <TabsTrigger
                      value="login"
                      className="data-[state=active]:gradient-primary data-[state=active]:text-white"
                    >
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="data-[state=active]:gradient-primary data-[state=active]:text-white"
                    >
                      Create Account
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email Address
                        </Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-ocean-blue transition-colors" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="enter@email.com"
                            className="pl-10 h-11 bg-gradient-light dark:bg-gradient-to-r dark:from-slate-700/80 dark:to-slate-600/80 dark:border-slate-600 border-border/40 focus:border-ocean-blue/60 dark:focus:border-ocean-blue/80 focus:ring-ocean-blue/20 transition-all"
                            value={loginData.email}
                            onChange={(e) =>
                              setLoginData({
                                ...loginData,
                                email: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="password"
                          className="text-sm font-medium"
                        >
                          Password
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-ocean-blue transition-colors" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pl-10 pr-12 h-11 bg-gradient-light dark:bg-gradient-to-r dark:from-slate-700/80 dark:to-slate-600/80 dark:border-slate-600 border-border/40 focus:border-ocean-blue/60 dark:focus:border-ocean-blue/80 focus:ring-ocean-blue/20 transition-all"
                            value={loginData.password}
                            onChange={(e) =>
                              setLoginData({
                                ...loginData,
                                password: e.target.value,
                              })
                            }
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 hover:bg-ocean-blue/10"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember"
                            checked={loginData.remember}
                            onCheckedChange={(checked) =>
                              setLoginData({
                                ...loginData,
                                remember: !!checked,
                              })
                            }
                          />
                          <Label htmlFor="remember" className="text-sm">
                            Remember me
                          </Label>
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          className="text-sm p-0 text-ocean-blue hover:text-sea-green"
                          onClick={() => {
                            setShowForgotPassword(true);
                            setForgotPasswordData(prev => ({ ...prev, email: loginData.email }));
                          }}
                        >
                          Forgot password?
                        </Button>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-11 text-base gradient-primary hover:opacity-90 shadow-lg"
                        disabled={isLoading || isGoogleLoading}
                      >
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Signing in...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>Sign In to Dashboard</span>
                            <ArrowRight className="h-5 w-5" />
                          </div>
                        )}
                      </Button>

                    </form>
                  </TabsContent>

                  {/* Forgot Password Modal/Overlay */}
                  {showForgotPassword && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-2 h-8 w-8 p-0"
                          onClick={resetForgotPasswordFlow}
                        >
                          ×
                        </Button>

                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="h-8 w-8 text-white" />
                          </div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {forgotPasswordStep === "email" && "Reset Password"}
                            {forgotPasswordStep === "code" && "Enter Verification Code"}
                            {forgotPasswordStep === "reset" && "Set New Password"}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-300 mt-2">
                            {forgotPasswordStep === "email" && "Enter your email address to receive a verification code"}
                            {forgotPasswordStep === "code" && "Enter the 6-digit code sent to your email"}
                            {forgotPasswordStep === "reset" && "Create a new secure password for your account"}
                          </p>
                        </div>

                        {/* Email Step */}
                        {forgotPasswordStep === "email" && (
                          <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="forgotEmail" className="text-sm font-medium">
                                Email Address
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="forgotEmail"
                                  type="email"
                                  placeholder="Enter your email address"
                                  className="pl-10 h-11"
                                  value={forgotPasswordData.email}
                                  onChange={(e) =>
                                    setForgotPasswordData(prev => ({
                                      ...prev,
                                      email: e.target.value,
                                    }))
                                  }
                                  required
                                />
                              </div>
                            </div>
                            <Button
                              type="submit"
                              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  <span>Sending Code...</span>
                                </div>
                              ) : (
                                "Send Verification Code"
                              )}
                            </Button>
                          </form>
                        )}

                        {/* Code Verification Step */}
                        {forgotPasswordStep === "code" && (
                          <form onSubmit={handleVerifyResetCode} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="resetCode" className="text-sm font-medium">
                                Verification Code
                              </Label>
                              <Input
                                id="resetCode"
                                type="text"
                                placeholder="Enter 6-digit code"
                                className="h-11 text-center text-2xl font-mono tracking-widest"
                                value={forgotPasswordData.code}
                                onChange={(e) =>
                                  setForgotPasswordData(prev => ({
                                    ...prev,
                                    code: e.target.value.replace(/\D/g, '').slice(0, 6),
                                  }))
                                }
                                maxLength={6}
                                required
                              />
                            </div>
                            <div className="text-center text-sm text-gray-600 dark:text-gray-300">
                              Code sent to: <strong>{forgotPasswordData.email}</strong>
                            </div>
                            <div className="flex space-x-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-11"
                                onClick={() => setForgotPasswordStep("email")}
                              >
                                Back
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
                                disabled={isLoading || forgotPasswordData.code.length !== 6}
                              >
                                {isLoading ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                  </div>
                                ) : (
                                  "Verify Code"
                                )}
                              </Button>
                            </div>
                          </form>
                        )}

                        {/* Password Reset Step */}
                        {forgotPasswordStep === "reset" && (
                          <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="newPassword" className="text-sm font-medium">
                                New Password
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="newPassword"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter new password"
                                  className="pl-10 pr-12 h-11"
                                  value={forgotPasswordData.newPassword}
                                  onChange={(e) =>
                                    setForgotPasswordData(prev => ({
                                      ...prev,
                                      newPassword: e.target.value,
                                    }))
                                  }
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                Confirm Password
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="confirmPassword"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Confirm new password"
                                  className="pl-10 h-11"
                                  value={forgotPasswordData.confirmPassword}
                                  onChange={(e) =>
                                    setForgotPasswordData(prev => ({
                                      ...prev,
                                      confirmPassword: e.target.value,
                                    }))
                                  }
                                  required
                                />
                              </div>
                            </div>
                            <div className="flex space-x-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 h-11"
                                onClick={() => setForgotPasswordStep("code")}
                              >
                                Back
                              </Button>
                              <Button
                                type="submit"
                                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white"
                                disabled={isLoading}
                              >
                                {isLoading ? (
                                  <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Resetting...</span>
                                  </div>
                                ) : (
                                  "Reset Password"
                                )}
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  )}

                  <TabsContent value="signup">
                    {!showVerification ? (
                      <form onSubmit={handleSignup} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="firstName"
                            className="text-sm font-medium"
                          >
                            First Name
                          </Label>
                          <Input
                            id="firstName"
                            placeholder="John"
                            className="h-11 bg-gradient-light dark:bg-gradient-to-r dark:from-slate-700/80 dark:to-slate-600/80 dark:border-slate-600 border-border/40 focus:border-ocean-blue/60 dark:focus:border-ocean-blue/80 focus:ring-ocean-blue/20"
                            value={signupData.first_name}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                first_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="lastName"
                            className="text-sm font-medium"
                          >
                            Last Name
                          </Label>
                          <Input
                            id="lastName"
                            placeholder="Doe"
                            className="h-11 bg-gradient-light dark:bg-gradient-to-r dark:from-slate-700/80 dark:to-slate-600/80 dark:border-slate-600 border-border/40 focus:border-ocean-blue/60 dark:focus:border-ocean-blue/80 focus:ring-ocean-blue/20"
                            value={signupData.last_name}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                last_name: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="signupEmail"
                          className="text-sm font-medium"
                        >
                          Email Address
                        </Label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-ocean-blue transition-colors" />
                          <Input
                            id="signupEmail"
                            type="email"
                            placeholder="enter@email.com"
                            className="pl-10 h-11 bg-gradient-light dark:bg-slate-700 border-border/40 focus:border-ocean-blue/40 focus:ring-ocean-blue/20"
                            value={signupData.email}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                email: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="signupPhone"
                          className="text-sm font-medium"
                        >
                          Phone Number
                        </Label>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-ocean-blue transition-colors" />
                          <Input
                            id="signupPhone"
                            type="tel"
                            inputMode="tel"
                            placeholder="+1 555 123 4567"
                            className="pl-10 h-11 bg-gradient-light dark:bg-slate-700 border-border/40 focus:border-ocean-blue/40 focus:ring-ocean-blue/20"
                            value={signupData.phone}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                phone: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="company"
                          className="text-sm font-medium"
                        >
                          Company Name
                        </Label>
                        <div className="relative group">
                          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-ocean-blue transition-colors" />
                          <Input
                            id="company"
                            placeholder="Your Funding Company"
                            className="pl-10 h-11 bg-gradient-light dark:bg-slate-700 border-border/40 focus:border-ocean-blue/40 focus:ring-ocean-blue/20"
                            value={signupData.company_name}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                company_name: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="signupPassword"
                          className="text-sm font-medium"
                        >
                          Password
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-ocean-blue transition-colors" />
                          <Input
                            id="signupPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            className="pl-10 pr-12 h-11 bg-gradient-light dark:bg-slate-700 border-border/40 focus:border-ocean-blue/40 focus:ring-ocean-blue/20"
                            value={signupData.password}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                password: e.target.value,
                              })
                            }
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 hover:bg-ocean-blue/10"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="confirmPassword"
                          className="text-sm font-medium"
                        >
                          Confirm Password
                        </Label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-ocean-blue transition-colors" />
                          <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="pl-10 h-11 bg-gradient-light dark:bg-slate-700 border-border/40 focus:border-ocean-blue/40 focus:ring-ocean-blue/20"
                            value={signupData.confirmPassword}
                            onChange={(e) =>
                              setSignupData({
                                ...signupData,
                                confirmPassword: e.target.value,
                              })
                            }
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="terms"
                          className="mt-1"
                          checked={signupData.terms}
                          onCheckedChange={(checked) =>
                            setSignupData({ ...signupData, terms: !!checked })
                          }
                        />
                        <Label
                          htmlFor="terms"
                          className="text-sm leading-relaxed"
                        >
                          I agree to the{" "}
                          <Link
                            to="/terms"
                            className="text-sm text-ocean-blue hover:text-sea-green hover:underline"
                            target="_blank"
                          >
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link
                            to="/privacy"
                            className="text-sm text-ocean-blue hover:text-sea-green hover:underline"
                            target="_blank"
                          >
                            Privacy Policy
                          </Link>
                        </Label>
                      </div>

                      <Button
                          type="submit"
                          className="w-full h-11 text-base gradient-primary hover:opacity-90 shadow-lg"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Sending verification...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>Create Account</span>
                              <Rocket className="h-5 w-5" />
                            </div>
                          )}
                        </Button>


                      </form>
                    ) : (
                      <form onSubmit={handleVerification} className="space-y-4">
                        <div className="text-center space-y-2">
                          <Mail className="h-12 w-12 text-ocean-blue mx-auto" />
                          <h3 className="text-lg font-semibold">Check Your Email</h3>
                          <p className="text-sm text-muted-foreground">
                            We've sent a verification code to <strong>{verificationData.email}</strong>
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label
                            htmlFor="verificationCode"
                            className="text-sm font-medium"
                          >
                            Verification Code
                          </Label>
                          <Input
                            id="verificationCode"
                            type="text"
                            placeholder="Enter 6-digit code"
                            className="h-11 text-center text-lg tracking-widest bg-gradient-light dark:bg-slate-700 border-border/40 focus:border-ocean-blue/40 focus:ring-ocean-blue/20"
                            value={verificationData.code}
                            onChange={(e) =>
                              setVerificationData({
                                ...verificationData,
                                code: e.target.value.replace(/\D/g, '').slice(0, 6),
                              })
                            }
                            maxLength={6}
                            required
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full h-11 text-base gradient-primary hover:opacity-90 shadow-lg"
                          disabled={isLoading || verificationData.code.length !== 6}
                        >
                          {isLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Verifying...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>Verify & Create Account</span>
                              <CheckCircle className="h-5 w-5" />
                            </div>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => setShowVerification(false)}
                        >
                          Back to Registration
                        </Button>
                      </form>
                    )}
                  </TabsContent>
                </Tabs>

                {/* Google Sign-In - shared across tabs */}
                <div className="relative py-1 mt-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/40 dark:border-slate-600/60" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <span className="bg-white px-3 dark:bg-slate-800">Or continue with</span>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  <div
                    ref={googleButtonRef}
                    className="flex min-h-[44px] items-center justify-center overflow-hidden rounded-xl"
                  />
                  {isGoogleLoading && (
                    <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-ocean-blue animate-spin" />
                      <span>Signing in with Google...</span>
                    </div>
                  )}
                  {googleConfigLoaded && !googleClientId && (
                    <p className="text-center text-xs text-muted-foreground">
                      Google sign-in is currently unavailable.
                    </p>
                  )}
                </div>

                {/* Trust Indicators */}
                <div className="mt-4 p-4 bg-gradient-light dark:bg-gradient-to-r dark:from-slate-700/70 dark:to-slate-600/70 dark:border dark:border-slate-600 rounded-xl">
                  <div className="flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Account Access Tools</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        Policy Transparency
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        Support Ready
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-[10px] text-muted-foreground">
                      Details shown are informational and may change over time.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bottom Links */}
            <div className="mt-4 text-center text-xs text-muted-foreground">
              <p>
                Need help?{" "}
                <Link
                  to="/contact"
                  className="text-sm text-ocean-blue hover:text-sea-green hover:underline"
                >
                  Contact Support
                </Link>
              </p>
              <div className="mt-2 flex justify-center space-x-6">
                <Link
                  to="/privacy"
                  className="text-xs text-muted-foreground hover:text-ocean-blue hover:underline"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="text-xs text-muted-foreground hover:text-ocean-blue hover:underline"
                >
                  Terms of Service
                </Link>
                <Link
                  to="/refund-policy"
                  className="text-xs text-muted-foreground hover:text-ocean-blue hover:underline"
                >
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
