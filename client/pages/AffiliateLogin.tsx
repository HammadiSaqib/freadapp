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
  Eye,
  EyeOff,
  Lock,
  Mail,
  DollarSign,
  TrendingUp,
  Users,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Sparkles,
  WalletCards,
  ShieldCheck,
} from "lucide-react";

const affiliateHighlights = [
  "Track referrals and commissions in one place",
  "Monitor dashboard performance in real time",
  "Access affiliate tools without changing workflows",
];

export default function AffiliateLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshProfile } = useAuthContext();

  usePortalLoginRedirect({ allowedRoles: ["affiliate", "admin", "super_admin"], portalAlias: "affiliate" });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<"email" | "code" | "reset">("email");
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
    resetToken: "",
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
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
      const response = await authApi.affiliateLogin(loginData);

      if (response.data?.error) {
        toast({
          title: "Login Failed",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }

      if (response.data?.token) {
        localStorage.removeItem("auth_token");
        setAuthToken(response.data.token);

        localStorage.setItem("userRole", "affiliate");
        localStorage.setItem("userId", response.data.user.id.toString());
        localStorage.setItem("userName", `${response.data.user.first_name} ${response.data.user.last_name}`);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/affiliate/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    } catch {
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
      const response = await fetch("/api/auth/affiliate/verify-reset-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: forgotPasswordData.email,
          code: forgotPasswordData.code,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordData((prev) => ({ ...prev, resetToken: data.resetToken }));
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
    } catch {
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
      const response = await fetch("/api/auth/affiliate/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resetToken: forgotPasswordData.resetToken,
          newPassword: forgotPasswordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
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
    } catch {
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
    <div className="min-h-screen overflow-hidden bg-[#f8fcf8] text-slate-950 dark:bg-[#07150d] dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(1,255,1,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(27,139,0,0.12),transparent_34%),linear-gradient(180deg,#f8fcf8_0%,#ffffff_46%,#eef9ef_100%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(119,221,119,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(0,66,37,0.92),transparent_42%),linear-gradient(180deg,#07150d_0%,#0b2416_48%,#04120a_100%)]" />

      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="absolute right-4 top-4 z-20 rounded-full border border-slate-200 bg-white/80 px-4 backdrop-blur-sm hover:bg-white dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
      >
        {isDarkMode ? "Light" : "Dark"}
      </Button>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_40px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[1.08fr_.92fr]">
          <section className="border-b border-slate-200 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-slate-200 lg:p-12 xl:p-14 dark:border-white/10">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Main Site
            </Link>

            <div className="mt-8 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100">
                <Sparkles className="h-4 w-4" />
                CapSol Affiliate Portal
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-5xl xl:text-6xl dark:text-white">
                Grow referrals with a
                <span className="block bg-gradient-to-r from-emerald-700 via-lime-600 to-green-500 bg-clip-text text-transparent dark:from-emerald-200 dark:via-lime-100 dark:to-white">
                  cleaner affiliate workspace.
                </span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Sign in to manage commissions, track performance, and access the same affiliate tools you already use — now in a more polished, easier-to-navigate layout.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {affiliateHighlights.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.05]">
                  <BadgeDollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
                <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-black">Performance visibility</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  See your activity, conversion movement, and earnings updates from one affiliate access point.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.05] dark:shadow-none">
                <div className="inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-black">Secure partner access</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Protected affiliate sign-in with password recovery and dashboard access preserved.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center p-5 sm:p-7 lg:p-8">
            <Card className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white shadow-none dark:border-white/10 dark:bg-[#07150d]/80">
              <CardHeader className="space-y-5 px-6 pt-6 sm:px-8 sm:pt-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg dark:bg-gradient-to-r dark:from-[#004225] dark:to-[#77dd77]">
                  <WalletCards className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">
                    Affiliate Login
                  </CardTitle>
                  <CardDescription className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                    Enter your affiliate credentials to access dashboard, commissions, referrals, and analytics.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="affiliate@company.com"
                        value={loginData.email}
                        onChange={handleInputChange}
                        className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-white/[0.04]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={handleInputChange}
                        className="h-14 rounded-2xl border-slate-200 pl-12 pr-12 text-base focus-visible:ring-emerald-500 dark:border-white/10 dark:bg-white/[0.04]"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 dark:hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                      Commissions, referrals, analytics
                    </div>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-sm font-semibold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-white"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setForgotPasswordData((prev) => ({ ...prev, email: loginData.email }));
                      }}
                    >
                      Forgot password?
                    </Button>
                  </div>

                  <Button
                    type="submit"
                    className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-emerald-700 dark:bg-gradient-to-r dark:from-[#004225] dark:to-[#77dd77] dark:hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Signing In...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Access Affiliate Dashboard
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Earnings</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <BarChart3 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Analytics</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Referrals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#08160d]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                  {forgotPasswordStep === "email" && "Reset Password"}
                  {forgotPasswordStep === "code" && "Verify Code"}
                  {forgotPasswordStep === "reset" && "Create New Password"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {forgotPasswordStep === "email" && "Enter your affiliate email address to receive a verification code."}
                  {forgotPasswordStep === "code" && "Enter the 6-digit code sent to your email."}
                  {forgotPasswordStep === "reset" && "Set a new secure password for your affiliate account."}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
                onClick={resetForgotPasswordFlow}
              >
                Close
              </button>
            </div>

            {forgotPasswordStep === "email" && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail" className="text-sm font-bold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="affiliate@company.com"
                      className="h-14 rounded-2xl border-slate-200 pl-12 dark:border-white/10 dark:bg-white/[0.04]"
                      value={forgotPasswordData.email}
                      onChange={(e) =>
                        setForgotPasswordData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="h-14 w-full rounded-2xl bg-slate-950 font-bold text-white hover:bg-emerald-700" disabled={isLoading}>
                  {isLoading ? "Sending Code..." : "Send Verification Code"}
                </Button>
              </form>
            )}

            {forgotPasswordStep === "code" && (
              <form onSubmit={handleVerifyResetCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="resetCode" className="text-sm font-bold">Verification Code</Label>
                  <Input
                    id="resetCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    className="h-14 rounded-2xl border-slate-200 text-center text-2xl font-mono tracking-[0.35em] dark:border-white/10 dark:bg-white/[0.04]"
                    value={forgotPasswordData.code}
                    onChange={(e) =>
                      setForgotPasswordData((prev) => ({
                        ...prev,
                        code: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    maxLength={6}
                    required
                  />
                </div>
                <p className="text-center text-sm text-slate-600 dark:text-slate-300">
                  Code sent to <strong>{forgotPasswordData.email}</strong>
                </p>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="h-14 flex-1 rounded-2xl" onClick={() => setForgotPasswordStep("email")}>
                    Back
                  </Button>
                  <Button type="submit" className="h-14 flex-1 rounded-2xl bg-slate-950 font-bold text-white hover:bg-emerald-700" disabled={isLoading || forgotPasswordData.code.length !== 6}>
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                </div>
              </form>
            )}

            {forgotPasswordStep === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-bold">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      className="h-14 rounded-2xl border-slate-200 pl-12 pr-12 dark:border-white/10 dark:bg-white/[0.04]"
                      value={forgotPasswordData.newPassword}
                      onChange={(e) =>
                        setForgotPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-bold">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      className="h-14 rounded-2xl border-slate-200 pl-12 dark:border-white/10 dark:bg-white/[0.04]"
                      value={forgotPasswordData.confirmPassword}
                      onChange={(e) =>
                        setForgotPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="h-14 flex-1 rounded-2xl" onClick={() => setForgotPasswordStep("code")}>
                    Back
                  </Button>
                  <Button type="submit" className="h-14 flex-1 rounded-2xl bg-slate-950 font-bold text-white hover:bg-emerald-700" disabled={isLoading}>
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
