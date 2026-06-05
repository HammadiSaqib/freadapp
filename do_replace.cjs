const fs = require('fs');
const file = 'c:/Users/munib/Downloads/ScoreMachineV2RawCode/client/pages/AffiliateDashboard.tsx';
let txt = fs.readFileSync(file, 'utf8');
const p1 = txt.indexOf('HERO BANNER');
const p2 = txt.indexOf('CLIENT PIPELINE + FINANCIAL CARDS');
if(p1===-1 || p2===-1) { console.log('missing tags p1', p1, 'p2', p2); process.exit(1); }
const start = txt.lastIndexOf('        {/*', p1);
const end = txt.lastIndexOf('        {/*', p2);
console.log('Replacing from', start, 'to', end);
txt = txt.substring(0, start) + fs.readFileSync('repl.txt', 'utf8') + txt.substring(end);
fs.writeFileSync(file, txt);
console.log('done');
