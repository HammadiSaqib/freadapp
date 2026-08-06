const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'client/components/community/CommunityFeed.tsx');
const destPath = path.join(__dirname, 'client/components/BasicCommunityFeed.tsx');
let code = fs.readFileSync(srcPath, 'utf8');

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
code = code.replace(/border-0/g, 'border border-slate-300');
code = code.replace(/gradient-text-primary/g, 'text-slate-900');
code = code.replace(/gradient-text-secondary/g, 'text-slate-800');
code = code.replace(/text-transparent/g, 'text-slate-900');
code = code.replace(/bg-clip-text/g, '');
code = code.replace(/dark:bg-slate-800\/90/g, '');
code = code.replace(/dark:bg-slate-[0-9]{3}/g, '');
code = code.replace(/dark:from-[a-z0-9-]+/g, '');
code = code.replace(/dark:to-[a-z0-9-]+/g, '');
code = code.replace(/bg-white\/90/g, 'bg-white');
code = code.replace(/backdrop-blur-sm/g, '');

code = code.replace(/export function CommunityFeed/g, 'export default function BasicCommunityFeed');

fs.writeFileSync(destPath, code);
console.log('Created BasicCommunityFeed.tsx');
