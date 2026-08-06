import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { authApi, setAuthToken } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { usePortalLoginRedirect } from "@/hooks/usePortalLoginRedirect";
import { getPortalNavigationTarget } from "@/lib/hostRouting";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Settings2,
  Shield,
  Sparkles,
  UserCog,
} from "lucide-react";

const adminHighlights = [
  "System-wide access controls",
  "User, plan, and portal oversight",
  "Operational visibility across teams",
];

const controlCards = [
  {
    icon: Shield,
    title: "Secure administration",
    description: "Restricted access for platform-level control, auditing, and privileged actions.",
  },
  {
    icon: UserCog,
    title: "Role oversight",
    description: "Manage user access, platform operators, and elevated workflows from one place.",
  },
  {
    icon: Settings2,
    title: "Platform controls",
    description: "Maintain settings, portal behavior, and core operational configuration.",
  },
];

export default function SuperAdminLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  usePortalLoginRedirect({ allowedRoles: ["super_admin"], portalAlias: "super-admin" });

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.superAdminLogin(loginData.email, loginData.password);

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
        clearPortalReturnContext();
        toast({
          title: "Super Admin Access Granted",
          description: "Welcome to the Super Admin Portal.",
        });
        const dashboardTarget = getPortalNavigationTarget("super-admin", "/dashboard");
        if (dashboardTarget.external) {
          window.location.href = dashboardTarget.target;
          return;
        }
        navigate(dashboardTarget.target);
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
    <div className="min-h-screen overflow-hidden bg-[#07110d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(119,221,119,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(0,66,37,0.88),transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1.1fr_.9fr]">
        <section className="flex items-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-3xl">
            <Link to="/" className="inline-flex items-center gap-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur-sm">
                <img src="/capsol-logo.png" alt="CapSol" className="h-10 w-auto object-contain sm:h-12" />
              </div>
              <div>
                <p className="text-xl font-black tracking-tight text-white sm:text-2xl">CapSol Admin</p>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">
                  Super Admin Portal
                </p>
              </div>
            </Link>

            <div className="mt-12 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                <Sparkles className="h-4 w-4" />
                High-privilege platform access
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl xl:text-7xl">
                Command the
                <span className="block bg-gradient-to-r from-emerald-200 via-lime-100 to-white bg-clip-text text-transparent">
                  CapSol control layer.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Access system controls, manage operational teams, and oversee platform activity from a cleaner, more secure admin entry point.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {adminHighlights.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-xl backdrop-blur-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {controlCards.map((item) => (
                <article key={item.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur-sm">
                  <div className="inline-flex rounded-2xl bg-emerald-300/10 p-3 text-emerald-200">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-5 text-xl font-black text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-6 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-200" />
                <div>
                  <p className="font-bold text-amber-100">Restricted environment</p>
                  <p className="mt-2 text-sm leading-6 text-amber-50/90">
                    Super admin access is monitored and intended only for authorized platform operators. All privileged actions are subject to oversight and audit logging.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12">
          <Card className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white text-slate-950 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <CardHeader className="space-y-5 px-8 pt-8 sm:px-10 sm:pt-10">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg">
                <Crown className="h-8 w-8" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">
                  Super Admin Login
                </CardTitle>
                <CardDescription className="mt-3 text-base leading-7 text-slate-600">
                  Sign in with your administrative credentials to access platform management, controls, and system-level oversight.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-8 pb-8 sm:px-10 sm:pb-10">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-bold text-slate-800">
                    Admin Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@thecapsol.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-emerald-500"
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
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="h-14 rounded-2xl border-slate-200 pl-12 pr-12 text-base focus-visible:ring-emerald-500"
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

                <Button
                  type="submit"
                  className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-emerald-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Access Control Panel
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="font-semibold text-slate-900">Protected admin access</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This portal is intended only for authorized CapSol administrators. Login activity and privileged actions may be recorded for platform security.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="font-semibold text-slate-700 transition hover:text-emerald-700"
                >
                  Return to standard login
                </button>
                <span>Need access help? Contact your system administrator.</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
