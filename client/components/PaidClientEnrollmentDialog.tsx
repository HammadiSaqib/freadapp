import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Copy, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { clientsApi } from "@/lib/api";
import { buildOnboardingIntakeUrl } from "@/lib/hostRouting";
import { copyClientEnrollmentCheckoutLink, createClientEnrollmentCheckoutLink } from "@/lib/clientEnrollment";

export type PaidClientPlan = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  billing_cycle: string;
  features?: string[];
};

export type PaidClientEnrollmentRequest = {
  plans: PaidClientPlan[];
  clientData: Record<string, any>;
  source: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: PaidClientEnrollmentRequest | null;
};

const formatPrice = (price: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: Number(price) % 1 === 0 ? 0 : 2,
}).format(Number(price || 0));

const safeClientIdentity = (clientData: Record<string, any>) => ({
  first_name: clientData.first_name || null,
  last_name: clientData.last_name || null,
  email: clientData.email || clientData.platform_email || null,
  phone: clientData.phone || null,
});

export function getPaidClientEnrollmentRequest(error: any, clientData: Record<string, any>, source: string): PaidClientEnrollmentRequest | null {
  if (error?.response?.status !== 402 || error?.response?.data?.code !== "CLIENT_PLAN_PAYMENT_REQUIRED") {
    return null;
  }

  const enrollment = error?.response?.data?.enrollment || {};
  const plans = Array.isArray(enrollment.clientPlans)
    ? enrollment.clientPlans
    : enrollment.clientPlan
      ? [enrollment.clientPlan]
      : [];

  return { plans, clientData: safeClientIdentity(clientData), source };
}

