const fs = require('fs');
const f = 'C:\\Users\\JenniferDundas\\Documents\\domes-team-app\\app\\dashboard\\page.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/\u00C2\u00B7/g, '\u00B7');
if (!c.includes('\u00B7')) {
  c = c.replace(/Â·/g, '\u00B7');
}
fs.writeFileSync(f, c);
console.log('Done!');