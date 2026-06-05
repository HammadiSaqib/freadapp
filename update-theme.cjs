const fs = require('fs');

const files = [
  'client/components/EliteDashboard.tsx',
  'client/components/EliteSchool.tsx',
  'client/pages/EliteFundingDIY.tsx',
  'client/components/DashboardLayout.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(/bg-\\[#fafcff\\]/g, 'bg-[#fafcff] dark:bg-slate-950');
  code = code.replace(/bg-white\/60/g, 'bg-white/60 dark:bg-slate-900/60');
  code = code.replace(/bg-white/g, 'bg-white dark:bg-slate-900');
  code = code.replace(/text-slate-800/g, 'text-slate-800 dark:text-slate-100');
  code = code.replace(/text-slate-900/g, 'text-slate-900 dark:text-white');
  code = code.replace(/text-slate-500/g, 'text-slate-500 dark:text-slate-400');
  code = code.replace(/text-slate-400/g, 'text-slate-400 dark:text-slate-500');
  code = code.replace(/text-slate-700/g, 'text-slate-700 dark:text-slate-300');
  code = code.replace(/text-slate-600/g, 'text-slate-600 dark:text-slate-400');
  code = code.replace(/bg-slate-50\/80/g, 'bg-slate-50/80 dark:bg-slate-800/80');
  code = code.replace(/bg-slate-50\/50/g, 'bg-slate-50/50 dark:bg-slate-800/50');
  code = code.replace(/bg-slate-50/g, 'bg-slate-50 dark:bg-slate-800/50');
  code = code.replace(/bg-slate-100/g, 'bg-slate-100 dark:bg-slate-800');
  code = code.replace(/border-white/g, 'border-white dark:border-slate-800');
  code = code.replace(/border-slate-100/g, 'border-slate-100 dark:border-slate-800');
  code = code.replace(/border-slate-200/g, 'border-slate-200 dark:border-slate-700');
  code = code.replace(/border-slate-300/g, 'border-slate-300 dark:border-slate-600');
  code = code.replace(/bg-blue-50/g, 'bg-blue-50 dark:bg-blue-900/50');
  code = code.replace(/bg-purple-50/g, 'bg-purple-50 dark:bg-purple-900/50');
  code = code.replace(/bg-rose-50/g, 'bg-rose-50 dark:bg-rose-900/50');
  code = code.replace(/bg-amber-50/g, 'bg-amber-50 dark:bg-amber-900/50');
  code = code.replace(/bg-emerald-50/g, 'bg-emerald-50 dark:bg-emerald-900/50');
  code = code.replace(/bg-cyan-50/g, 'bg-cyan-50 dark:bg-cyan-900/50');

  fs.writeFileSync(file, code);
  console.log('Updated ' + file);
}
