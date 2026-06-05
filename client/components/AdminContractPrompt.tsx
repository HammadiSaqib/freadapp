import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface AdminLatestContract {
  id: number;
  status: string;
  title?: string;
  content?: string | null;
}

export default function AdminContractPrompt() {
  const { userProfile } = useAuthContext();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [contract, setContract] = useState<AdminLatestContract | null>(null);
  const [signatureText, setSignatureText] = useState("");
  const [signatureMode, setSignatureMode] = useState<"type" | "draw">("type");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldPrompt = (status?: string | null) => {
    if (!status) return false;
    const normalized = status.toLowerCase();
    return normalized === "sent" || normalized === "pending_signature";
  };

  const fetchLatest = async () => {
    if (userProfile?.role !== "admin") return;
    try {
      setLoading(true);
      setError(null);
      const resp = await api.get("/api/contracts-admin/latest");
      const data = resp?.data?.data as AdminLatestContract | undefined;
      if (data && shouldPrompt(data.status)) {
        setContract(data);
        setOpen(true);
      } else {
        setContract(null);
        setOpen(false);
      }
    } catch (err: any) {
      // 404 is fine (no contract found for admin)
      if (err?.response?.status === 404) {
        setContract(null);
        setOpen(false);
      } else {
        console.error("AdminContractPrompt: failed to fetch latest contract", err);
        setError("Failed to check admin contract status.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.role]);

  useEffect(() => {
    const onRequire = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await api.get("/api/contracts-admin/latest");
        const data = resp?.data?.data as AdminLatestContract | undefined;
        if (data && shouldPrompt(data.status)) {
          setContract(data);
          setOpen(true);
        } else {
          setContract(null);
          setOpen(false);
        }
      } catch (err: any) {
        setError("Failed to check admin contract status.");
      } finally {
        setLoading(false);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("admin-contract-required", onRequire as any);
      return () => window.removeEventListener("admin-contract-required", onRequire as any);
    }
    return;
  }, []);

  const handleSign = async () => {
    if (!contract?.id) return;
    try {
      setSigning(true);
      const payload: any = {};
      if (signatureMode === "draw") {
        if (!signatureDataUrl) {
          toast({ title: "Signature required", description: "Please draw your signature." });
          setSigning(false);
          return;
        }
        payload.signature_image_url = signatureDataUrl;
      } else {
        payload.signature_text = signatureText || undefined;
      }
      await api.post("/api/contracts-admin/latest/sign", payload);
      toast({
        title: "Agreement signed",
        description: "Your Admin Onboarding Agreement has been signed successfully.",
      });
      setOpen(false);
      setContract({ ...contract, status: "signed" });
      // Clear session gating so future sessions can prompt if needed
      try {
        const sessionKey = `admin_contract_prompt_shown_${userProfile?.id ?? 'unknown'}`;
        if (typeof window !== 'undefined') sessionStorage.removeItem(sessionKey);
      } catch {}
    } catch (err: any) {
      console.error("AdminContractPrompt: sign failed", err);
      const msg = err?.response?.data?.error || "Failed to sign agreement.";
      toast({ title: "Error", description: msg });
    } finally {
      setSigning(false);
    }
  };

  // Drawing helpers
  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    return ctx;
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#0f172a"; // slate-900
    ctx.fillStyle = "#ffffff";
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawing(false);
    setSignatureDataUrl(null);
  };

  useEffect(() => {
    // Initialize canvas when switching to draw mode
    if (signatureMode === "draw") {
      setTimeout(() => initCanvas(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureMode, open]);

  const pointerPos = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (signatureMode !== "draw") return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawing(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || signatureMode !== "draw") return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerUp = () => {
    if (signatureMode !== "draw") return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureDataUrl(dataUrl);
  };

  const clearCanvas = () => {
    initCanvas();
  };

  if (userProfile?.role !== "admin") return null;

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!contract || !shouldPrompt(contract.status)) setOpen(next);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {contract?.title || "Action Required: Admin Onboarding Agreement"}
          </DialogTitle>
          <DialogDescription>
            Please review and sign to unlock all features of your admin account.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="text-sm text-muted-foreground">Checking for pending agreement...</div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-600">{error}</div>
        )}

        {!loading && contract && shouldPrompt(contract.status) && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Agreement Preview</Label>
              <ScrollArea className="mt-2 h-48 rounded-md border p-3 bg-slate-50 dark:bg-slate-800">
                {contract.content ? (
                  // Render as HTML if the content looks like HTML; otherwise plain text
                  contract.content.match(/<[^>]+>/) ? (
                    <div dangerouslySetInnerHTML={{ __html: contract.content }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">{contract.content}</pre>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No preview content available. You can still proceed to sign.
                  </p>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={signatureMode === "type" ? "default" : "outline"}
                  onClick={() => setSignatureMode("type")}
                >
                  Type Signature
                </Button>
                <Button
                  type="button"
                  variant={signatureMode === "draw" ? "default" : "outline"}
                  onClick={() => setSignatureMode("draw")}
                >
                  Draw Signature
                </Button>
              </div>

              {signatureMode === "type" ? (
                <div className="grid gap-2">
                  <Label htmlFor="signatureText">Type your full name as signature</Label>
                  <Input
                    id="signatureText"
                    placeholder="e.g., Jane Doe"
                    value={signatureText}
                    onChange={(e) => setSignatureText(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label>Draw your signature</Label>
                  <div className="rounded-md border bg-white">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-40 touch-none"
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerLeave={onPointerUp}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={clearCanvas}>Clear</Button>
                    {hasDrawing && signatureDataUrl && (
                      <span className="text-xs text-muted-foreground">Signature captured</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
              <Label htmlFor="agree" className="text-sm">
                I acknowledge I have read and agree to the terms.
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            className="gradient-primary"
            onClick={handleSign}
            disabled={
              signing ||
              !agree ||
              (signatureMode === "type" ? !signatureText : !signatureDataUrl)
            }
          >
            {signing ? "Signing..." : "Sign Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
