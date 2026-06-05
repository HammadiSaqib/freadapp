import SuperAdminLayout from "@/components/SuperAdminLayout";
import PlanManagement from "@/components/super-admin/PlanManagement";

export default function SuperAdminPlans() {
  return (
    <SuperAdminLayout 
      title="Subscription Plans" 
      description="Manage subscription plans, pricing, and features"
    >
      <PlanManagement />
    </SuperAdminLayout>
  );
}