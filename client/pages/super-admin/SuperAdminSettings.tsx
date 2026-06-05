import SuperAdminLayout from "@/components/SuperAdminLayout";
import SuperAdminSettingsManagement from "@/components/super-admin/SuperAdminSettingsManagement";

export default function SuperAdminSettings() {
  return (
    <SuperAdminLayout 
      title="Settings" 
      description="Manage your profile information and system configuration"
    >
      <SuperAdminSettingsManagement />
    </SuperAdminLayout>
  );
}