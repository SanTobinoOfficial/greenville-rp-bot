// Usuwa §10 System ekonomii z regulaminu + renumeruje §11→§10, §12→§11
const fs   = require('fs');
const path = require('path');
const cfgPath = path.join(__dirname, '..', 'server-config.json');
const cfg  = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

const secs = cfg.regulamin.sections;

// embed 8 ma dwa pola: §10 ekonomia + §11 kary — usuń §10, zostaw §11 → zmień na §10
const embed8 = secs.find(s => s.embed === 8);
if (embed8) {
  embed8.fields = embed8.fields.filter(f => !f.name.includes('ekonomi'));
  embed8.fields.forEach(f => {
    f.name = f.name.replace('§11.', '§10.');
  });
}

// embed 9: §12 → §11
const embed9 = secs.find(s => s.embed === 9);
if (embed9) {
  embed9.fields.forEach(f => {
    f.name = f.name.replace('§12.', '§11.');
  });
}

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('Usunięto §10 ekonomia. Sekcje:');
secs.forEach(s => console.log(`  embed ${s.embed}:`, (s.fields||[]).map(f=>f.name).join(' | ')));
