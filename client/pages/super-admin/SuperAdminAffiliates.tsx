import SuperAdminLayout from "@/components/SuperAdminLayout";
import AffiliateManagement from "@/components/super-admin/AffiliateManagement";

export default function SuperAdminAffiliates() {
  return (
    <SuperAdminLayout 
      title="Affiliate Management" 
      description="Manage affiliate partners, commissions, and performance tracking"
    >
      <AffiliateManagement />
    </SuperAdminLayout>
  );
}