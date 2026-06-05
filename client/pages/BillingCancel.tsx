import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const BillingCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <Card className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Checkout Canceled</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Your Stripe Checkout session was canceled. No changes were made to your subscription.
        </p>

        <div className="flex gap-2">
          <Button onClick={() => navigate("/subscription")}>Back to Subscription</Button>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </Card>
    </div>
  );
};

export default BillingCancel;