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
import { clientsApi } from "@/lib/api";
import { Eye, EyeOff, ArrowRight, CheckCircle2, Link as LinkIcon, User, ShieldCheck, FileText, Globe, Mail, Phone, Target, TrendingUp, Sparkles } from "lucide-react";

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

const ClientIntake = () => {
  const [searchParams] = useSearchParams();
  const { slug, publicId } = useParams<{ slug?: string; publicId?: string }>();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";
  const intakeSlug = normalizeSlug(slug || publicId || "");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [intakeConfig, setIntakeConfig] = useState<{
    redirectUrl: string | null;
    logoUrl: string | null;
    primaryColor: string;
    companyName: string | null;
    websiteUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    monitoringLink: string | null;
  }>({
    redirectUrl: null,
    logoUrl: null,
    primaryColor: "#16A34A",
    companyName: null,
    websiteUrl: null,
    contactEmail: null,
    contactPhone: null,
    monitoringLink: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        setIntakeConfig({
          redirectUrl: data?.redirectUrl || null,
          logoUrl: data?.logoUrl || null,
          primaryColor: normalizeHexColor(data?.primaryColor),
          companyName: data?.companyName || null,
          websiteUrl: data?.websiteUrl || null,
          contactEmail: data?.contactEmail || null,
          contactPhone: data?.contactPhone || null,
          monitoringLink: data?.monitoringLink || null,
        });
      } catch (error: any) {
        const message = error?.response?.data?.error || error?.message || "Unable to load intake branding settings.";
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
  }, [token, intakeSlug, toast]);

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
    try {
      const response = await clientsApi.submitClientIntake({
        token,
        slug: intakeSlug || undefined,
        platform: formData.platform,
        email: formData.email,
        password: formData.password,
        ssnLast4: requiresSsn ? formData.ssnLast4 : undefined,
      });
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
      const message = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to submit intake form.";
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
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex flex-col items-center justify-center bg-slate-100 p-12 text-center relative overflow-hidden border-r border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-200 z-0"></div>
        <div className="relative z-10 flex flex-col items-center">
          {intakeConfig.logoUrl ? (
            <img
              src={intakeConfig.logoUrl}
              alt="Brand logo"
              className="mb-8 max-h-16 object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="mb-8 p-4 rounded-full w-fit" style={{ backgroundColor: intakeTint }}>
              <User className="h-8 w-8" style={{ color: intakePrimaryColor }} />
            </div>
          )}
          <h2 className="text-3xl font-bold text-slate-800">
            {intakeConfig.companyName ? `Welcome to ${intakeConfig.companyName}` : "Begin Your Journey"}
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-md">
            You're taking a powerful step toward financial freedom. By connecting your report today, you're unlocking a personalized path to better credit and new opportunities.
          </p>
          <div className="mt-12 space-y-8 text-left max-w-md">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-full" style={{ backgroundColor: intakeTint }}>
                <FileText className="h-6 w-6" style={{ color: intakePrimaryColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">1. Instant Analysis</h3>
                <p className="text-slate-600 text-sm">
                  Once you connect, our system instantly analyzes your report to identify errors, negative items, and opportunities for improvement.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-full" style={{ backgroundColor: intakeTint }}>
                <Target className="h-6 w-6" style={{ color: intakePrimaryColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">2. Custom Dispute Strategy</h3>
                <p className="text-slate-600 text-sm">
                  We generate a personalized plan to challenge inaccuracies. You'll see exactly what we're targeting to help boost your score.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-full" style={{ backgroundColor: intakeTint }}>
                <TrendingUp className="h-6 w-6" style={{ color: intakePrimaryColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">3. Track Your Success</h3>
                <p className="text-slate-600 text-sm">
                  Log in to your secure dashboard 24/7 to monitor your progress, view score updates, and watch your financial health improve.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 rounded-full" style={{ backgroundColor: intakeTint }}>
                <ShieldCheck className="h-6 w-6" style={{ color: intakePrimaryColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Secure & Confidential</h3>
                <p className="text-slate-600 text-sm">
                  Your journey is private. We use bank-level encryption to protect your data while we work hard to restore your credit.
                </p>
              </div>
            </div>

            {(intakeConfig.websiteUrl || intakeConfig.contactEmail || intakeConfig.contactPhone) && (
              <>
                <div className="border-t border-slate-200"></div>
                <div className="space-y-4">
                  {intakeConfig.websiteUrl && (
                    <a href={intakeConfig.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                      <Globe className="h-4 w-4 flex-shrink-0" style={{ color: intakePrimaryColor }} />
                      <span className="truncate">{intakeConfig.websiteUrl.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )}
                  {intakeConfig.contactEmail && (
                    <a href={`mailto:${intakeConfig.contactEmail}`} className="flex items-center gap-3 text-sm text-slate-600 hover:text-slate-800 transition-colors">
                      <Mail className="h-4 w-4 flex-shrink-0" style={{ color: intakePrimaryColor }} />
                      <span className="truncate">{intakeConfig.contactEmail}</span>
                    </a>
                  )}
                  {intakeConfig.contactPhone && (
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <Phone className="h-4 w-4 flex-shrink-0" style={{ color: intakePrimaryColor }} />
                      <span>{intakeConfig.contactPhone}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {loadingConfig ? (
            <Card className="p-8 animate-pulse">
              <div className="h-8 w-3/4 bg-slate-200 rounded mb-4"></div>
              <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
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
          ) : (
            <div>
              <div className="text-center lg:hidden mb-8">
                {intakeConfig.logoUrl ? (
                  <img src={intakeConfig.logoUrl} alt="Brand logo" className="mx-auto mb-4 max-h-12 object-contain" />
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

              {/* Mobile-only journey steps */}
              <div className="mt-10 lg:hidden space-y-6 text-left max-w-md mx-auto px-2">
                <h3 className="font-semibold text-slate-800 text-center mb-6">Your Path to Better Credit</h3>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">1</div>
                  <div>
                    <h4 className="font-medium text-slate-800">Instant Analysis</h4>
                    <p className="text-sm text-slate-600 mt-1">We identify errors and negative items immediately.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">2</div>
                  <div>
                    <h4 className="font-medium text-slate-800">Custom Strategy</h4>
                    <p className="text-sm text-slate-600 mt-1">We build a plan to challenge inaccuracies.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">3</div>
                  <div>
                    <h4 className="font-medium text-slate-800">See Results</h4>
                    <p className="text-sm text-slate-600 mt-1">Track your progress on your personal dashboard.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientIntake;
