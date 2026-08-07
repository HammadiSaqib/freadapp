import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { buildOnboardingIntakeUrl } from "@/lib/hostRouting";
import { billingApi, clientsApi } from "@/lib/api";
import { isClientPlanPaymentRequired, startClientEnrollmentCheckout } from "@/lib/clientEnrollment";
import {
  closeReportPullLoading,
  openReportPullLoading,
  showReportPullError,
} from "@/lib/reportPullFeedback";
import { Eye, EyeOff, ArrowRight, Check, CheckCircle2, CreditCard, Link as LinkIcon, Loader2, User, ShieldCheck, FileText, Globe, Mail, Phone, Target, TrendingUp, Sparkles } from "lucide-react";

type ClientEnrollmentPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  billing_cycle: string;
  features: string[];
};

type ClientEnrollmentConfig = {
  allowFreeEnrollment: boolean;
  requiresPayment: boolean;
  clientPlan: ClientEnrollmentPlan | null;
  clientPlans: ClientEnrollmentPlan[];
};

const PLATFORM_OPTIONS = [
  { value: "myfreescorenow", label: "My Free Score Now" },
  { value: "identityiq", label: "IdentityIQ" },
  { value: "myscoreiq", label: "MyScoreIQ" },
];

const normalizeSlug = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  return trimmed
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const normalizeHexColor = (value?: string | null) => {
  const color = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toUpperCase();
  return "#16A34A";
};

const formatPlanPrice = (price: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: Number(price) % 1 === 0 ? 0 : 2,
}).format(Number(price || 0));

