const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/components/BasicClientProfile.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Replace custom gradient classes
code = code.replace(/gradient-light/g, 'bg-white border border-slate-300 rounded-none shadow-none');
code = code.replace(/gradient-text-primary/g, 'text-slate-900');

// Simplify the "Score Trends" dark mode styling (make it strictly light/basic)
code = code.replace(/bg-white\/90 dark:bg-slate-800\/90 backdrop-blur-sm p-6 rounded-sm border border-border\/40 dark:border-slate-700/g, 'bg-white p-6 border-b border-slate-200');
code = code.replace(/bg-white\/90 dark:bg-slate-800\/90 backdrop-blur-sm rounded-sm border border-border\/40 dark:border-slate-700 overflow-hidden/g, 'bg-white border-b border-slate-200 overflow-hidden');

code = code.replace(/bg-gray-50 dark:bg-slate-800/g, 'bg-slate-50');
code = code.replace(/bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700/g, 'bg-white divide-y divide-slate-200');
code = code.replace(/dark:text-slate-300/g, 'text-slate-600');
code = code.replace(/dark:hover:bg-white\/10/g, '');
code = code.replace(/dark:text-slate-200/g, '');
code = code.replace(/dark:border-slate-600/g, '');
code = code.replace(/dark:text-white/g, '');
code = code.replace(/dark:bg-white\/10/g, '');

// Clean up some button borders to make them more basic
code = code.replace(/border-2 border-red-800/g, 'border border-red-900 rounded-none');
code = code.replace(/bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2/g, 'bg-red-700 hover:bg-red-800 text-white text-sm uppercase px-4 py-1');

// Simplify the card components
code = code.replace(/<Card className="bg-white border border-slate-300 rounded-none shadow-none border-0">/g, '<Card className="bg-white border border-slate-300 rounded-none shadow-none">');

fs.writeFileSync(filePath, code);
console.log('Done deep cleaning the specific tabs section.');
