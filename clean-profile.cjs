const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/components/BasicClientProfile.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace classes to make it basic
code = code.replace(/bg-gradient-to-[a-z]+\s+from-[a-z]+-\d+\s+via-[a-z]+-\d+\s+to-[a-z]+-\d+/g, 'bg-white border-b border-slate-200');
code = code.replace(/bg-gradient-to-[a-z]+\s+from-[a-z]+-\d+\s+to-[a-z]+-\d+/g, 'bg-white border-b border-slate-200');
code = code.replace(/bg-gradient-[a-z]+/g, 'bg-slate-100 text-slate-800');
code = code.replace(/text-transparent bg-clip-text/g, 'text-slate-900');
code = code.replace(/shadow-lg|shadow-xl|shadow-md|shadow-sm|shadow-2xl/g, '');
code = code.replace(/rounded-2xl/g, 'rounded-none border border-slate-300');
code = code.replace(/rounded-xl/g, 'rounded-sm border border-slate-300');
code = code.replace(/ring-\d+|ring-[a-z]+-\d+/g, '');
code = code.replace(/border-blue-\d+/g, 'border-slate-300');
code = code.replace(/border-emerald-\d+/g, 'border-slate-300');
code = code.replace(/border-indigo-\d+/g, 'border-slate-300');
code = code.replace(/border-amber-\d+/g, 'border-slate-300');
code = code.replace(/border-purple-\d+/g, 'border-slate-300');

// specifically for the tabs
code = code.replace(/data-\[state=active\]:bg-gradient-to-r/g, 'data-[state=active]:bg-black data-[state=active]:text-white');
code = code.replace(/data-\[state=active\]:text-white/g, 'data-[state=active]:bg-black data-[state=active]:text-white');
code = code.replace(/data-\[state=active\]:shadow-md/g, '');
code = code.replace(/data-\[state=active\]:border-transparent/g, 'data-[state=active]:border-black');
code = code.replace(/bg-blue-50\/50/g, 'bg-white');
code = code.replace(/bg-slate-50\/50/g, 'bg-white');

fs.writeFileSync(filePath, code);
console.log('Done cleaning BasicClientProfile UI');