const ClientIntake = () => {
  const [searchParams] = useSearchParams();
  const { slug, publicId } = useParams<{ slug?: string; publicId?: string }>();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";
  const enrollmentSessionId = searchParams.get("enrollment_session_id") || "";
  const enrollmentCancelled = searchParams.get("enrollment_cancelled") === "1";
  const intakeSlug = normalizeSlug(slug || publicId || "");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [intakeConfig, setIntakeConfig] = useState<{
    redirectUrl: string | null;
    logoUrl: string | null;
    primaryColor: string;
    companyName: string | null;
    websiteUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    monitoringLink: string | null;
    enrollment: ClientEnrollmentConfig;
  }>({
    redirectUrl: null,
    logoUrl: null,
    primaryColor: "#16A34A",
    companyName: null,
    websiteUrl: null,
    contactEmail: null,
    contactPhone: null,
    monitoringLink: null,
    enrollment: {
      allowFreeEnrollment: false,
      requiresPayment: false,
      clientPlan: null,
      clientPlans: [],
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState<number | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successData, setSuccessData] = useState<{ clientName?: string; clientId?: number | string } | null>(null);
  const [formData, setFormData] = useState({
    platform: "",
    email: "",
    password: "",
    ssnLast4: "",
  });
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);

  const requiresSsn = useMemo(
    () => formData.platform === "identityiq" || formData.platform === "myscoreiq",
    [formData.platform]
  );

  const intakeLink = useMemo(() => {
    if (intakeSlug) return buildOnboardingIntakeUrl({ slugOrId: intakeSlug });
    if (token) return buildOnboardingIntakeUrl({ token });
    return "";
  }, [intakeSlug, token]);

  const intakePrimaryColor = useMemo(() => normalizeHexColor(intakeConfig.primaryColor), [intakeConfig.primaryColor]);
  const intakeTint = useMemo(() => `${intakePrimaryColor}22`, [intakePrimaryColor]);
  const companyDisplayName = intakeConfig.companyName || "Your Credit Team";
  const companyInitial = companyDisplayName.trim().charAt(0).toUpperCase() || "C";

  useEffect(() => {
    if (loadingConfig) return;
    document.title = `${companyDisplayName} | Secure Client Enrollment`;
  }, [companyDisplayName, loadingConfig]);

  useEffect(() => {
    const fetchIntakeConfig = async () => {
      if (!token && !intakeSlug) {
        setLoadingConfig(false);
        return;
      }
      try {
        const response = await clientsApi.getClientIntakeConfig({
          token: token || undefined,
          slug: intakeSlug || undefined,
        });
        const data = response.data?.data || response.data;
        setConfigError(null);
        const enrollment: ClientEnrollmentConfig = {
          allowFreeEnrollment: Boolean(data?.enrollment?.allowFreeEnrollment),
          requiresPayment: Boolean(data?.enrollment?.requiresPayment),
          clientPlan: data?.enrollment?.clientPlan || null,
          clientPlans: Array.isArray(data?.enrollment?.clientPlans) ? data.enrollment.clientPlans : [],
        };
        setIntakeConfig({
          redirectUrl: data?.redirectUrl || null,
          logoUrl: data?.logoUrl || null,
          primaryColor: normalizeHexColor(data?.primaryColor),
          companyName: data?.companyName || null,
          websiteUrl: data?.websiteUrl || null,
          contactEmail: data?.contactEmail || null,
          contactPhone: data?.contactPhone || null,
          monitoringLink: data?.monitoringLink || null,
          enrollment,
        });

        if (enrollment.allowFreeEnrollment) {
          setPaymentVerified(true);
        } else if (enrollment.requiresPayment && enrollmentSessionId) {
          setVerifyingPayment(true);
          try {
            const verificationResponse = await billingApi.finalizeClientEnrollmentSession(enrollmentSessionId);
            const verifiedEnrollment = verificationResponse?.data?.enrollment;
            if (!verifiedEnrollment?.canCompleteIntake) {
              throw new Error(
                verifiedEnrollment?.status === "completed"
                  ? "This paid enrollment has already been used."
                  : "Payment has not been verified yet."
              );
            }
            setPaymentVerified(true);
            toast({
              title: "Payment confirmed",
              description: "Your intake form is now unlocked.",
            });
          } catch (verificationError: any) {
            setPaymentVerified(false);
            toast({
              title: "Unable to verify payment",
              description: verificationError?.response?.data?.details || verificationError?.message || "Please select a plan or try again.",
              variant: "destructive",
            });
          } finally {
            setVerifyingPayment(false);
          }
        } else {
          setPaymentVerified(false);
        }

        if (enrollmentCancelled) {
          toast({
            title: "Checkout canceled",
            description: "No payment was taken. Select a plan whenever you're ready.",
          });
        }
      } catch (error: any) {
        const message = error?.response?.data?.error || error?.message || "Unable to load intake branding settings.";
        setConfigError(message);
        toast({
          title: "Intake link issue",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchIntakeConfig();
  }, [token, intakeSlug, enrollmentSessionId, enrollmentCancelled, toast]);

  const handlePlanCheckout = async (planId: number) => {
    setCheckoutPlanId(planId);
    try {
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.delete("enrollment_session_id");
      returnUrl.searchParams.delete("enrollment_cancelled");
      await startClientEnrollmentCheckout({
        token: token || undefined,
        slug: intakeSlug || undefined,
        planId,
        source: "public_intake",
        returnUrl: returnUrl.toString(),
      });
    } catch (checkoutError: any) {
      const message = checkoutError?.response?.data?.error
        || checkoutError?.response?.data?.details
        || checkoutError?.message
        || "Unable to start secure checkout.";
      toast({ title: "Checkout failed", description: message, variant: "destructive" });
      setCheckoutPlanId(null);
    }
  };

  const handleSuccessRedirect = () => {
    const redirectUrl = intakeConfig.redirectUrl;
    if (!redirectUrl) return;
    window.location.assign(redirectUrl);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token && !intakeSlug) {
      toast({
        title: "Missing intake link",
        description: "Please use the intake link provided by your admin.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.platform || !formData.email || !formData.password) {
      toast({
        title: "Missing information",
        description: "Platform, email, and password are required.",
        variant: "destructive",
      });
      return;
    }

    if (requiresSsn && !formData.ssnLast4) {
      toast({
        title: "Missing SSN last 4",
        description: "Please enter the last 4 digits of your SSN for this platform.",
        variant: "destructive",
      });
      return;
    }
    if (!authorizationConfirmed) {
      toast({
        title: "Authorization Required",
        description: "Please confirm authorization to use the credit report for educational analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    let reportPullFeedbackOpen = false;
    try {
      openReportPullLoading({
        title: "Pulling Your Credit Report",
        description: "Securely connecting to your monitoring portal, verifying credentials, and fetching your latest report.",
      });
      reportPullFeedbackOpen = true;

      const response = await clientsApi.submitClientIntake({
        token,
        slug: intakeSlug || undefined,
        enrollmentSessionId: enrollmentSessionId || undefined,
        platform: formData.platform,
        email: formData.email,
        password: formData.password,
        ssnLast4: requiresSsn ? formData.ssnLast4 : undefined,
      });
      closeReportPullLoading();
      reportPullFeedbackOpen = false;

      const data = response.data?.data || response.data;
      setSuccessData({
        clientName: data?.clientName || "",
        clientId: data?.clientId,
      });
      setAuthorizationConfirmed(false);
      toast({
        title: "Intake completed",
        description: "Your credit report is being prepared.",
      });
      if (intakeConfig.redirectUrl) {
        setTimeout(() => {
          handleSuccessRedirect();
        }, 1200);
      }
    } catch (error: any) {
      if (isClientPlanPaymentRequired(error)) {
        if (reportPullFeedbackOpen) {
          closeReportPullLoading();
          reportPullFeedbackOpen = false;
        }
        setPaymentVerified(false);
        toast({
          title: "Payment required",
          description: "Your payment session could not be verified. Please select a plan and complete checkout.",
          variant: "destructive",
        });
        return;
      }

      const message = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to submit intake form.";
      if (reportPullFeedbackOpen) {
        showReportPullError({
          title: "We Couldn't Pull Your Report",
          description: message,
        });
        reportPullFeedbackOpen = false;
      }
      toast({
        title: "Submission failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!intakeLink) return;
    try {
      await navigator.clipboard.writeText(intakeLink);
      toast({ title: "Link copied", description: "Intake link copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Please copy the link manually.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden bg-white text-slate-950">
      <header className="relative z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#top" className="flex min-w-0 items-center gap-3" aria-label={`${companyDisplayName} home`}>
            {intakeConfig.logoUrl ? (
              <img
                src={intakeConfig.logoUrl}
                alt={`${companyDisplayName} logo`}
                className="max-h-11 max-w-[190px] object-contain object-left"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white shadow-lg"
                style={{ backgroundColor: intakePrimaryColor, boxShadow: `0 12px 28px ${intakeTint}` }}
              >
                {companyInitial}
              </span>
            )}
            {!intakeConfig.logoUrl && <span className="truncate text-lg font-bold tracking-tight">{companyDisplayName}</span>}
          </a>

          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            {intakeConfig.contactPhone && (
              <a href={`tel:${intakeConfig.contactPhone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 transition hover:text-slate-950">
                <Phone className="h-4 w-4" style={{ color: intakePrimaryColor }} />
                {intakeConfig.contactPhone}
              </a>
            )}
            {intakeConfig.contactEmail && (
              <a href={`mailto:${intakeConfig.contactEmail}`} className="flex items-center gap-2 transition hover:text-slate-950">
                <Mail className="h-4 w-4" style={{ color: intakePrimaryColor }} />
                {intakeConfig.contactEmail}
              </a>
            )}
            <a href="#enrollment" className="rounded-full px-5 py-2.5 font-semibold text-white shadow-sm transition hover:-translate-y-0.5" style={{ backgroundColor: intakePrimaryColor }}>
              Get started
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate border-b border-slate-200/70 bg-slate-50">
          <div className="absolute inset-0 -z-10 opacity-70" style={{ background: `radial-gradient(circle at 12% 15%, ${intakeTint}, transparent 32%), radial-gradient(circle at 88% 70%, ${intakeTint}, transparent 28%)` }} />
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:py-24">
            <div className="max-w-2xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                <ShieldCheck className="h-4 w-4" style={{ color: intakePrimaryColor }} />
                Secure client enrollment
              </div>
              <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl">
                Build the credit future you deserve.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Join {companyDisplayName} and get a clear, personalized path to understand your credit, address inaccuracies, and confidently track your progress.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#enrollment" className="inline-flex h-12 items-center justify-center rounded-xl px-6 font-bold text-white shadow-lg transition hover:-translate-y-0.5" style={{ backgroundColor: intakePrimaryColor, boxShadow: `0 16px 34px ${intakeTint}` }}>
                  Start your journey <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                {intakeConfig.websiteUrl && (
                  <a href={intakeConfig.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
                    Visit our website <Globe className="ml-2 h-4 w-4" />
                  </a>
                )}
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
                {["Private & secure", "Personalized strategy", "Progress you can track"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: intakeTint }}>
                      <Check className="h-3.5 w-3.5" style={{ color: intakePrimaryColor }} />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div id="enrollment" className="scroll-mt-24">
              <div className="relative mx-auto w-full max-w-2xl rounded-[2rem] border border-white bg-white/95 p-5 shadow-[0_30px_90px_-35px_rgba(15,23,42,0.35)] sm:p-8">
                <div className="absolute -left-3 top-12 h-20 w-1 rounded-full" style={{ backgroundColor: intakePrimaryColor }} />
          {loadingConfig || verifyingPayment ? (
            <Card className="p-8 animate-pulse">
              <div className="h-8 w-3/4 bg-slate-200 rounded mb-4"></div>
              <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
              {verifyingPayment && <p className="mt-6 text-sm text-slate-500">Verifying your Stripe payment…</p>}
            </Card>
          ) : !token && !intakeSlug ? (
            <Card className="border-destructive bg-red-50 text-destructive-foreground p-6">
              <CardHeader>
                <CardTitle>Invalid Link</CardTitle>
              </CardHeader>
              <CardContent>
                <p>This intake link is missing or invalid. Please request a new link from your admin.</p>
              </CardContent>
            </Card>
          ) : configError ? (
            <Card className="border-destructive bg-red-50 text-destructive-foreground p-6">
              <CardHeader>
                <CardTitle>Unable to Load Enrollment</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{configError}</p>
              </CardContent>
            </Card>
          ) : successData ? (
            <div className="text-center animate-in fade-in zoom-in duration-500">
                <div className="mx-auto mb-6 p-4 rounded-full w-fit bg-green-100 ring-8 ring-green-50">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800">You're All Set!</h2>
                <p className="mt-2 text-xl text-slate-600 font-medium">
                    {successData.clientName ? `Welcome aboard, ${successData.clientName}.` : "Welcome to your financial fresh start."}
                </p>
                
                <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6 text-left shadow-sm">
                  <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Here's what happens next:
                  </h3>
                  <div className="space-y-0">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                        <div className="w-0.5 h-16 bg-slate-100 my-1"></div>
                      </div>
                      <div className="pb-6 pt-1">
                        <h4 className="font-medium text-slate-800">Analyzing Your Report</h4>
                        <p className="text-sm text-slate-500 mt-1">Our system is currently scanning your credit report for errors and negative items.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">2</div>
                        <div className="w-0.5 h-16 bg-slate-100 my-1"></div>
                      </div>
                      <div className="pb-6 pt-1">
                        <h4 className="font-medium text-slate-800">Building Your Strategy</h4>
                        <p className="text-sm text-slate-500 mt-1">We'll create a custom dispute plan tailored to your specific situation.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">3</div>
                      </div>
                      <div className="pt-1">
                        <h4 className="font-medium text-slate-800">Launch & Monitor</h4>
                        <p className="text-sm text-slate-500 mt-1">Watch your dashboard as we work to improve your score. You'll get updates every step of the way.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                    {intakeConfig.redirectUrl && (
                        <Button onClick={handleSuccessRedirect} className="w-full h-12 text-lg shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: intakePrimaryColor }}>
                            Go to Your Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleCopyLink} className="w-full">
                        <LinkIcon className="mr-2 h-4 w-4" /> Copy Intake Link
                    </Button>
                </div>
            </div>
          ) : intakeConfig.enrollment.requiresPayment && !paymentVerified ? (
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="mx-auto p-3 rounded-full w-fit" style={{ backgroundColor: intakeTint }}>
                  <CreditCard className="h-7 w-7" style={{ color: intakePrimaryColor }} />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Choose Your Client Plan</h1>
                <p className="text-slate-600">
                  Select the plan that fits your needs. Your secure intake form will unlock after Stripe confirms payment.
                </p>
              </div>

              {intakeConfig.enrollment.clientPlans.length === 0 ? (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-6 text-center text-amber-900">
                    Client enrollment plans are not available right now. Please contact {intakeConfig.companyName || "your administrator"}.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {intakeConfig.enrollment.clientPlans.map((plan, index) => (
                    <Card
                      key={plan.id}
                      className={`relative flex flex-col border-2 shadow-sm ${index === 0 ? "border-emerald-500" : "border-slate-200"}`}
                    >
                      {index === 0 && (
                        <div className="absolute -top-3 left-5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                          Recommended
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description || "A client enrollment plan designed to support your credit journey."}</CardDescription>
                        <div className="pt-3">
                          <span className="text-4xl font-bold text-slate-900">{formatPlanPrice(plan.price)}</span>
                          <span className="text-sm text-slate-500">/{plan.billing_cycle === "yearly" ? "year" : "month"}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-5">
                        {plan.features.length > 0 && (
                          <ul className="space-y-2 text-sm text-slate-600">
                            {plan.features.map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button
                          type="button"
                          className="mt-auto w-full"
                          style={{ backgroundColor: intakePrimaryColor }}
                          disabled={checkoutPlanId !== null}
                          onClick={() => handlePlanCheckout(plan.id)}
                        >
                          {checkoutPlanId === plan.id ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Opening Checkout…</>
                          ) : (
                            <>Select Plan <ArrowRight className="ml-2 h-4 w-4" /></>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <p className="text-center text-xs text-slate-500">
                Payments are processed securely by Stripe. The intake form remains locked until payment is verified.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-center lg:hidden mb-8">
                {intakeConfig.logoUrl ? (
                  <img
                    src={intakeConfig.logoUrl}
                    alt="Brand logo"
                    className="mx-auto mb-4 max-h-12 object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="mx-auto mb-4 p-3 rounded-full w-fit" style={{ backgroundColor: intakeTint }}>
                    <User className="h-6 w-6" style={{ color: intakePrimaryColor }} />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-slate-800">Begin Your Transformation</h2>
                <p className="text-slate-600">Connect your report to unlock your personalized dispute plan.</p>
              </div>

              {intakeConfig.monitoringLink && (
                <Card className="mb-6 border-blue-200 bg-blue-50/50 overflow-hidden relative shadow-sm">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <div className="p-5 flex items-start gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div className="space-y-3 flex-1">
                      <div>
                        <h3 className="font-semibold text-slate-900">Don't have your credit report?</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          We recommend <strong>MyScoreIQ</strong> for the most accurate FICO® Scores and reports. It's fast, secure, and fully compatible with our analysis tools.
                        </p>
                      </div>
                      <Button 
                        variant="default" 
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shadow-sm"
                        onClick={() => window.open(intakeConfig.monitoringLink!, '_blank')}
                      >
                        Get Your FICO® Score <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="shadow-lg border-slate-200/80">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Link Your Credit Report</CardTitle>
                    <CardDescription>Securely connect to start your analysis.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="platform">Credit Monitoring Platform</Label>
                            <Select value={formData.platform} onValueChange={(value) => setFormData((p) => ({ ...p, platform: value }))}>
                                <SelectTrigger><SelectValue placeholder="Select a platform..." /></SelectTrigger>
                                <SelectContent>
                                    {PLATFORM_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Platform Email or Username</Label>
                            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Platform Password</Label>
                            <div className="relative">
                                <Input id="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" required className="pr-10" />
                                <button type="button" onClick={() => setShowPassword((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        {requiresSsn && (
                            <div className="space-y-2">
                                <Label htmlFor="ssnLast4">SSN (Last 4 Digits)</Label>
                                <Input id="ssnLast4" value={formData.ssnLast4} onChange={(e) => setFormData((p) => ({ ...p, ssnLast4: e.target.value }))} placeholder="1234" maxLength={4} />
                            </div>
                        )}
                        <div className="flex items-start space-x-3 pt-2">
                            <Checkbox id="intake-authorization" checked={authorizationConfirmed} onCheckedChange={(c) => setAuthorizationConfirmed(c === true)} />
                            <Label htmlFor="intake-authorization" className="text-sm text-slate-600 -mt-1">
                                I confirm this is my credit report and authorize its use for educational analysis.
                            </Label>
                        </div>
                        <Button type="submit" className="w-full font-semibold" style={{ backgroundColor: intakePrimaryColor }} disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit Securely"}
                        </Button>
                    </form>
                </CardContent>
              </Card>

            </div>
          )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: intakePrimaryColor }}>A clear path forward</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">From report to results in three simple steps</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">We make the process understandable, personal, and easy to follow from day one.</p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {[
                { number: "01", icon: FileText, title: "Connect your report", text: "Securely connect your credit monitoring account so your latest report can be analyzed." },
                { number: "02", icon: Target, title: "Get your strategy", text: "Receive a focused plan built around the inaccuracies and opportunities found in your report." },
                { number: "03", icon: TrendingUp, title: "Track your progress", text: "Follow updates, score movement, and next steps from your secure client dashboard." },
              ].map(({ number, icon: Icon, title, text }) => (
                <article key={number} className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_-35px_rgba(15,23,42,0.45)]">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: intakeTint }}>
                      <Icon className="h-6 w-6" style={{ color: intakePrimaryColor }} />
                    </span>
                    <span className="text-sm font-black tracking-[0.16em] text-slate-300">{number}</span>
                  </div>
                  <h3 className="mt-7 text-xl font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">{text}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-200 bg-slate-950 px-7 py-8 text-white sm:flex-row sm:items-center sm:px-10">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: intakePrimaryColor }}>
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-xl font-bold">Your privacy comes first</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">Your information is encrypted and used only to prepare your credit analysis and support your enrollment with {companyDisplayName}.</p>
                </div>
              </div>
              <a href="#enrollment" className="inline-flex shrink-0 items-center font-semibold text-white">
                Enroll securely <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {(intakeConfig.contactEmail || intakeConfig.contactPhone || intakeConfig.websiteUrl) && (
          <section className="border-y border-slate-200 bg-slate-50 px-5 py-16 sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: intakePrimaryColor }}>Here when you need us</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Questions before you begin?</h2>
                <p className="mt-3 text-slate-600">Connect directly with the {companyDisplayName} team.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {intakeConfig.contactPhone && (
                  <a href={`tel:${intakeConfig.contactPhone.replace(/[^+\d]/g, "")}`} className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 transition hover:border-slate-400">
                    <Phone className="mr-2 h-4 w-4" style={{ color: intakePrimaryColor }} /> {intakeConfig.contactPhone}
                  </a>
                )}
                {intakeConfig.contactEmail && (
                  <a href={`mailto:${intakeConfig.contactEmail}`} className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 transition hover:border-slate-400">
                    <Mail className="mr-2 h-4 w-4" style={{ color: intakePrimaryColor }} /> Email our team
                  </a>
                )}
                {intakeConfig.websiteUrl && (
                  <a href={intakeConfig.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center rounded-xl px-5 font-semibold text-white" style={{ backgroundColor: intakePrimaryColor }}>
                    <Globe className="mr-2 h-4 w-4" /> Visit website
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-white px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 font-semibold text-slate-700">
            {intakeConfig.logoUrl ? (
              <img src={intakeConfig.logoUrl} alt="" className="max-h-8 max-w-[150px] object-contain object-left" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black text-white" style={{ backgroundColor: intakePrimaryColor }}>{companyInitial}</span>
            )}
            {!intakeConfig.logoUrl && companyDisplayName}
          </div>
          <p>Secure enrollment powered for {companyDisplayName}.</p>
        </div>
      </footer>
    </div>
  );
};

export default ClientIntake;
