// fix-greenville-config.js — one-shot cleanup script
// 1. Remove age requirements from all jobs
// 2. Replace Straz Miejska role/category with Security Guard + Park Ranger
// 3. Add GV Transit job
// 4. Update national_park_service and security_guard rola_discord

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'server-config.json');
const raw = fs.readFileSync(configPath, 'utf8');
const cfg = JSON.parse(raw);

const agePattern = /^\s*Ukończone\s+\d+\s+lat\s+RP/i;

// ─── 1. Remove age wymagania from all jobs ────────────────────────────────────
let ageCount = 0;
cfg.jobs.forEach(job => {
  if (Array.isArray(job.wymagania)) {
    const before = job.wymagania.length;
    job.wymagania = job.wymagania.filter(w => !agePattern.test(w));
    ageCount += before - job.wymagania.length;
  }
  // Remove age restrictions from mini_regulamin
  if (job.mini_regulamin) {
    job.mini_regulamin = job.mini_regulamin
      .replace(/[^\n]*\d+\s+lat\s+RP[^\n]*/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }
});
console.log('Removed ' + ageCount + ' age requirements from wymagania');

// ─── 2. Clean "Wymagane konto Roblox..." anywhere in the config ───────────────
const robloxAgeRgx = /Wymagane konto Roblox z weryfikacj[aą] wiekow[aą][^.]*\.\s*/gi;
function cleanObj(obj) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === 'string') {
      obj[k] = obj[k].replace(robloxAgeRgx, '').trim();
    } else if (Array.isArray(obj[k])) {
      obj[k] = obj[k].map(item => {
        if (typeof item === 'string') return item.replace(robloxAgeRgx, '').trim();
        cleanObj(item);
        return item;
      });
    } else if (typeof obj[k] === 'object') {
      cleanObj(obj[k]);
    }
  }
}
cleanObj(cfg.channels);
console.log('Cleaned Roblox age verification strings from channels config');

// ─── 3. Replace "Straz Miejska" role ─────────────────────────────────────────
const smRoleIdx = cfg.roles.findIndex(r => r.name === 'Straz Miejska' || r.name === 'Straż Miejska');
if (smRoleIdx !== -1) {
  cfg.roles.splice(smRoleIdx, 1,
    { name: 'Security Guard', color: '#4B5563', hoist: false, mentionable: true, note: 'Sluzba — Security Guard (ochroniarz)' },
    { name: 'Park Ranger',    color: '#16A34A', hoist: false, mentionable: true, note: 'Sluzba — Park Ranger (straznik parku)' }
  );
  console.log('Replaced Straz Miejska role with Security Guard + Park Ranger');
} else {
  console.log('WARNING: Straz Miejska role not found in cfg.roles');
}

// ─── 4. Update permission_presets ────────────────────────────────────────────
if (cfg.permission_presets) {
  delete cfg.permission_presets.service_sm;
  cfg.permission_presets.service_security = 'Security Guard + Staff';
  cfg.permission_presets.service_park_ranger = 'Park Ranger + Staff';
}

// ─── 5. Replace Straz Miejska in channels array ───────────────────────────────
if (Array.isArray(cfg.channels)) {
  const newChannels = [];
  for (const cat of cfg.channels) {
    const smNames = [
      '\u{1F6E1}️ ──── Straż Miejska ────',
      '🛡️ ──── Straż Miejska ────'
    ];
    if (cat.name && (cat.name.includes('Straż Miejska') || cat.name.includes('Straz Miejska'))) {
      newChannels.push(
        {
          name: '🔐 ──── Security Guard ────',
          type: 4,
          permission: 'service_security',
          children: [
            { name: '💬│security-czat',   type: 0, topic: 'Czat Security Guard — wewnetrzna komunikacja', permission: 'service_security' },
            { name: '📋│raporty-security', type: 0, topic: 'Raporty zdarzen i interwencji',               permission: 'service_security' },
            { name: '🔐 Dyzur Security',   type: 2,                                                        permission: 'service_security' }
          ]
        },
        {
          name: '🌲 ──── Park Ranger ────',
          type: 4,
          permission: 'service_park_ranger',
          children: [
            { name: '💬│ranger-czat',   type: 0, topic: 'Czat Park Ranger — wewnetrzna komunikacja',   permission: 'service_park_ranger' },
            { name: '📋│raporty-parku', type: 0, topic: 'Raporty z patroli i incydentow w parku',       permission: 'service_park_ranger' },
            { name: '🌲 Dyzur Ranger',  type: 2,                                                         permission: 'service_park_ranger' }
          ]
        }
      );
      console.log('Replaced Straz Miejska category in channels');
    } else {
      // Fix any child topics referencing Straz Miejska
      if (Array.isArray(cat.children)) {
        cat.children = cat.children.map(ch => {
          if (ch.topic) ch.topic = ch.topic.replace(/Straż Miejska/g, 'Security Guard');
          return ch;
        });
      }
      newChannels.push(cat);
    }
  }
  cfg.channels = newChannels;
}

