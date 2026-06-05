import SuperAdminLayout from "@/components/SuperAdminLayout";
import UserManagement from "@/components/super-admin/UserManagement";

export default function SuperAdminUsers() {
  return (
    <SuperAdminLayout 
      title="User Management" 
      description="Manage user accounts, subscriptions, and activity"
    >
      <UserManagement />
    </SuperAdminLayout>
  );
}