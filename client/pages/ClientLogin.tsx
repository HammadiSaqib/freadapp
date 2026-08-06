import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { authApi, setAuthToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";

const dashboardBenefits = [
  {
    icon: TrendingUp,
    title: "Track progress",
    description: "Stay on top of readiness, movement, and the next actions inside your portal.",
  },
  {
    icon: FileText,
    title: "Review updates",
    description: "See the latest items, notes, and supporting information connected to your account.",
  },
  {
    icon: CreditCard,
    title: "Manage your journey",
    description: "Use your member portal as the central place for your funding-related workflow.",
  },
];

const miniStats = [
  "Secure member access",
  "Personal dashboard visibility",
  "Simple step-by-step portal flow",
];

export default function ClientLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      navigate("/member/dashboard");
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.clientLogin(loginData.email, loginData.password);

      if (response.error) {
        toast({
          title: "Authentication Failed",
          description: response.error,
          variant: "destructive",
        });
        return;
      }

      if (response.data?.token) {
        setAuthToken(response.data.token);
        toast({
          title: "Client Access Granted",
          description: "Welcome to your Funding Dashboard.",
        });
        navigate("/member/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "System Error",
        description: error.message || "Authentication system unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#f8fffd_0%,#ffffff_45%,#f1faf6_100%)]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1fr_.92fr]">
        <section className="flex items-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-3xl">
            <Link to="/" className="inline-flex items-center gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <img src="/capsol-logo.png" alt="CapSol" className="h-10 w-auto object-contain sm:h-12" />
              </div>
              <div>
                <p className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">CapSol Member</p>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Client Portal
                </p>
              </div>
            </Link>

            <div className="mt-12 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
                <Sparkles className="h-4 w-4" />
                A cleaner member access experience
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-6xl xl:text-7xl">
                Welcome back to
                <span className="block bg-gradient-to-r from-teal-700 via-emerald-600 to-lime-600 bg-clip-text text-transparent">
                  your CapSol portal.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                Sign in to view your member dashboard, follow your funding journey, and stay aligned with the next steps your account needs.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {miniStats.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <CheckCircle2 className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4">
              {dashboardBenefits.map((item) => (
                <article key={item.title} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-950">{item.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12">
          <Card className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <CardHeader className="space-y-5 px-8 pt-8 sm:px-10 sm:pt-10">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">
                  Member Login
                </CardTitle>
                <CardDescription className="mt-3 text-base leading-7 text-slate-600">
                  Access your CapSol client portal to review updates, monitor activity, and continue your funding workflow.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8 sm:px-10 sm:pb-10">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-800">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@thecapsol.com"
                      value={loginData.email}
                      onChange={handleInputChange}
                      className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-teal-500"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-bold text-slate-800">
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
                      className="h-14 rounded-2xl border-slate-200 pl-12 pr-12 text-base focus-visible:ring-teal-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-teal-700" />
                    <span>Secure member access</span>
                  </div>
                  <Link to="/forgot-password" className="font-semibold text-teal-700 transition hover:text-teal-900">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-teal-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Sign In to Dashboard
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-teal-700" />
                  <div>
                    <p className="font-semibold text-slate-900">Protected member portal</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Your portal is secured for private account access and workflow visibility. If you need help signing in, our support team can assist.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <span>Need help with your account?</span>
                <Link to="/support" className="font-semibold text-teal-700 transition hover:text-teal-900">
                  Contact Support
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
