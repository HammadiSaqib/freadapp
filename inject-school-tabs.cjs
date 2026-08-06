const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/pages/School.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Move `isBasicAdminPortalUser` to the top of the component
const isBasicLine = `  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);`;
code = code.replace(isBasicLine, '');
// Insert it after `const { isEliteActive } = useScoreMachineEliteStatus();`
code = code.replace(
  `const { isEliteActive } = useScoreMachineEliteStatus();`,
  `const { isEliteActive } = useScoreMachineEliteStatus();\n  const isBasicAdminPortalUser = userProfile?.role === "admin" && hasAdminBasicPortalAccess(userProfile);`
);

// 2. Add imports for the new Basic components
const imports = `
import BasicMapsTab from "@/components/BasicMapsTab";
import BasicAboutTab from "@/components/BasicAboutTab";
import BasicDirectoryTab from "@/components/BasicDirectoryTab";
import BasicCommunityTab from "@/components/BasicCommunityTab";
import BasicAdminCalendar from "@/components/BasicAdminCalendar";
`;
code = code.replace(`import BasicSchool from "@/components/BasicSchool";`, `import BasicSchool from "@/components/BasicSchool";\n${imports}`);

// 3. Inject the conditional rendering for the tabs
code = code.replace(
  `const communityTabContent = (`,
  `const communityTabContent = isBasicAdminPortalUser && !isEliteActive ? <BasicCommunityTab currentUser={currentUser} userLoading={userLoading} /> : (`
);

code = code.replace(
  `const calendarTabContent = (`,
  `const calendarTabContent = isBasicAdminPortalUser && !isEliteActive ? <BasicAdminCalendar /> : (`
);

code = code.replace(
  `const mapsTabContent = (`,
  `const mapsTabContent = isBasicAdminPortalUser && !isEliteActive ? <BasicMapsTab learningPaths={learningPaths} courseMaps={courseMaps} setIsCreatePathOpen={setIsCreatePathOpen} /> : (`
);

code = code.replace(
  `const aboutTabContent = (`,
  `const aboutTabContent = isBasicAdminPortalUser && !isEliteActive ? <BasicAboutTab academyStats={academyStats} /> : (`
);

code = code.replace(
  `const businessDirectoryTabContent = (`,
  `const businessDirectoryTabContent = isBasicAdminPortalUser && !isEliteActive ? <BasicDirectoryTab businessDirectories={businessDirectories} businessDirectoriesLoading={businessDirectoriesLoading} businessDirectoriesError={businessDirectoriesError} /> : (`
);

fs.writeFileSync(filePath, code);
console.log('Successfully injected Basic Tab routing into School.tsx');
