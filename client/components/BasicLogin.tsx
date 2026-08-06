import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building,
  Phone,
  ArrowRight,
  CheckCircle2,
  Crown,
  Shield,
  Sparkles,
  UserPlus,
} from "lucide-react";

interface BasicLoginProps {
  loginData: any;
  setLoginData: (data: any) => void;
  signupData: any;
  setSignupData: (data: any) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  isLoading: boolean;
  isGoogleLoading: boolean;
  activeTab: string;
  setActiveTab: (val: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleSignup: (e: React.FormEvent) => void;
  setShowForgotPassword: (val: boolean) => void;
  setForgotPasswordData: (val: any) => void;
  googleButtonRef: React.RefObject<HTMLDivElement>;
  showVerification: boolean;
  verificationData: any;
  setVerificationData: (data: any) => void;
  handleVerification: (e: React.FormEvent) => void;
}

const adminBenefits = [
  "Capital strategy workflow access",
  "Team operations and intake visibility",
  "Secure sign-in with account creation",
];

export default function BasicLogin({
  loginData,
  setLoginData,
  signupData,
  setSignupData,
  showPassword,
  setShowPassword,
  isLoading,
  isGoogleLoading,
  activeTab,
  setActiveTab,
  handleLogin,
  handleSignup,
  setShowForgotPassword,
  setForgotPasswordData,
  googleButtonRef,
  showVerification,
  verificationData,
  setVerificationData,
  handleVerification,
}: BasicLoginProps) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#06120c] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(119,221,119,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(0,66,37,0.85),transparent_42%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:grid-cols-[1fr_540px]">
          <section className="flex flex-col justify-between border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-12 xl:p-14">
            <div>
              <Link to="/" className="inline-flex items-center gap-4">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-xl">
                  <img src="/capsol-logo-white.png" alt="CapSol" className="h-10 w-auto object-contain sm:h-12" />
                </div>
                <div>
                  <p className="text-xl font-black tracking-tight text-white sm:text-2xl">CapSol Admin Access</p>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">
                    Admin Workspace Login
                  </p>
                </div>
              </Link>

