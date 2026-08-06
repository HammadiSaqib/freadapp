import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Loader2, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { kycApi } from "@/lib/api";

type KycStatus = "not_started" | "pending" | "approved" | "failed" | "manual_review";

interface KycVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: KycStatus;
  adminNotes?: string | null;
  onSubmitted?: () => Promise<void> | void;
}

const SUPPORT_PHONE = "(475) 259-8768";

export default function KycVerificationDialog({
  open,
  onOpenChange,
  status,
  adminNotes,
  onSubmitted,
}: KycVerificationDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);

  const needsResubmission = status === "failed";

  const statusLabel = useMemo(() => {
    if (status === "pending") return "Pending review";
    if (status === "approved") return "Approved";
    if (status === "failed") return "Verification failed";
    if (status === "manual_review") return "Manual review";
    return "Not started";
  }, [status]);

  const clearCaptureCountdown = () => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCaptureCountdown(null);
  };

  const stopCamera = () => {
    clearCaptureCountdown();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (error: any) {
      setCameraError(error?.message || "We could not access your camera.");
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    void startCamera();

    return () => {
      stopCamera();
    };
  }, [open]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }
    };
  }, [capturedPreviewUrl]);

  const capturePhotoNow = () => {
    if (!videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Could not capture image. Please try again.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError("Could not capture image. Please try again.");
        return;
      }

      if (capturedPreviewUrl) {
        URL.revokeObjectURL(capturedPreviewUrl);
      }

      const file = new File([blob], `kyc-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      setCapturedFile(file);
      setCapturedPreviewUrl(URL.createObjectURL(file));
    }, "image/jpeg", 0.92);
  };

  const startCaptureCountdown = () => {
    if (!cameraReady || captureCountdown !== null) {
      return;
    }

    let nextCount = 5;
    setCaptureCountdown(nextCount);

    countdownTimerRef.current = window.setInterval(() => {
      nextCount -= 1;

      if (nextCount <= 0) {
        clearCaptureCountdown();
        capturePhotoNow();
        return;
      }

      setCaptureCountdown(nextCount);
    }, 1000);
  };

  const resetCapture = () => {
    clearCaptureCountdown();
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedFile(null);
    setCapturedPreviewUrl(null);
  };

  const handleSubmit = async () => {
    if (!capturedFile) {
      toast({
        title: "Capture your KYC image",
        description: "Please capture a clear selfie before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await kycApi.submit(capturedFile);
      toast({
        title: "KYC submitted",
        description: "Your KYC has been submitted and is waiting for review.",
      });
      await onSubmitted?.();
      resetCapture();
      stopCamera();
      onOpenChange(false);
      setShowSupportDialog(true);
    } catch (error: any) {
      toast({
        title: "Unable to submit KYC",
        description: error?.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>KYC Verification</DialogTitle>
                <DialogDescription>
                  Complete identity verification to add or manage additional client profiles.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm text-slate-600">Current status</div>
              <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                {statusLabel}
              </Badge>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Instructions</AlertTitle>
              <AlertDescription className="space-y-2 text-blue-900/90">
                <p>
                  Please hold your government-issued ID or driving license in one hand and your debit/credit card in the other hand. Make sure your face, ID, and card are visible.
                </p>
                <p>
                  Cover the middle digits of your card if possible. Only your name and last 4 digits should be visible.
                </p>
              </AlertDescription>
            </Alert>

            {needsResubmission && adminNotes ? (
              <Alert className="border-amber-200 bg-amber-50">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Resubmission requested</AlertTitle>
                <AlertDescription className="text-amber-900/90">
                  {adminNotes}
                </AlertDescription>
              </Alert>
            ) : null}

            {cameraError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Camera access issue</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                {capturedPreviewUrl ? (
                  <img src={capturedPreviewUrl} alt="Captured KYC preview" className="h-[360px] w-full object-cover" />
                ) : (
                  <video ref={videoRef} playsInline muted className="h-[360px] w-full object-cover" />
                )}
                {captureCountdown !== null ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/55 text-white">
                    <div className="rounded-full border border-white/20 bg-white/10 px-6 py-3 text-5xl font-semibold">
                      {captureCountdown}
                    </div>
                    <div className="mt-4 text-sm text-white/90">
                      Hold your face, ID, and card steady
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-900">Checklist</div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />Face clearly visible</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />Government-issued ID visible</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />Debit or credit card visible</li>
                  <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />Only last 4 card digits showing if possible</li>
                </ul>

                <div className="grid gap-2 pt-2">
                  {!capturedPreviewUrl ? (
                    <Button type="button" onClick={startCaptureCountdown} disabled={!cameraReady || captureCountdown !== null}>
                      <Camera className="mr-2 h-4 w-4" />
                      {captureCountdown !== null ? `Capturing in ${captureCountdown}s` : "Capture KYC Selfie"}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={resetCapture}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retake Photo
                    </Button>
                  )}

                  <Button type="button" variant="outline" onClick={() => void startCamera()} disabled={captureCountdown !== null}>
                    <Camera className="mr-2 h-4 w-4" />
                    Restart Camera
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting || !capturedFile}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Submit KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>KYC Submitted</DialogTitle>
            <DialogDescription>
              Your KYC has been submitted and is waiting for review.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            If you want to verify your KYC now, contact our support number at{" "}
            <a href="tel:+14752598768" className="font-semibold text-emerald-700 underline underline-offset-2">
              {SUPPORT_PHONE}
            </a>
            . Our support staff can help verify it with you in real time.
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSupportDialog(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
