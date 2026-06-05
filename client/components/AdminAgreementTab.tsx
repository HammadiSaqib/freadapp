import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

type LatestContract = {
  id: number;
  status: "sent" | "pending_signature" | "signed" | string;
  title: string;
  content: string;
};

const SignaturePad: React.FC<{ onChange: (dataUrl: string | null) => void }>
  = ({ onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827"; // gray-900

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e instanceof TouchEvent) {
        const t = e.touches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      const m = e as MouseEvent;
      return { x: m.clientX - rect.left, y: m.clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      drawing.current = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsEmpty(false);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!drawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };
    const end = () => {
      if (!drawing.current) return;
      drawing.current = false;
      onChange(canvas.toDataURL("image/png"));
    };

    const handleMouseDown = (e: MouseEvent) => start(e);
    const handleMouseMove = (e: MouseEvent) => move(e);
    const handleMouseUp = () => end();
    const handleTouchStart = (e: TouchEvent) => start(e);
    const handleTouchMove = (e: TouchEvent) => move(e);
    const handleTouchEnd = () => end();

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("touchstart", handleTouchStart, { passive: true });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full border rounded-md bg-white"
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={clear} disabled={isEmpty}>
          Clear
        </Button>
      </div>
    </div>
  );
};

export const AdminAgreementTab: React.FC = () => {
  const { userProfile } = useAuthContext();
  const { toast } = useToast();
  const isAdmin = useMemo(() => userProfile?.role === "admin", [userProfile]);

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [agree, setAgree] = useState(false);
  const [signatureType, setSignatureType] = useState<"typed" | "drawn">("typed");
  const [signatureText, setSignatureText] = useState("");
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [contract, setContract] = useState<LatestContract | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/api/contracts-admin/latest");
        const data = res?.data?.data as LatestContract | undefined;
        if (data) {
          setContract(data);
        } else {
          setContract(null);
        }
      } catch (e: any) {
        if (e?.response?.status === 404) {
          setContract(null);
        } else {
          setError(e?.response?.data?.error || e?.message || "Failed to load agreement");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, []);

  const canSign = useMemo(() => {
    const needsSignature = contract?.status === "sent" || contract?.status === "pending_signature";
    if (!needsSignature || !isAdmin) return false;
    if (!agree) return false;
    if (signatureType === "typed") return signatureText.trim().length > 0;
    return !!signatureImage;
  }, [contract, isAdmin, agree, signatureType, signatureText, signatureImage]);

  const handleSign = async () => {
    if (!contract) return;
    try {
      setSigning(true);
      const payload: any = {};
      if (signatureType === "typed") {
        payload.signature_text = signatureText.trim();
      } else if (signatureImage) {
        payload.signature_image_url = signatureImage;
      }
      await api.post("/api/contracts-admin/latest/sign", payload);
      toast({ title: "Agreement signed", description: "Your admin agreement has been signed." });
      setContract({ ...contract, status: "signed" });
    } catch (e: any) {
      toast({
        title: "Failed to sign",
        description: e?.response?.data?.error || e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agreement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Only admin users can access the agreement.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <CardTitle>{contract?.title || "Admin Onboarding Agreement"}</CardTitle>
          {contract?.status && (
            <Badge variant={contract.status === "signed" ? "default" : "secondary"}>
              {contract.status}
            </Badge>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading agreement…</p>
        ) : contract ? (
          <>
            <ScrollArea className="h-[400px] border rounded-md p-4 bg-background">
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: contract.content }}
              />
            </ScrollArea>

            {contract.status === "signed" ? (
              <div className="text-sm text-muted-foreground">
                This agreement is signed. No further action is required.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Signature Type</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={signatureType === "typed"}
                        onCheckedChange={(checked) => checked && setSignatureType("typed")}
                      />
                      <span>Typed</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={signatureType === "drawn"}
                        onCheckedChange={(checked) => checked && setSignatureType("drawn")}
                      />
                      <span>Drawn</span>
                    </label>
                  </div>
                </div>

                {signatureType === "typed" ? (
                  <div className="space-y-2">
                    <Label htmlFor="signatureText">Type your full name</Label>
                    <Input
                      id="signatureText"
                      placeholder="John Doe"
                      value={signatureText}
                      onChange={(e) => setSignatureText(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Draw your signature</Label>
                    <SignaturePad onChange={setSignatureImage} />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
                  <Label>I have read and agree to the terms above.</Label>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSign} disabled={!canSign || signing}>
                    {signing ? "Signing…" : "Sign Now"}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No agreement available.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAgreementTab;