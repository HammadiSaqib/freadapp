import SuperAdminLayout from "@/components/SuperAdminLayout";
import { LetterContentManager } from "@/components/super-admin/LetterContentManager";

export default function SuperAdminLetterTemplates() {
  return (
    <SuperAdminLayout
      title="Letter Templates"
      description="Manage dispute letter content blocks, categories, and templates"
    >
      <div className="space-y-8">
        <LetterContentManager />
      </div>
    </SuperAdminLayout>
  );
}
