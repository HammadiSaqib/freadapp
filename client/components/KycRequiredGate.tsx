import { useEffect, useRef, useState } from "react";
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
import { useAuthContext } from "@/contexts/AuthContext";

type KycStatus = "not_started" | "pending" | "approved" | "failed" | "manual_review";

export default function KycRequiredGate() {
  const { userProfile, isLoading } = useAuthContext();
  const [requiredOpen, setRequiredOpen] = useState(false);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [status, setStatus] = useState<KycStatus>("not_started");
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const sessionPromptKeyRef = useRef<string | null>(null);

  const loadStatus = async (options?: { openIfRequired?: boolean }) => {
    try {
      const response = await kycApi.getMe();
      const nextStatus = (response.data?.kyc_status || "not_started") as KycStatus;
      const shouldRequire = Boolean(response.data?.kyc_required) && nextStatus !== "approved";
      setStatus(nextStatus);
      setAdminNotes(response.data?.admin_notes || null);

      if (options?.openIfRequired && shouldRequire) {
        setRequiredOpen(true);
      }
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

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!userProfile?.id || userProfile.role !== "admin") {
      if (sessionPromptKeyRef.current) {
        sessionStorage.removeItem(sessionPromptKeyRef.current);
        sessionPromptKeyRef.current = null;
      }
      return;
    }

    const promptKey = `kyc-login-prompt:${userProfile.id}`;
    sessionPromptKeyRef.current = promptKey;

    if (sessionStorage.getItem(promptKey) === "shown") {
      return;
    }

    sessionStorage.setItem(promptKey, "shown");
    void loadStatus({ openIfRequired: true });
  }, [isLoading, userProfile?.id, userProfile?.role]);

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
              To protect consumer information and maintain platform security, identity verification is required before you can add more client profiles.
              <span className="mt-3 block">
                You have already used your first client slot. Complete KYC to unlock additional clients, and this reminder will continue to appear when you sign in until approval is complete.
              </span>
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
