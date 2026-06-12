import SuperAdminLayout from "@/components/SuperAdminLayout";
import BusinessDirectoryManagement from "@/components/super-admin/BusinessDirectoryManagement";

export default function SuperAdminBusinessDirectory() {
  return (
    <SuperAdminLayout
      title="Business Directory"
      description="Create and manage the directory entries shown in The Capsol Academy"
    >
      <BusinessDirectoryManagement />
    </SuperAdminLayout>
  );
}