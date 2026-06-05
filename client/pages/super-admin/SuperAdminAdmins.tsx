import SuperAdminLayout from "@/components/SuperAdminLayout";
import AdminProfileManagement from "@/components/super-admin/AdminProfileManagement";

export default function SuperAdminAdmins() {
  return (
    <SuperAdminLayout 
      title="Admin Management" 
      description="Manage admin profiles, permissions, and access levels"
    >
      <AdminProfileManagement />
    </SuperAdminLayout>
  );
}