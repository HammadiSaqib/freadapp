import { useEffect, useState } from "react";
import ClientLayout from "@/components/ClientLayout";
import BillingHistory from "@/components/BillingHistory";
import { billingApi, api } from "@/lib/api";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CreditCard, Calendar, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

interface SubscriptionRecord {
  id: number;
  plan_name: string;
  plan_type: string;
  status: "active" | "canceled" | "past_due" | "unpaid";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export default function ClientSubscription() {
  const { toast } = useToast();
  const subscriptionStatus = useSubscriptionStatus();
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const fetchSubscription = async () => {
    try {
      const response = await billingApi.getSubscription();
      if (response.data?.success) {
        setSubscription(response.data.subscription || null);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error fetching client subscription:", error);
      setSubscription(null);
      toast({
        title: "Error",
        description: "Unable to load subscription details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscription();
    subscriptionStatus.refetch?.();
  };

  const handleOpenBillingPortal = async () => {
    try {
      setPortalLoading(true);
      const response = await api.post("/api/billing/billing-portal");
      const url = response.data?.url;
      if (url) {
        window.location.href = url;
        return;
      }

      toast({
        title: "Error",
        description: "Unable to open billing portal.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error opening billing portal:", error);
      toast({
        title: "Error",
        description: "Unable to open billing portal.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      const response = await billingApi.cancelSubscription({
        reasonCode: "other",
        reasonText: cancellationReason.trim() || undefined,
      });

      if (response.data?.success) {
        toast({
          title: "Cancellation scheduled",
          description: "Your subscription will end at the close of the current billing period.",
        });
        setCancelDialogOpen(false);
        setCancellationReason("");
        await fetchSubscription();
        subscriptionStatus.refetch?.();
        return;
      }

      toast({
        title: "Error",
        description: response.data?.error || "Unable to cancel subscription.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Error cancelling client subscription:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Unable to cancel subscription.",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getStatusBadgeClassName = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "past_due":
      case "unpaid":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "canceled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <ClientLayout
      title="Subscription"
      description="Review your active plan, update billing, and cancel your subscription if needed"
    >
      <div className="space-y-6">
        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading subscription details...
            </CardContent>
          </Card>
        ) : subscription ? (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-emerald-50/40 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 p-3 text-white shadow-lg">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Current Subscription</CardTitle>
                      <CardDescription>
                        Manage your member plan and billing access
                      </CardDescription>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusBadgeClassName(subscription.status)}>
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border bg-white/90 p-4">
                  <div className="text-sm text-slate-500">Plan</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{subscription.plan_name}</div>
                  <div className="mt-1 text-sm capitalize text-slate-600">{subscription.plan_type} billing</div>
                </div>
                <div className="rounded-xl border bg-white/90 p-4">
                  <div className="text-sm text-slate-500">Started</div>
                  <div className="mt-1 flex items-center gap-2 text-slate-900">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{formatDate(subscription.current_period_start)}</span>
                  </div>
                </div>
                <div className="rounded-xl border bg-white/90 p-4">
                  <div className="text-sm text-slate-500">Next billing / end date</div>
                  <div className="mt-1 flex items-center gap-2 text-slate-900">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{formatDate(subscription.current_period_end)}</span>
                  </div>
                </div>
              </div>

              {subscription.cancel_at_period_end ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <div>
                      Your subscription is already scheduled to cancel at the end of the current billing period on{" "}
                      <span className="font-semibold">{formatDate(subscription.current_period_end)}</span>.
                    </div>
                  </div>
                </div>
              ) : subscription.status === "active" ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    <div>
                      Your subscription is active. You can update your payment method or schedule cancellation below.
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 border-t pt-4">
                <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                  {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleOpenBillingPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                  Update Payment Method
                </Button>
                {subscription.status === "active" && !subscription.cancel_at_period_end ? (
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    Cancel Subscription
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-600">
              No active subscription was found for this member account.
            </CardContent>
          </Card>
        )}

        <BillingHistory
          showCurrentSubscription={false}
          onManageCancellation={() => setCancelDialogOpen(true)}
        />
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription</DialogTitle>
            <DialogDescription>
              Your subscription will remain active until the current billing period ends.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancellation_reason">Reason (optional)</Label>
            <Textarea
              id="cancellation_reason"
              placeholder="Tell us why you’re cancelling..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelLoading}>
              Keep Subscription
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleCancelSubscription}
              disabled={cancelLoading}
            >
              {cancelLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
