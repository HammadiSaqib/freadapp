import { useEffect, useState } from "react";
import { Loader2, PhoneCall, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  REPORT_PULL_ERROR_EVENT,
  REPORT_PULL_LOADING_EVENT,
  REPORT_PULL_SUCCESS_EVENT,
  REPORT_PULL_SUPPORT_PHONE,
  type ReportPullErrorDetail,
  type ReportPullLoadingDetail,
} from "@/lib/reportPullFeedback";

const loadingSteps = [
  "Encrypted session start",
  "Credential verification",
  "Fetching bureau data",
];

const REPORT_PULL_MAX_SECONDS = 80;

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes} min ${String(remainingSeconds).padStart(2, "0")} sec`;
}

export default function ReportPullFeedbackHost() {
  const [loadingState, setLoadingState] = useState<Required<ReportPullLoadingDetail> | null>(null);
  const [errorState, setErrorState] = useState<Required<ReportPullErrorDetail> | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(REPORT_PULL_MAX_SECONDS);

  useEffect(() => {
    const handleLoading = (event: Event) => {
      const detail = (event as CustomEvent<ReportPullLoadingDetail>).detail;
      setErrorState(null);
      setCountdownSeconds(REPORT_PULL_MAX_SECONDS);
      setLoadingState({
        title: detail?.title || "Pulling Client Report",
        description:
          detail?.description ||
          "Securely connecting to the bureau portal, verifying credentials, and fetching the latest report.",
      });
    };

    const handleSuccess = () => {
      setLoadingState(null);
    };

    const handleError = (event: Event) => {
      const detail = (event as CustomEvent<ReportPullErrorDetail>).detail;
      setLoadingState(null);
      setErrorState({
        title: detail?.title || "We Couldn't Pull This Report",
        description:
          detail?.description ||
          `Please double-check your email and password. If you still face the same issue, contact support at ${REPORT_PULL_SUPPORT_PHONE}.`,
        supportPhone: detail?.supportPhone || REPORT_PULL_SUPPORT_PHONE,
      });
    };

    window.addEventListener(REPORT_PULL_LOADING_EVENT, handleLoading as EventListener);
    window.addEventListener(REPORT_PULL_SUCCESS_EVENT, handleSuccess);
    window.addEventListener(REPORT_PULL_ERROR_EVENT, handleError as EventListener);

    return () => {
      window.removeEventListener(REPORT_PULL_LOADING_EVENT, handleLoading as EventListener);
      window.removeEventListener(REPORT_PULL_SUCCESS_EVENT, handleSuccess);
      window.removeEventListener(REPORT_PULL_ERROR_EVENT, handleError as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!loadingState) {
      return;
    }

    setCountdownSeconds(REPORT_PULL_MAX_SECONDS);

    const intervalId = window.setInterval(() => {
      setCountdownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadingState]);

  return (
    <>
      <Dialog open={Boolean(loadingState)}>
        <DialogContent
          className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-2xl [&>button]:hidden"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <div className="relative overflow-hidden rounded-[32px] border border-cyan-200/40 bg-slate-950 text-white shadow-[0_30px_120px_rgba(15,23,42,0.75)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.24),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(8,47,73,0.94))]" />
            <div className="relative p-8 sm:p-10">
              <div className="mb-6 flex items-center gap-3 text-cyan-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-100/80">Live Report Pull</p>
                  <p className="text-sm text-slate-300">Please keep this window open while we finish the fetch.</p>
                </div>
              </div>

              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-300/30 bg-white/5 shadow-[0_0_0_12px_rgba(34,211,238,0.08)]">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-300" />
                </div>
                <DialogHeader className="space-y-3 text-center">
                  <DialogTitle className="text-3xl font-black tracking-tight text-white">
                    {loadingState?.title}
                  </DialogTitle>
                  <DialogDescription className="mx-auto max-w-xl text-base leading-7 text-slate-300">
                    {loadingState?.description}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-6 inline-flex flex-col items-center gap-2 rounded-2xl border border-cyan-300/20 bg-white/5 px-5 py-4 text-center backdrop-blur">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/80">
                    Estimated Maximum Time
                  </p>
                  <p className="text-2xl font-black tracking-tight text-cyan-200">
                    {formatCountdown(countdownSeconds)}
                  </p>
                  <p className="text-xs text-slate-400">
                    This countdown keeps ticking while the report is being fetched.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {loadingSteps.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left backdrop-blur"
                  >
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-200/80">
                      Step {index + 1}
                    </p>
                    <p className="text-sm font-semibold text-white">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(errorState)} onOpenChange={(open) => !open && setErrorState(null)}>
        <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-xl">
          <div className="relative overflow-hidden rounded-[28px] border border-rose-200/70 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.18)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,113,133,0.22),_transparent_45%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(255,255,255,1))]" />
            <div className="relative p-8 sm:p-9">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-100 text-rose-600 shadow-sm">
                <ShieldAlert className="h-8 w-8" />
              </div>

              <DialogHeader className="space-y-3 text-left">
                <DialogTitle className="text-3xl font-black tracking-tight text-slate-950">
                  {errorState?.title}
                </DialogTitle>
                <DialogDescription className="text-base leading-7 text-slate-600">
                  {errorState?.description}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Support Number</p>
                <a
                  href={`tel:${normalizePhone(errorState?.supportPhone || REPORT_PULL_SUPPORT_PHONE)}`}
                  className="mt-2 inline-flex items-center gap-2 text-lg font-black text-slate-900 hover:text-rose-600"
                >
                  <PhoneCall className="h-5 w-5" />
                  {errorState?.supportPhone || REPORT_PULL_SUPPORT_PHONE}
                </a>
              </div>

              <DialogFooter className="mt-8 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
                <a
                  href={`tel:${normalizePhone(errorState?.supportPhone || REPORT_PULL_SUPPORT_PHONE)}`}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Call Support
                </a>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                  onClick={() => setErrorState(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}