export default function PaidClientEnrollmentDialog({ open, onOpenChange, request }: Props) {
  const { toast } = useToast();
  const plans = request?.plans || [];
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [workingAction, setWorkingAction] = useState<"copy" | "pay" | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [clientIdentity, setClientIdentity] = useState({ first_name: "", last_name: "", email: "", phone: "" });

  useEffect(() => {
    if (!open) return;
    setSelectedPlanId(plans[0]?.id || null);
    setWorkingAction(null);
    setLinkCopied(false);
    setClientIdentity({
      first_name: String(request?.clientData?.first_name || ""),
      last_name: String(request?.clientData?.last_name || ""),
      email: String(request?.clientData?.email || request?.clientData?.platform_email || ""),
      phone: String(request?.clientData?.phone || ""),
    });
  }, [open, plans, request]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  const createPublicIntakeReturnUrl = async () => {
    const tokenResponse = await clientsApi.getClientIntakeToken();
    const token = String(tokenResponse?.data?.token || "").trim();
    if (!token) throw new Error("Unable to create the secure client intake link.");
    return { token, returnUrl: buildOnboardingIntakeUrl({ token }) };
  };

  const validateSelection = () => {
    if (!selectedPlan || !request) {
      toast({ title: "Select a plan", description: "Choose a client plan before continuing.", variant: "destructive" });
      return false;
    }
    if (!clientIdentity.email.trim()) {
      toast({ title: "Client email required", description: "Enter the client's email before creating payment.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleCopyLink = async () => {
    if (!validateSelection() || !selectedPlan || !request) return;
    setWorkingAction("copy");
    try {
      const { token, returnUrl } = await createPublicIntakeReturnUrl();
      await copyClientEnrollmentCheckoutLink({
        token,
        planId: selectedPlan.id,
        payerType: "client",
        source: request.source,
        returnUrl,
        clientData: safeClientIdentity(clientIdentity),
      });
      setLinkCopied(true);
      toast({
        title: "Client payment link copied",
        description: "Send the secure Stripe link to the client. After payment, their intake form will unlock.",
      });
    } catch (error: any) {
      toast({
        title: "Unable to create payment link",
        description: error?.response?.data?.error || error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setWorkingAction(null);
    }
  };

  const handleAdminPay = async () => {
    if (!validateSelection() || !selectedPlan || !request) return;
    setWorkingAction("pay");
    try {
      const { token, returnUrl } = await createPublicIntakeReturnUrl();
      const checkoutUrl = await createClientEnrollmentCheckoutLink({
        token,
        planId: selectedPlan.id,
        payerType: "admin",
        source: request.source,
        returnUrl,
        clientData: safeClientIdentity(clientIdentity),
      });
      window.location.assign(checkoutUrl);
    } catch (error: any) {
      toast({
        title: "Unable to open checkout",
        description: error?.response?.data?.error || error?.message || "Please try again.",
        variant: "destructive",
      });
      setWorkingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          zIndex: 12001,
          position: "fixed",
          left: "50vw",
          top: "50vh",
          transform: "translate(-50%, -50%)",
          maxHeight: "calc(100vh - 2rem)",
          animation: "none",
        }}
        className="overflow-y-auto border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:max-w-3xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CreditCard className="h-6 w-6 text-emerald-600" />
            Complete Client Enrollment
          </DialogTitle>
          <DialogDescription>
            This admin plan requires a paid client enrollment. Select a global client plan, then let the client pay or cover it yourself.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-slate-200 bg-slate-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Client details</CardTitle>
            <CardDescription>The payment and unlocked intake form will be tied to this client.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="enrollment-client-first-name">First name</Label>
              <Input
                id="enrollment-client-first-name"
                value={clientIdentity.first_name}
                onChange={(event) => setClientIdentity((current) => ({ ...current, first_name: event.target.value }))}
                placeholder="Client first name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="enrollment-client-last-name">Last name</Label>
              <Input
                id="enrollment-client-last-name"
                value={clientIdentity.last_name}
                onChange={(event) => setClientIdentity((current) => ({ ...current, last_name: event.target.value }))}
                placeholder="Client last name"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="enrollment-client-email">Client email *</Label>
              <Input
                id="enrollment-client-email"
                type="email"
                required
                value={clientIdentity.email}
                onChange={(event) => setClientIdentity((current) => ({ ...current, email: event.target.value }))}
                placeholder="client@example.com"
              />
            </div>
          </CardContent>
        </Card>

        {plans.length === 0 ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-sm text-amber-900">
              No active client plans are available. Ask the super admin to publish a client plan.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => {
              const selected = plan.id === selectedPlanId;
              return (
                <button key={plan.id} type="button" className="text-left" onClick={() => setSelectedPlanId(plan.id)}>
                  <Card className={`h-full border-2 transition ${selected ? "border-emerald-500 bg-emerald-50/40 shadow-md" : "border-slate-200 hover:border-slate-300"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription className="mt-1">{plan.description || "Client enrollment plan"}</CardDescription>
                        </div>
                        {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
                      </div>
                      <p className="pt-2 text-2xl font-bold text-slate-900">
                        {formatPrice(plan.price)}
                        <span className="text-sm font-normal text-slate-500">/{plan.billing_cycle === "yearly" ? "year" : "month"}</span>
                      </p>
                    </CardHeader>
                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <CardContent className="space-y-1.5 pt-0 text-sm text-slate-600">
                        {plan.features.slice(0, 4).map((feature) => (
                          <div key={feature} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Copy className="h-4 w-4" /> Client Pays</CardTitle>
              <CardDescription>Copy a secure Stripe Checkout link and send it to the client.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" disabled={!selectedPlan || workingAction !== null} onClick={handleCopyLink}>
                {workingAction === "copy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : linkCopied ? <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />}
                {linkCopied ? "Link Copied" : "Copy Client Payment Link"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Admin Pays</CardTitle>
              <CardDescription>Pay the fee now on behalf of this client, then complete their intake.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!selectedPlan || workingAction !== null} onClick={handleAdminPay}>
                {workingAction === "pay" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Pay Now for Client <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-slate-500">
          Payment is collected by the platform's Stripe account. Each paid enrollment is tied to this client and can only be completed once.
        </p>
      </DialogContent>
    </Dialog>
  );
}
