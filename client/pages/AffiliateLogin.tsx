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
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { authApi, setAuthToken } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { usePortalLoginRedirect } from "@/hooks/usePortalLoginRedirect";
import { getPortalNavigationTarget } from "@/lib/hostRouting";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  HelpCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";

export default function AffiliateLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshProfile } = useAuthContext();

  usePortalLoginRedirect({ allowedRoles: ["affiliate", "admin", "super_admin"] });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "code" | "reset">("email");
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
      savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log("Attempting affiliate login with:", loginData.email);
      const response = await authApi.affiliateLogin(loginData);
      
      console.log("Affiliate login response:", response);
      
      // Handle axios response structure - check for error in response.data
      if (response.data?.error) {
        toast({
          title: "Login Failed",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }
      
      // Check for token in response.data (axios wraps the response)
      if (response.data?.token) {
        console.log("Token received:", response.data.token);
        
        // Clear any existing tokens first
        localStorage.removeItem("auth_token");
        
        // Store token using the same method as other login pages
        setAuthToken(response.data.token);
        
        // Verify token was stored
        const storedToken = localStorage.getItem("auth_token");
        console.log("Token stored in localStorage:", storedToken);
        
        // Store additional user info
        localStorage.setItem("userRole", "affiliate");
        localStorage.setItem("userId", response.data.user.id.toString());
        localStorage.setItem("userName", `${response.data.user.first_name} ${response.data.user.last_name}`);

        // Ensure AuthContext has up-to-date profile
        await refreshProfile();
        clearPortalReturnContext();
        
        toast({
          title: "Welcome back!",
          description: "Successfully logged in to Affiliate Dashboard.",
        });
        
        const dashboardTarget = getPortalNavigationTarget("affiliate", "/dashboard");
        if (dashboardTarget.external) {
          window.location.href = dashboardTarget.target;
          return;
        }
        navigate(dashboardTarget.target);
      } else {
        toast({
          title: "Login Failed",
          description: "No authentication token received",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Affiliate login error:", error);
      
      // Handle axios error response
      const errorMessage = error.response?.data?.error || error.message || "An error occurred during login. Please try again.";
      
      toast({
        title: "Login Error",
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
      const response = await fetch('/api/auth/affiliate/forgot-password', {
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
      const response = await fetch('/api/auth/affiliate/verify-reset-code', {
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

      if (response.ok) {
        setForgotPasswordData(prev => ({ ...prev, resetToken: data.resetToken }));
        setForgotPasswordStep("reset");
        toast({
          title: "Code Verified",
          description: "Please enter your new password.",
        });
      } else {
        toast({
          title: "Verification Failed",
          description: data.error || "Invalid or expired verification code",
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
      const response = await fetch('/api/auth/affiliate/reset-password', {
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

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark";
    setIsDarkMode(!isDarkMode);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", !isDarkMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-green-900 dark:to-teal-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20"
      >
        {isDarkMode ? "☀️" : "🌙"}
      </Button>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-teal-600 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-green-600 to-teal-600 p-4 rounded-full shadow-2xl">
                <DollarSign className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Affiliate Portal
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Access your affiliate dashboard and earnings
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Sign In
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              Enter your affiliate credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-200">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="affiliate@company.com"
                    value={loginData.email}
                    onChange={handleInputChange}
                    className="pl-10 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginData.password}
                    onChange={handleInputChange}
                    className="pl-10 pr-10 bg-white/50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 focus:border-green-500 dark:focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Button
                  variant="link"
                  className="text-sm p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
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
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Access Affiliate Dashboard
                  </div>
                )}
              </Button>
            </form>

            {/* Features */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center mb-4">
                Affiliate Features
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <TrendingUp className="h-3 w-3 mr-2 text-green-500" />
                  Earnings Tracking
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <BarChart3 className="h-3 w-3 mr-2 text-teal-500" />
                  Performance Analytics
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Users className="h-3 w-3 mr-2 text-emerald-500" />
                  Referral Management
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Clock className="h-3 w-3 mr-2 text-green-600" />
                  Real-time Reports
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forgot Password Modal/Overlay */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-8 w-8 p-0"
                onClick={resetForgotPasswordFlow}
              >
                ×
              </Button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {forgotPasswordStep === "email" && "Reset Password"}
                  {forgotPasswordStep === "code" && "Enter Verification Code"}
                  {forgotPasswordStep === "reset" && "Set New Password"}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  {forgotPasswordStep === "email" && "Enter your affiliate email address to receive a verification code"}
                  {forgotPasswordStep === "code" && "Enter the 6-digit code sent to your email"}
                  {forgotPasswordStep === "reset" && "Create a new secure password for your affiliate account"}
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
                        placeholder="affiliate@company.com"
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
                    className="w-full h-11 bg-green-600 hover:bg-green-700 text-white"
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
                      className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white"
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
                      className="flex-1 h-11 bg-green-600 hover:bg-green-700 text-white"
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

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Need help with your affiliate account?{" "}
            <Link
              to="/contact"
              className="text-green-600 hover:text-green-700 dark:text-green-400 font-medium"
            >
              Contact Support
            </Link>
          </p>
          <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-200">
              ← Back to Main Site
            </Link>
            <span>|</span>
            <Link to="/login" className="hover:text-gray-700 dark:hover:text-gray-200">
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}