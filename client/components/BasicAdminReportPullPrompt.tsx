import { useEffect, useMemo, useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  BASIC_ADMIN_REPORT_PULL_PLATFORMS,
  requiresReportPullSsn,
  saveAndPullClientReport,
} from "@/lib/basicAdminReportPull";

type ReportPullFormValues = {
  platform: string;
  platform_email: string;
  platform_password: string;
  ssn_last_four: string;
};

interface BasicAdminReportPullPromptProps {
  open: boolean;
  clientId?: string | null;
  initialValues?: Partial<ReportPullFormValues> | null;
  clientName?: string | null;
  onPullStarted?: (values: ReportPullFormValues) => void | Promise<void>;
}

const getInitialFormValues = (initialValues?: Partial<ReportPullFormValues> | null): ReportPullFormValues => ({
  platform: String(initialValues?.platform || "myfreescorenow").trim().toLowerCase() || "myfreescorenow",
  platform_email: String(initialValues?.platform_email || ""),
  platform_password: String(initialValues?.platform_password || ""),
  ssn_last_four: String(initialValues?.ssn_last_four || "").replace(/\D/g, "").slice(0, 4),
});

export default function BasicAdminReportPullPrompt({
  open,
  clientId,
  initialValues,
  clientName,
  onPullStarted,
}: BasicAdminReportPullPromptProps) {
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<ReportPullFormValues>(() => getInitialFormValues(initialValues));
  const [showPassword, setShowPassword] = useState(false);
  const [hasAuthorization, setHasAuthorization] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pullQueued, setPullQueued] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormValues(getInitialFormValues(initialValues));
    setShowPassword(false);
    setHasAuthorization(false);
    setIsSubmitting(false);
    setPullQueued(false);
  }, [initialValues, open, clientId]);

  const requiresSsn = useMemo(() => requiresReportPullSsn(formValues.platform), [formValues.platform]);

  if (!open) {
    return null;
  }

  const updateField = (field: keyof ReportPullFormValues, value: string) => {
    setFormValues((current) => ({
      ...current,
      [field]: field === "ssn_last_four" ? value.replace(/\D/g, "").slice(0, 4) : value,
    }));
  };

  const handleSubmit = async () => {
    if (!clientId) {
      toast({
        title: "Profile Not Found",
        description: "We couldn't find your profile record to pull this report.",
        variant: "destructive",
      });
      return;
    }

    if (!formValues.platform || !formValues.platform_email.trim() || !formValues.platform_password) {
      toast({
        title: "Missing Information",
        description: "Please select your platform and enter your monitoring login details.",
        variant: "destructive",
      });
      return;
    }

    if (requiresSsn && formValues.ssn_last_four.length !== 4) {
      toast({
        title: "SSN Last 4 Required",
        description: "Please enter the last 4 digits of your SSN for this platform.",
        variant: "destructive",
      });
      return;
    }

    if (!hasAuthorization) {
      toast({
        title: "Authorization Required",
        description: "Please confirm that this is your credit report before continuing.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await saveAndPullClientReport({
        clientId,
        platform: formValues.platform,
        platformEmail: formValues.platform_email,
        platformPassword: formValues.platform_password,
        ssnLast4: formValues.ssn_last_four,
      });

      setPullQueued(true);
      toast({
        title: "Report Scraping Started",
        description: "We started pulling your latest report. This page will refresh shortly.",
      });

      await onPullStarted?.(formValues);
    } catch (error) {
      console.error("Error pulling basic admin report:", error);
      toast({
        title: "Scraping Failed",
        description:
          (error as any)?.response?.data?.message
          || (error instanceof Error ? error.message : "Failed to pull the credit report. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[11000] bg-slate-950/35 backdrop-blur-sm" />

      <div className="fixed inset-0 z-[11001] flex items-center justify-center px-4">
        <div className="mx-4 w-full max-w-lg rounded-2xl border border-gray-200 bg-white/95 p-8 shadow-2xl dark:border-slate-700 dark:bg-slate-800/95">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600">
            <Lock className="h-8 w-8 text-white" />
          </div>

          {pullQueued ? (
            <div className="space-y-4 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Report Pull Started</h2>
              <p className="text-gray-600 dark:text-gray-300">
                We started pulling {clientName ? `${clientName}'s` : "your"} latest credit report. Keep this page open while the system refreshes your data.
              </p>
              <Button
                onClick={() => window.location.reload()}
                className="w-full rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-cyan-700"
              >
                Refresh Page
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Pull Your Report</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Enter your credit monitoring login to unlock the Profile and Work Area tabs.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="basic-admin-platform">Credit Monitoring Platform</Label>
                  <Select value={formValues.platform} onValueChange={(value) => updateField("platform", value)}>
                    <SelectTrigger id="basic-admin-platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {BASIC_ADMIN_REPORT_PULL_PLATFORMS.map((platform) => (
                        <SelectItem key={platform.value} value={platform.value}>
                          {platform.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basic-admin-platform-email">Platform Email/Username</Label>
                  <Input
                    id="basic-admin-platform-email"
                    type="text"
                    value={formValues.platform_email}
                    onChange={(event) => updateField("platform_email", event.target.value)}
                    placeholder="Enter platform email"
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basic-admin-platform-password">Platform Password</Label>
                  <div className="relative">
                    <Input
                      id="basic-admin-platform-password"
                      type={showPassword ? "text" : "password"}
                      value={formValues.platform_password}
                      onChange={(event) => updateField("platform_password", event.target.value)}
                      placeholder="Enter platform password"
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {requiresSsn && (
                  <div className="space-y-2">
                    <Label htmlFor="basic-admin-platform-ssn">SSN Last 4</Label>
                    <Input
                      id="basic-admin-platform-ssn"
                      type="tel"
                      inputMode="numeric"
                      maxLength={4}
                      value={formValues.ssn_last_four}
                      onChange={(event) => updateField("ssn_last_four", event.target.value)}
                      placeholder="1234"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                <Checkbox
                  id="basic-admin-report-authorize"
                  checked={hasAuthorization}
                  onCheckedChange={(checked) => setHasAuthorization(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="basic-admin-report-authorize" className="cursor-pointer text-sm leading-5 text-slate-600 dark:text-slate-300">
                  Confirm this is my credit report and I authorize its use for educational analysis.
                </Label>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full rounded-md bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-cyan-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Pulling Your Report...
                  </>
                ) : (
                  "Pull Your Report"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}