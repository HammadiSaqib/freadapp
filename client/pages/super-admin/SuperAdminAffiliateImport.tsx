import SuperAdminLayout from "@/components/SuperAdminLayout";
import AffiliateCSVImport from "@/components/super-admin/AffiliateCSVImport";

export default function SuperAdminAffiliateImport() {
  return (
    <SuperAdminLayout 
      title="Import Affiliate Referrals & Commissions" 
      description="Upload CSV to populate affiliate_referrals and affiliate_commissions"
    >
      <AffiliateCSVImport />
    </SuperAdminLayout>
  );
}