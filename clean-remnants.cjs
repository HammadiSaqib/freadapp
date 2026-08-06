const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/components/BasicClientProfile.tsx');
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/shadow-emerald-200/g, '');
code = code.replace(/shadow-blue-200/g, '');
code = code.replace(/hover:hover:text-white/g, 'hover:text-white');
code = code.replace(/hover:text-white/g, ''); // Let's just remove hover:text-white since we want a basic UI, usually hover text doesn't turn white unless bg is dark

fs.writeFileSync(filePath, code);
console.log('Done fixing typos and remaining shadows.');
