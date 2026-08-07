import SuperAdminLayout from "@/components/SuperAdminLayout";
import PlanManagement from "@/components/super-admin/PlanManagement";

export default function SuperAdminPlans() {
  return (
    <SuperAdminLayout 
      title="Admin Plans" 
      description="Manage CRM subscription plans, pricing, and features for admins"
    >
      <PlanManagement
        planCategoryFilter="admin"
        lockPlanCategory
        title="Admin Plans"
        description="These plans are used for admin CRM subscriptions only."
      />
    </SuperAdminLayout>
  );
}
