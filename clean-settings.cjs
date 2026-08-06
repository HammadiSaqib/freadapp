const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/components/BasicSettings.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Return settingsContent directly at the end of BasicSettings
const routingBlock = `  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <DashboardLayout>
        <BasicSettings activeTab={activeTab} setActiveTab={setActiveTab}>
          {settingsContent}
        </BasicSettings>
      </DashboardLayout>
    );
  }

  if (isEliteActive) {
    return (
      <DashboardLayout
        title="Settings"
        description="Manage your account, preferences, and system configuration"
      >
        <EliteSettings activeTab={activeTab} setActiveTab={setActiveTab}>
          {settingsContent}
        </EliteSettings>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Settings"
      description="Manage your account, preferences, and system configuration"
    >
      {settingsContent}
    </DashboardLayout>
  );
}`;

code = code.replace(routingBlock, '  return settingsContent;\n}');

// 2. Remove Elite UI classes across the entire file
// Background gradients
code = code.replace(/bg-gradient-to-[a-z]{1,2}\s+/g, '');
code = code.replace(/from-[a-z]+-\d{2,3}\s+/g, '');
code = code.replace(/via-[a-z]+-\d{2,3}\s+/g, '');
code = code.replace(/to-[a-z]+-\d{2,3}\s*/g, '');
code = code.replace(/bg-gradient-soft/g, 'bg-slate-50 text-slate-800');
code = code.replace(/gradient-primary/g, 'bg-slate-800 text-white');
code = code.replace(/gradient-light/g, 'bg-white');

// Text gradients
code = code.replace(/text-transparent/g, 'text-slate-900');
code = code.replace(/bg-clip-text/g, '');
code = code.replace(/gradient-text-primary/g, 'text-slate-900');

// Shadows
code = code.replace(/shadow-(sm|md|lg|xl|2xl|inner|none)\s*/g, '');
code = code.replace(/shadow\s+/g, '');

// Rounded corners
code = code.replace(/rounded-3xl/g, 'rounded-sm');
code = code.replace(/rounded-2xl/g, 'rounded-sm');
code = code.replace(/rounded-xl/g, 'rounded-sm');
code = code.replace(/rounded-lg/g, 'rounded-sm');
code = code.replace(/rounded-md/g, 'rounded-sm');

// Colors
code = code.replace(/bg-blue-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-indigo-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-purple-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-emerald-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-teal-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-amber-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-ocean-blue\/10/g, 'bg-slate-100');
code = code.replace(/bg-ocean-blue\/5/g, 'bg-slate-50');
code = code.replace(/text-ocean-blue/g, 'text-slate-800');
code = code.replace(/border-ocean-blue\/30/g, 'border-slate-300');
code = code.replace(/border-ocean-blue/g, 'border-slate-300');

// Focus rings
code = code.replace(/focus:ring-\d/g, '');
code = code.replace(/focus:ring-[a-z]+-\d{2,3}/g, '');
code = code.replace(/focus-within:ring-\d/g, '');
code = code.replace(/focus-within:ring-[a-z]+-\d{2,3}/g, '');
code = code.replace(/ring-[a-z]+-\d{2,3}/g, '');

// Tabs Active state
code = code.replace(/data-\[state=active\]:bg-gradient-to-r/g, 'data-[state=active]:bg-slate-900 data-[state=active]:text-white');
code = code.replace(/data-\[state=active\]:text-white/g, 'data-[state=active]:bg-slate-900 data-[state=active]:text-white');
code = code.replace(/data-\[state=active\]:shadow-md/g, '');
code = code.replace(/data-\[state=active\]:border-transparent/g, 'data-[state=active]:border-slate-900');

// Cards & dark mode
code = code.replace(/<Card className="border-0 bg-white\/90 dark:bg-slate-800\/90 backdrop-blur-sm">/g, '<Card className="border border-slate-300 rounded-sm bg-white">');
code = code.replace(/bg-white\/90 dark:bg-slate-800\/90 backdrop-blur-sm/g, 'bg-white border-b border-slate-200');
code = code.replace(/dark:[a-z-]+-[a-z0-9\/]+/g, '');

fs.writeFileSync(filePath, code);
console.log('Successfully created BasicSettings component');
