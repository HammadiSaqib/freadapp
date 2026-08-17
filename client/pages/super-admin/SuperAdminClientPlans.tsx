import SuperAdminLayout from "@/components/SuperAdminLayout";
import PlanManagement from "@/components/super-admin/PlanManagement";

export default function SuperAdminClientPlans() {
  return (
    <SuperAdminLayout
      title="Client Plans"
      description="Manage client enrollment plans and control which plans are available for new purchases"
    >
      <PlanManagement
        planCategoryFilter="client"
        lockPlanCategory
        title="Client Plans"
        description="These plans are only used for client onboarding and client payment links. Hidden plans remain assigned to clients who already purchased them."
      />
    </SuperAdminLayout>
  );
}
