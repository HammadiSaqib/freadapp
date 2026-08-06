const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/pages/ClientProfile.tsx');
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('import BasicClientProfile')) {
  code = code.replace('import ClientProfileStandard from "@/pages/ClientProfileStandard";', 'import ClientProfileStandard from "@/pages/ClientProfileStandard";\nimport BasicClientProfile from "@/components/BasicClientProfile";');
}

const targetFunc = `export default function ClientProfile() {
  const { userProfile, isLoading: authLoading } = useAuthContext();
  const isSuperAdminUser = userProfile?.role === "super_admin";
  const { isEliteActive, isEliteStatusLoading } = useScoreMachineEliteStatus();
  const shouldResolveEliteVariant = ['admin', 'employee', 'user', 'funding_manager'].includes(String(userProfile?.role || ''));

  const isClientProfileVariantLoading =
    authLoading || (shouldResolveEliteVariant && isEliteStatusLoading);

  if (isClientProfileVariantLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const showEnhancedClientProfile = isSuperAdminUser || isEliteActive || hasAdminBasicPortalAccess(userProfile);

  return showEnhancedClientProfile ? <EnhancedClientProfile /> : <ClientProfileStandard />;
}`;

const newFunc = `export default function ClientProfile() {
  const { userProfile, isLoading: authLoading } = useAuthContext();
  const isSuperAdminUser = userProfile?.role === "super_admin";
  const { isEliteActive, isEliteStatusLoading } = useScoreMachineEliteStatus();
  const shouldResolveEliteVariant = ['admin', 'employee', 'user', 'funding_manager'].includes(String(userProfile?.role || ''));

  const isClientProfileVariantLoading =
    authLoading || (shouldResolveEliteVariant && isEliteStatusLoading);

  if (isClientProfileVariantLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return <BasicClientProfile />;
  }

  const showEnhancedClientProfile = isSuperAdminUser || isEliteActive || hasAdminBasicPortalAccess(userProfile);

  return showEnhancedClientProfile ? <EnhancedClientProfile /> : <ClientProfileStandard />;
}`;

code = code.replace(targetFunc, newFunc);

fs.writeFileSync(filePath, code);
console.log('Done modifying ClientProfile routing');
