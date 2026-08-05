const fs = require('fs');
const f = 'C:\\Users\\JenniferDundas\\Documents\\domes-team-app\\app\\dashboard\\page.tsx';
let c = fs.readFileSync(f, 'utf8');
const recap = "    { label: 'Weekend Recap', href: '/recap', emoji: '\uD83C\uDF89', desc: 'Weekly highlights and wins' },\n";
c = c.replace("    { label: 'Wall of Love'", recap + "    { label: 'Wall of Love'");
fs.writeFileSync(f, c);
console.log('Done!');