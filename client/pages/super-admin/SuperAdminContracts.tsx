import SuperAdminLayout from "@/components/SuperAdminLayout";
import ContractsManagement from "@/components/super-admin/ContractsManagement";

export default function SuperAdminContracts() {
  return (
    <SuperAdminLayout 
      title="Contracts" 
      description="Edit and manage admin contract templates"
    >
      <ContractsManagement />
    </SuperAdminLayout>
  );
}