              <div className="mt-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                  <Sparkles className="h-4 w-4" />
                  Operations, funding, and intake access
                </div>
                <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl xl:text-6xl">
                  One admin entry point
                  <span className="block bg-gradient-to-r from-emerald-200 via-lime-100 to-white bg-clip-text text-transparent">
                    for the whole CapSol workflow.
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-slate-300">
                  Sign in or create an account to access the platform environment built for capital matching, readiness guidance, and operational coordination.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {adminBenefits.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-lg backdrop-blur-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    <p className="mt-3 text-sm font-semibold leading-6 text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
                <div className="inline-flex rounded-2xl bg-emerald-300/10 p-3 text-emerald-200">
                  <Shield className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-black text-white">Protected access</h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Administrative sessions are protected and intended for authorized platform operators only.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
                <div className="inline-flex rounded-2xl bg-amber-300/10 p-3 text-amber-200">
                  <Crown className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-black text-white">Built for operators</h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Manage sign-in, onboarding, and daily workflow access from one cleaner admin login experience.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white p-5 text-slate-950 sm:p-7 lg:p-8">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-teal-700">Portal Access</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">Sign in or create your account</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Use the same functions as before — now in a more structured, modern workspace layout.
                </p>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
                    <TabsTrigger value="login" className="rounded-xl py-3 text-sm font-bold data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-xl py-3 text-sm font-bold data-[state=active]:bg-slate-950 data-[state=active]:text-white">
                      Create Account
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    <TabsContent value="login" className="m-0 space-y-6">
                      <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-bold text-slate-800">Email Address</Label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="email"
                              type="email"
                              placeholder="enter@email.com"
                              className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-teal-500"
                              value={loginData.email}
                              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-sm font-bold text-slate-800">Password</Label>
                            <button
                              type="button"
                              className="text-sm font-semibold text-teal-700 transition hover:text-teal-900"
                              onClick={() => {
                                setShowForgotPassword(true);
                                setForgotPasswordData((prev: any) => ({ ...prev, email: loginData.email }));
                              }}
                            >
                              Forgot password?
                            </button>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className="h-14 rounded-2xl border-slate-200 pl-12 pr-12 text-base focus-visible:ring-teal-500"
                              value={loginData.password}
                              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <Checkbox
                            id="remember"
                            checked={loginData.remember}
                            onCheckedChange={(checked) => setLoginData({ ...loginData, remember: !!checked })}
                          />
                          <Label htmlFor="remember" className="cursor-pointer text-sm font-medium text-slate-700">
                            Keep me signed in on this device
                          </Label>
                        </div>

                        <Button
                          type="submit"
                          className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-teal-700"
                          disabled={isLoading || isGoogleLoading}
                        >
                          {isLoading ? "Signing in..." : (
                            <span className="flex items-center gap-2">
                              Sign In
                              <ArrowRight className="h-5 w-5" />
                            </span>
                          )}
                        </Button>
                      </form>

                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
                          <span className="bg-white px-3">Or continue with</span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex min-h-[44px] items-center justify-center overflow-hidden rounded-xl" ref={googleButtonRef} />
                      </div>
                    </TabsContent>

                    <TabsContent value="signup" className="m-0">
                      {!showVerification ? (
                        <form onSubmit={handleSignup} className="space-y-5">
                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="firstName" className="text-sm font-bold text-slate-800">First Name</Label>
                              <Input id="firstName" placeholder="John" className="h-14 rounded-2xl border-slate-200 text-base focus-visible:ring-teal-500" value={signupData.first_name} onChange={(e) => setSignupData({ ...signupData, first_name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="lastName" className="text-sm font-bold text-slate-800">Last Name</Label>
                              <Input id="lastName" placeholder="Doe" className="h-14 rounded-2xl border-slate-200 text-base focus-visible:ring-teal-500" value={signupData.last_name} onChange={(e) => setSignupData({ ...signupData, last_name: e.target.value })} required />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="signupEmail" className="text-sm font-bold text-slate-800">Email Address</Label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                              <Input id="signupEmail" type="email" placeholder="enter@email.com" className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-teal-500" value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} required />
                            </div>
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="signupPhone" className="text-sm font-bold text-slate-800">Phone Number</Label>
                              <div className="relative">
                                <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <Input id="signupPhone" type="tel" placeholder="+1 555 123 4567" className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-teal-500" value={signupData.phone} onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })} required />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="company" className="text-sm font-bold text-slate-800">Company Name</Label>
                              <div className="relative">
                                <Building className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <Input id="company" placeholder="Your Company" className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-teal-500" value={signupData.company_name} onChange={(e) => setSignupData({ ...signupData, company_name: e.target.value })} />
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="signupPassword" className="text-sm font-bold text-slate-800">Password</Label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <Input id="signupPassword" type={showPassword ? "text" : "password"} placeholder="Create a password" className="h-14 rounded-2xl border-slate-200 pl-12 pr-12 text-base focus-visible:ring-teal-500" value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} required />
                                <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700" onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="confirmPassword" className="text-sm font-bold text-slate-800">Confirm Password</Label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Confirm your password" className="h-14 rounded-2xl border-slate-200 pl-12 text-base focus-visible:ring-teal-500" value={signupData.confirmPassword} onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} required />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <Checkbox id="terms" checked={signupData.terms} onCheckedChange={(checked) => setSignupData({ ...signupData, terms: !!checked })} className="mt-0.5" />
                            <Label htmlFor="terms" className="cursor-pointer text-sm leading-6 text-slate-600">
                              I agree to the{" "}
                              <Link to="/terms" className="font-semibold text-teal-700 hover:underline">Terms of Service</Link>
                              {" "}and{" "}
                              <Link to="/privacy" className="font-semibold text-teal-700 hover:underline">Privacy Policy</Link>
                            </Label>
                          </div>

                          <Button type="submit" className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-teal-700" disabled={isLoading}>
                            {isLoading ? "Creating account..." : (
                              <span className="flex items-center gap-2">
                                Create Account
                                <UserPlus className="h-5 w-5" />
                              </span>
                            )}
                          </Button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerification} className="space-y-6">
                          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center">
                            <div className="mx-auto inline-flex rounded-2xl bg-teal-100 p-4 text-teal-700">
                              <Mail className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-2xl font-black tracking-tight">Verify your email</h3>
                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              We sent a verification code to <span className="font-semibold text-slate-900">{verificationData.email}</span>.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="code" className="text-sm font-bold text-slate-800">Verification Code</Label>
                            <Input
                              id="code"
                              placeholder="000000"
                              className="h-16 rounded-2xl border-slate-200 text-center text-2xl font-black tracking-[0.5em] focus-visible:ring-teal-500"
                              value={verificationData.code}
                              onChange={(e) => setVerificationData({ ...verificationData, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                              maxLength={6}
                              required
                            />
                          </div>

                          <Button type="submit" className="h-14 w-full rounded-2xl bg-slate-950 text-base font-bold text-white hover:bg-teal-700" disabled={isLoading || verificationData.code.length !== 6}>
                            {isLoading ? "Verifying..." : (
                              <span className="flex items-center gap-2">
                                Verify & Complete
                                <ArrowRight className="h-5 w-5" />
                              </span>
                            )}
                          </Button>
                        </form>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>

            <div className="mt-4 text-center text-xs font-medium text-slate-500">
              © {new Date().getFullYear()} CapSol. Built for secure platform access.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
