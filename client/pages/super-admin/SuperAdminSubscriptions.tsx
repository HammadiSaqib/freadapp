import SuperAdminLayout from "@/components/SuperAdminLayout";
import SubscriptionManagement from "@/components/super-admin/SubscriptionManagement";

export default function SuperAdminSubscriptions() {
  return (
    <SuperAdminLayout 
      title="Subscription Management" 
      description="Monitor and manage user subscriptions, billing, and renewals"
    >
      <SubscriptionManagement />
    </SuperAdminLayout>
  );
}