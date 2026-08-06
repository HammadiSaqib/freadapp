import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Eye, EyeOff, Lock, Mail, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { toast } from "sonner";
import { authApi, setAuthToken } from "@/lib/api";
import { clearPortalReturnContext } from "@/lib/authStorage";
import { usePortalLoginRedirect } from "@/hooks/usePortalLoginRedirect";
import { getPortalNavigationTarget } from "@/lib/hostRouting";

const clientBenefits = [
  "Private member dashboard access",
  "Track account and portal activity",
  "Stay aligned with your next steps",
];

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

  usePortalLoginRedirect({ allowedRoles: ['client'], portalAlias: 'member' });

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
      const response = await authApi.clientLogin(
        formData.email,
        formData.password
      );

      if (response.data?.success) {
        setAuthToken(response.data.token);

        if (response.data.user) {
          localStorage.setItem('userRole', response.data.user.role);
          localStorage.setItem('userId', response.data.user.id.toString());
          localStorage.setItem('userName', `${response.data.user.first_name} ${response.data.user.last_name}`);
        }

        if (response.data.user.role === 'client') {
          toast.success('Welcome back!');
          clearPortalReturnContext();
          try {
            sessionStorage.setItem('client_just_logged_in', '1');
          } catch (e) {}
          const dashboardTarget = getPortalNavigationTarget('member', '/dashboard');
          if (dashboardTarget.external) {
            window.location.href = dashboardTarget.target;
            return;
          }
          navigate(dashboardTarget.target);
        } else {
          toast.error('Access denied. Client credentials required.');
        }
      } else {
        toast.error(response.data?.message || 'Login failed');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7fbf8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#f7fbf8_0%,#ffffff_45%,#eef8f1_100%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.12)] lg:grid-cols-[1.02fr_.98fr]">
          <section className="border-b border-slate-200 px-6 py-8 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-14">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 transition hover:text-teal-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>

            <div className="mt-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800">
                <Sparkles className="h-4 w-4" />
                CapSol Member Portal
              </div>
              <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-slate-950 sm:text-5xl xl:text-6xl">
                Pick up right where
                <span className="block bg-gradient-to-r from-teal-700 via-emerald-600 to-lime-600 bg-clip-text text-transparent">
                  your portal journey left off.
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Sign in to your private member workspace to review updates, monitor movement, and stay connected to your CapSol process.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {clientBenefits.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <CheckCircle2 className="h-5 w-5 text-teal-700" />
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Stay in sync with progress</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Your member portal is the central place for visibility, updates, and the next actions connected to your account.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Protected member access</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Your login is designed for secure portal access so your account information stays private and controlled.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
            <Card className="w-full max-w-xl rounded-[1.75rem] border border-slate-200 bg-white shadow-none">
              <CardHeader className="space-y-5 px-6 pt-6 sm:px-8 sm:pt-8">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-white shadow-lg">
                  <CalendarDays className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">
                    Member Login
                  </CardTitle>
                  <CardDescription className="mt-3 text-base leading-7 text-slate-600">
                    Access your CapSol member dashboard with the same functionality as before in a cleaner, more modern layout.
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8">
                <form onSubmit={handleSubmit} className="space-y-5">
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
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-teal-500"
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
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="h-14 rounded-2xl border-slate-200 pl-12 pr-12 text-base focus-visible:ring-teal-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
                        className="cursor-pointer text-sm font-medium text-slate-700"
                      >
                        Remember me
                      </Label>
                    </div>

                    <Link
                      to="/forgot-password"
                      className="text-sm font-semibold text-teal-700 transition hover:text-teal-900"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-teal-700"
                  >
                    {loading ? 'Signing in...' : (
                      <span className="flex items-center gap-2">
                        Sign In
                        <ArrowRight className="h-5 w-5" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-center text-sm leading-6 text-slate-600">
                    Use your monitoring site email and password to log in.
                  </p>
                </div>

                <div className="mt-6 text-center text-xs text-slate-500">
                  Your information is protected with bank-level security.
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ClientLogin;
