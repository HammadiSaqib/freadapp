import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { billingApi } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CheckCircle2, Loader2, ArrowRight, CreditCard } from "lucide-react";

const ClientEnrollmentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sessionId = params.get("session_id");
  const cancelled = params.get("cancelled") === "1";
  const [loading, setLoading] = useState(Boolean(sessionId) && !cancelled);
  const [error, setError] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<any | null>(null);

  useEffect(() => {
    if (!sessionId || cancelled) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const finalize = async () => {
      try {
        setLoading(true);
        const response = await billingApi.finalizeClientEnrollmentSession(sessionId);
        if (!mounted) return;
        setEnrollment(response?.data?.enrollment || null);
        setError(null);
      } catch (finalizeError: any) {
        if (!mounted) return;
        setError(
          finalizeError?.response?.data?.details ||
          finalizeError?.response?.data?.error ||
          "Payment was received, but enrollment could not be finalized automatically yet."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    finalize();
    return () => {
      mounted = false;
    };
  }, [sessionId, cancelled]);

  const handleContinue = () => {
    const returnUrl = enrollment?.returnUrl;
    const redirectUrl = enrollment?.redirectUrl;

    if (returnUrl) {
      window.location.assign(returnUrl);
      return;
    }

    if (redirectUrl) {
      window.location.assign(redirectUrl);
      return;
    }

    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
            {cancelled ? (
              <CreditCard className="h-8 w-8 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            )}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">
              {cancelled ? "Checkout Canceled" : "Enrollment Payment Received"}
            </CardTitle>
            <CardDescription>
              {cancelled
                ? "No charge was completed. You can go back and try again whenever you're ready."
                : "We're finalizing the client enrollment now."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finalizing client enrollment…
            </div>
          )}

          {!loading && error && !cancelled && (
            <Alert>{error}</Alert>
          )}

          {!loading && !error && !cancelled && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
              <p className="text-sm text-slate-700">
                {enrollment?.client?.first_name || enrollment?.companyName
                  ? `The enrollment has been completed successfully${enrollment?.client?.first_name ? ` for ${enrollment.client.first_name} ${enrollment.client.last_name || ""}` : ""}.`
                  : "The enrollment has been completed successfully."}
              </p>
              {enrollment?.clientId && (
                <p className="text-xs text-slate-500">Client ID: {enrollment.clientId}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={handleContinue} className="w-full">
              {cancelled ? "Return" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {sessionId && <div className="text-center text-xs text-slate-400">Session: {sessionId}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientEnrollmentSuccess;
