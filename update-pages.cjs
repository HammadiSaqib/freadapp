const fs = require('fs');
const path = require('path');

const dir = 'c:\\Users\\Munib Ahmed\\Downloads\\Softwears\\ScoreMachineV2RawCode-main\\client\\pages';

// 1. Update School.tsx
const schoolPath = path.join(dir, 'School.tsx');
let school = fs.readFileSync(schoolPath, 'utf8');

if (!school.includes('import BasicSchool')) {
  school = school.replace('import EliteSchool from "@/components/EliteSchool";', 'import EliteSchool from "@/components/EliteSchool";\nimport BasicSchool from "@/components/BasicSchool";');
}
if (!school.includes('if (isBasicAdminPortalUser && !isEliteActive) {')) {
  school = school.replace(
    '  if (isEliteActive) {',
    `  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <DashboardLayout
        onAddClient={() => setIsCreateCourseOpen(true)}
      >
        <BasicSchool
          courses={courses}
          coursesLoading={loading}
          enrolledCourses={enrolledCourses}
          userStats={userStats}
          leaderboard={leaderboard}
          leaderboardLoading={loading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          navigate={safeNavigate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          communityTab={communityTabContent}
          calendarTab={calendarTabContent}
          mapsTab={mapsTabContent}
          businessDirectoryTab={<BusinessDirectoryTab />}
          aboutTab={aboutTabContent}
        />
      </DashboardLayout>
    );
  }

  if (isEliteActive) {`
  );
  fs.writeFileSync(schoolPath, school);
}

// 2. Update Subscription.tsx
const subPath = path.join(dir, 'Subscription.tsx');
let sub = fs.readFileSync(subPath, 'utf8');
if (!sub.includes('import BasicSubscription')) {
  sub = `import BasicSubscription from "@/components/BasicSubscription";\nimport { hasAdminBasicPortalAccess } from "@/lib/adminPortalAccess";\n` + sub;
}
if (!sub.includes('if (isBasicAdminPortalUser && !isEliteActive) {')) {
  sub = sub.replace(
    '  return (\n    <DashboardLayout>',
    `  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <DashboardLayout>
        <BasicSubscription
          subscription={subscription}
          availablePlans={availablePlans}
          billingFilter={billingFilter}
          setBillingFilter={setBillingFilter}
          recurringConsent={recurringConsent}
          setRecurringConsent={setRecurringConsent}
          upgrading={upgrading}
          handleSelectPlan={handleSelectPlan}
          handleOpenCancelDialog={handleOpenCancelDialog}
          navigate={navigate}
          getStatusBadge={getStatusBadge}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>`
  );
  fs.writeFileSync(subPath, sub);
}

// 3. Update Support.tsx
const supportPath = path.join(dir, 'Support.tsx');
let support = fs.readFileSync(supportPath, 'utf8');
if (!support.includes('import BasicSupport')) {
  support = support.replace('import EliteSupport from "@/components/EliteSupport";', 'import EliteSupport from "@/components/EliteSupport";\nimport BasicSupport from "@/components/BasicSupport";');
}
if (!support.includes('if (isBasicAdminPortalUser && !isEliteActive) {')) {
  support = support.replace(
    '  if (isEliteActive) {',
    `  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <DashboardLayout
        onAddClient={() => setShowAddClient(true)}
      >
        <BasicSupport
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          overviewTab={overviewTabContent}
          ticketsTab={ticketsTabContent}
          faqTab={faqTabContent}
          contactTab={contactTabContent}
          livechatTab={livechatTabContent}
          setShowAddClient={setShowAddClient}
        />
      </DashboardLayout>
    );
  }

  if (isEliteActive) {`
  );
  fs.writeFileSync(supportPath, support);
}

// 4. Update Settings.tsx
const settingsPath = path.join(dir, 'Settings.tsx');
let settings = fs.readFileSync(settingsPath, 'utf8');
if (!settings.includes('import BasicSettings')) {
  settings = `import BasicSettings from "@/components/BasicSettings";\nimport { hasAdminBasicPortalAccess } from "@/lib/adminPortalAccess";\n` + settings;
}
if (!settings.includes('if (isBasicAdminPortalUser && !isEliteActive) {')) {
  settings = settings.replace(
    '  if (isEliteActive) {',
    `  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <DashboardLayout>
        <BasicSettings activeTab={activeTab} setActiveTab={setActiveTab}>
          {settingsContent}
        </BasicSettings>
      </DashboardLayout>
    );
  }

  if (isEliteActive) {`
  );
  fs.writeFileSync(settingsPath, settings);
}

// 5. Update Invoices.tsx
const invoicesPath = path.join(dir, 'Invoices.tsx');
let invoices = fs.readFileSync(invoicesPath, 'utf8');
if (!invoices.includes('import BasicInvoices')) {
  invoices = `import BasicInvoices from "@/components/BasicInvoices";\nimport { hasAdminBasicPortalAccess } from "@/lib/adminPortalAccess";\n` + invoices;
}
if (!invoices.includes('if (isBasicAdminPortalUser && !isEliteActive) {')) {
  invoices = invoices.replace(
    '  if (isEliteActive) {',
    `  const { userProfile } = useAuthContext();
  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);

  if (isBasicAdminPortalUser && !isEliteActive) {
    return (
      <DashboardLayout>
        <BasicInvoices>
          {invoiceContent}
        </BasicInvoices>
      </DashboardLayout>
    );
  }

  if (isEliteActive) {`
  );
  fs.writeFileSync(invoicesPath, invoices);
}

console.log("Done");
