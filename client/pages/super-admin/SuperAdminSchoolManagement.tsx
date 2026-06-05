import SuperAdminLayout from "@/components/SuperAdminLayout";
import SchoolManagement from "@/components/super-admin/SchoolManagement";

export default function SuperAdminSchoolManagement() {
  return (
    <SuperAdminLayout 
      title="School Management" 
      description="Manage courses, videos, quizzes, and educational content"
    >
      <SchoolManagement />
    </SuperAdminLayout>
  );
}