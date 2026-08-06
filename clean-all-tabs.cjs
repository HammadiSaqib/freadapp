const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/components/BasicClientProfile.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Advanced regex to wipe out gradients and glowing effects across the entire file

// 1. Remove background gradients completely
code = code.replace(/bg-gradient-to-[a-z]{1,2}\s+/g, '');
code = code.replace(/from-[a-z]+-\d{2,3}\s+/g, '');
code = code.replace(/via-[a-z]+-\d{2,3}\s+/g, '');
code = code.replace(/to-[a-z]+-\d{2,3}\s*/g, '');

// 2. Remove text gradients
code = code.replace(/text-transparent/g, 'text-slate-900');
code = code.replace(/bg-clip-text/g, '');

// 3. Remove all shadows
code = code.replace(/shadow-(sm|md|lg|xl|2xl|inner|none)\s*/g, '');
code = code.replace(/shadow\s+/g, '');

// 4. Flatten all heavily rounded corners to simple small corners or none
code = code.replace(/rounded-3xl/g, 'rounded-sm');
code = code.replace(/rounded-2xl/g, 'rounded-sm');
code = code.replace(/rounded-xl/g, 'rounded-sm');
code = code.replace(/rounded-lg/g, 'rounded-sm');
// Note: Keeping rounded-full for things like icons/avatars, but could replace if needed

// 5. Replace colored backgrounds with basic white or slate
code = code.replace(/bg-blue-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-indigo-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-purple-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-emerald-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-teal-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-amber-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-orange-50(\/50)?/g, 'bg-slate-50');
code = code.replace(/bg-red-50(\/50)?/g, 'bg-slate-50');

// Replace vibrant solid backgrounds with black/white/slate
code = code.replace(/bg-blue-(500|600)/g, 'bg-slate-800 text-white');
code = code.replace(/bg-indigo-(500|600)/g, 'bg-slate-800 text-white');
code = code.replace(/bg-purple-(500|600)/g, 'bg-slate-800 text-white');
code = code.replace(/bg-emerald-(500|600)/g, 'bg-slate-800 text-white');
code = code.replace(/bg-teal-(500|600)/g, 'bg-slate-800 text-white');
code = code.replace(/bg-amber-(500|600)/g, 'bg-slate-800 text-white');
code = code.replace(/bg-orange-(500|600)/g, 'bg-slate-800 text-white');

// Replace border colors with standard borders
code = code.replace(/border-blue-(100|200|300|400|500)/g, 'border-slate-300');
code = code.replace(/border-indigo-(100|200|300|400|500)/g, 'border-slate-300');
code = code.replace(/border-purple-(100|200|300|400|500)/g, 'border-slate-300');
code = code.replace(/border-emerald-(100|200|300|400|500)/g, 'border-slate-300');
code = code.replace(/border-teal-(100|200|300|400|500)/g, 'border-slate-300');
code = code.replace(/border-amber-(100|200|300|400|500)/g, 'border-slate-300');
code = code.replace(/border-orange-(100|200|300|400|500)/g, 'border-slate-300');
code = code.replace(/border-red-(100|200|300|400|500)/g, 'border-slate-300');

// Remove focus rings
code = code.replace(/focus:ring-\d/g, '');
code = code.replace(/focus:ring-[a-z]+-\d{2,3}/g, '');
code = code.replace(/focus-within:ring-\d/g, '');
code = code.replace(/focus-within:ring-[a-z]+-\d{2,3}/g, '');
code = code.replace(/ring-[a-z]+-\d{2,3}/g, '');

// Simplify active tab state
code = code.replace(/data-\[state=active\]:bg-black/g, 'data-[state=active]:bg-slate-900');
code = code.replace(/data-\[state=active\]:border-black/g, 'data-[state=active]:border-slate-900');

fs.writeFileSync(filePath, code);
console.log('Successfully stripped all Elite UI elements from the entire BasicClientProfile.tsx file.');
