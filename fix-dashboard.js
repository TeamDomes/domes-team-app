const fs = require('fs');
const f = 'C:\\Users\\JenniferDundas\\Documents\\domes-team-app\\app\\dashboard\\page.tsx';
let c = fs.readFileSync(f, 'utf8');
const spotted = "    { label: 'Spotted', href: '/spotted', emoji: '\uD83D\uDC40', desc: 'Spotted any cool products in the wild?' },\n";
c = c.replace("    { label: 'Wall of Love'", spotted + "    { label: 'Wall of Love'");
fs.writeFileSync(f, c);
console.log('Done!');