import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { kycApi } from "@/lib/api";
import KycVerificationDialog from "@/components/KycVerificationDialog";

type KycStatus = "not_started" | "pending" | "approved" | "failed" | "manual_review";

export default function KycRequiredGate() {
  const [requiredOpen, setRequiredOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [status, setStatus] = useState<KycStatus>("not_started");
  const [adminNotes, setAdminNotes] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const response = await kycApi.getMe();
      setStatus((response.data?.kyc_status || "not_started") as KycStatus);
      setAdminNotes(response.data?.admin_notes || null);
    } catch {
      // The server response that opened this gate remains authoritative.
    }
  };

  useEffect(() => {
    const handleRequired = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: KycStatus }>).detail;
      setStatus(detail?.status || "not_started");
      setRequiredOpen(true);
      void loadStatus();
    };
    window.addEventListener("kyc-required", handleRequired);
    return () => window.removeEventListener("kyc-required", handleRequired);
  }, []);

  const beginVerification = () => {
    setRequiredOpen(false);
    setVerificationOpen(true);
  };

  return (
    <>
      <Dialog open={requiredOpen} onOpenChange={setRequiredOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <DialogTitle>Identity Verification Required</DialogTitle>
            <DialogDescription className="pt-2 text-left leading-6 text-slate-600">
              To protect consumer information and maintain platform security, identity verification is required before you can add or manage additional client profiles.
              <span className="mt-3 block">Please complete verification to continue.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setRequiredOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={beginVerification}>
              Complete Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KycVerificationDialog
        open={verificationOpen}
        onOpenChange={setVerificationOpen}
        status={status}
        adminNotes={adminNotes}
        onSubmitted={loadStatus}
      />
    </>
  );
}
