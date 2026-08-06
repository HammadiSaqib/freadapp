const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'client/components/AdminCalendar.tsx');
const destPath = path.join(__dirname, 'client/components/BasicAdminCalendar.tsx');
let code = fs.readFileSync(srcPath, 'utf8');

// Replace component name
code = code.replace(/AdminCalendar/g, 'BasicAdminCalendar');

// Strip Elite UI
code = code.replace(/bg-gradient-to-[a-z]{1,2}\s+/g, '');
code = code.replace(/from-[a-z]+-\d{2,3}\s+/g, '');
code = code.replace(/via-[a-z]+-\d{2,3}\s+/g, '');
code = code.replace(/to-[a-z]+-\d{2,3}\s*/g, '');
code = code.replace(/shadow-(sm|md|lg|xl|2xl|inner|none)\s*/g, '');
code = code.replace(/shadow\s+/g, '');
code = code.replace(/rounded-3xl/g, 'rounded-sm');
code = code.replace(/rounded-2xl/g, 'rounded-sm');
code = code.replace(/rounded-xl/g, 'rounded-sm');
code = code.replace(/rounded-lg/g, 'rounded-sm');
code = code.replace(/rounded-full/g, 'rounded-sm');
code = code.replace(/border-0/g, '');
code = code.replace(/ring-1/g, '');
code = code.replace(/ring-slate-200/g, '');
code = code.replace(/text-transparent bg-clip-text/g, '');

fs.writeFileSync(destPath, code);
console.log('Created BasicAdminCalendar.tsx');