// ─── 6. Update national_park_service job ─────────────────────────────────────
const npsJob = cfg.jobs.find(j => j.id === 'national_park_service');
if (npsJob) {
  npsJob.rola_discord = 'Park Ranger';
  npsJob.typ = 'SERVICE';
  npsJob.kategoria = 'Administracja';
  console.log('Updated national_park_service → rola_discord=Park Ranger, typ=SERVICE');
}

// ─── 7. Update security_guard job ────────────────────────────────────────────
const sgJob = cfg.jobs.find(j => j.id === 'security_guard');
if (sgJob) {
  sgJob.rola_discord = 'Security Guard';
  sgJob.typ = 'SERVICE';
  console.log('Updated security_guard → rola_discord=Security Guard, typ=SERVICE');
}

// ─── 8. Replace Straz Miejska in mini_regulamin strings ──────────────────────
cfg.jobs.forEach(job => {
  if (job.mini_regulamin) {
    job.mini_regulamin = job.mini_regulamin.replace(/Straż Miejska/g, 'Security Guard');
  }
});

// ─── 9. Add GV Transit Bus Driver ────────────────────────────────────────────
const hasGV = cfg.jobs.some(j => j.id === 'gv_transit');
if (!hasGV) {
  let lastTransportIdx = -1;
  cfg.jobs.forEach((j, i) => { if (j.kategoria === 'Transport') lastTransportIdx = i; });
  const gvJob = {
    id: 'gv_transit',
    name: 'GV Transit Bus Driver',
    emoji: '🚌',
    kategoria: 'Transport',
    opis: 'Jestes kierowca autobusu publicznego GV Transit — komunalnej firmy transportowej Greenville. Kursujesz wyznaczonymi trasami autobusowymi, wozisz pasazerow i dbasz o punktualnosc rozkladu jazdy.',
    wymagania: [
      'Prawo jazdy kat. D',
      'Brak aktywnych mandatow za razace naruszenia'
    ],
    wynagrodzenie_min: 190,
    wynagrodzenie_max: 460,
    rola_discord: null,
    typ: 'PUBLIC',
    formularz: [
      { id: 'motywacja', pytanie: 'Dlaczego chcesz pracowac jako kierowca autobusu publicznego? (min. 30 znakow)', min: 30 },
      { id: 'trasy',     pytanie: 'Opisz podejscie do rozkladu jazdy i obsluge pasazerow (min. 30 znakow)',         min: 30 }
    ],
    mini_regulamin: '1. Trzymaj sie wyznaczonej trasy i rozkladu jazdy.\n2. Zatrzymuj sie tylko na wyznaczonych przystankach.\n3. Nie wpuszczaj pasazerow bez waznego biletu.\n4. Bezpieczenstwo pasazerow jest priorytetem — nie przekraczaj dozwolonej predkosci.\n5. Komunikuj sie z centrala przez radio podczas dyzuru.'
  };
  if (lastTransportIdx !== -1) {
    cfg.jobs.splice(lastTransportIdx + 1, 0, gvJob);
    console.log('Added GV Transit Bus Driver after index ' + lastTransportIdx);
  } else {
    cfg.jobs.push(gvJob);
    console.log('Added GV Transit Bus Driver at end');
  }
} else {
  console.log('GV Transit already exists — skipping');
}

// ─── Write ────────────────────────────────────────────────────────────────────
fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('\nDone! Total jobs: ' + cfg.jobs.length);
