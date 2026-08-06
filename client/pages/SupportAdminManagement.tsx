import SupportLayout from "@/components/SupportLayout";
import AdminProfileManagement from "@/components/super-admin/AdminProfileManagement";

export default function SupportAdminManagement() {
  return (
    <SupportLayout fullWidth noContentPadding>
      <div className="px-4 py-3 lg:px-5">
        <AdminProfileManagement readOnly chooseFiltersOnly compact />
      </div>
    </SupportLayout>
  );
}
