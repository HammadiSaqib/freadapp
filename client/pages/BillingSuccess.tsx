import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { billingApi } from "@/lib/api";
import { CheckCircle, Crown, CreditCard, Calendar, ArrowRight, Loader2, Users, Sparkles } from "lucide-react";

const BillingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sessionId = useMemo(() => new URLSearchParams(location.search).get("session_id"), [location.search]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        if (sessionId) {
          try {
            await billingApi.finalizeCheckoutSession(sessionId);
          } catch {}
        }
        const res = await billingApi.getSubscription();
        if (!mounted) return;
        if (res?.data?.success) {
          setSubscription(res.data.subscription || null);
          setError(null);
        } else {
          setError("Could not verify subscription yet. Please refresh.");
        }
      } catch (err) {
        setError("Unable to fetch subscription status.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Webhook usually completes instantly, but allow a short delay if needed
    fetchSubscription();
    const retry = setTimeout(fetchSubscription, 2500);
    return () => {
      mounted = false;
      clearTimeout(retry);
    };
  }, [location.search]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-800/90">
          <CardHeader>
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Subscription Activated</CardTitle>
                  <CardDescription>Welcome to the admin dashboard</CardDescription>
                </div>
              </div>
              {subscription?.status && (
                <Badge variant="outline" className="border-green-500/30 text-green-700 dark:text-green-400">
                  {subscription.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {sessionId && (
              <div className="text-xs text-muted-foreground">Session: {sessionId}</div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finalizing your subscription…
              </div>
            )}

            {!loading && error && (
              <Alert>{error}</Alert>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <CardTitle className="text-base">Plan</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">{subscription?.plan_name || "—"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-base">Status</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">{subscription?.status || "—"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-emerald-600" />
                      <CardTitle className="text-base">Period End</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">
                      {subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => navigate("/dashboard")}> 
                Go to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/subscription")}>Manage Subscription</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-slate-800 dark:to-slate-800">
          <CardHeader>
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Welcome to the Score Machine Family</CardTitle>
                  <CardDescription>Everything you need to get started</CardDescription>
                </div>
              </div>
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Explore Dashboard</CardTitle>
                  <CardDescription>Overview of your operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add Clients</CardTitle>
                  <CardDescription>Start managing client profiles</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" onClick={() => navigate("/clients")}>Open Clients</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manage Subscription</CardTitle>
                  <CardDescription>Update plan and billing</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" variant="outline" onClick={() => navigate("/subscription")}>Subscription</Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BillingSuccess;