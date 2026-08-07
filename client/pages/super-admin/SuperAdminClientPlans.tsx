import SuperAdminLayout from "@/components/SuperAdminLayout";
import PlanManagement from "@/components/super-admin/PlanManagement";

export default function SuperAdminClientPlans() {
  return (
    <SuperAdminLayout
      title="Client Plans"
      description="Manage paid client enrollment plans used during onboarding and admin-added client invites"
    >
      <PlanManagement
        planCategoryFilter="client"
        lockPlanCategory
        title="Client Plans"
        description="These plans are only used for client onboarding and client payment links."
      />
    </SuperAdminLayout>
  );
}
