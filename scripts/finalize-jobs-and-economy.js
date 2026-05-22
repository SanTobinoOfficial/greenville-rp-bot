// finalize-jobs-and-economy.js
// 1. Remove wynagrodzenie_min/max from all jobs (remove economy)
// 2. Add Discord role to every job that lacks one
// 3. Add missing real Greenville game jobs (The Grind, Denver Atwood, Karate WI, NextStop, British Fish & Chips)
// 4. Fix bobahaus job name

const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '..', 'server-config.json');
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// ─── 1. Remove economy fields ─────────────────────────────────────────────────
let econRemoved = 0;
cfg.jobs.forEach(job => {
  if ('wynagrodzenie_min' in job || 'wynagrodzenie_max' in job) {
    delete job.wynagrodzenie_min;
    delete job.wynagrodzenie_max;
    econRemoved++;
  }
});
console.log('Removed economy fields from', econRemoved, 'jobs');

// ─── 2. Assign rola_discord to every job that lacks one ──────────────────────
// Build a role name from job name (max 32 chars for Discord)
function makeRoleName(jobName) {
  // Shorten common suffixes
  return jobName
    .replace(/\s+Worker$/, '')
    .replace(/\s+Employee$/, '')
    .replace(/\s+Cashier$/, '')
    .replace(/\s+Server$/, '')
    .replace(/\s+Barista$/, '')
    .replace(/\s+Baker$/, '')
    .replace(/\s+Banker$/, '')
    .replace(/\s+Mechanic$/, '')
    .replace(/\s+Teacher$/, '')
    .replace(/\s+Agent$/, '')
    .slice(0, 32)
    .trim();
}

const newRoles = []; // roles to add to setupServer.js
cfg.jobs.forEach(job => {
  if (!job.rola_discord && job.id !== 'unemployed') {
    const roleName = makeRoleName(job.name);
    job.rola_discord = roleName;
    newRoles.push({ name: roleName, id: job.id });
  }
});
console.log('Assigned rola_discord to', newRoles.length, 'jobs');
if (newRoles.length > 0) {
  console.log('New roles needed:', newRoles.map(r => r.name).join(', '));
}

// ─── 3. Add missing real game jobs ────────────────────────────────────────────
const existingIds = new Set(cfg.jobs.map(j => j.id));

const missingJobs = [
  {
    id: 'the_grind',
    name: 'The Grind Worker',
    emoji: '☕',
    kategoria: 'Kawiarnia',
    opis: 'Pracujesz w The Grind — kultowej kawiarni Greenville. Parzysz kawę, obsługujesz klientów i tworzysz przyjazną atmosferę lokalnego bistro.',
    wymagania: ['Brak aktywnych kar na Discord'],
    rola_discord: 'The Grind',
    typ: 'PUBLIC',
    formularz: [
      { id: 'motywacja', pytanie: 'Dlaczego chcesz pracować w The Grind? (min. 25 znaków)', min: 25 },
      { id: 'kawa',      pytanie: 'Co wiesz o rodzajach kawy i napojów kawowych? (min. 20 znaków)', min: 20 }
    ],
    mini_regulamin: '1. Obsługuj klientów sprawnie i z uśmiechem.\n2. Dbaj o czystość lady i ekspresu.\n3. Nie podawaj napojów bez zamówienia.\n4. Przestrzegaj kolejki — każdy klient jest ważny.'
  },
  {
    id: 'denver_atwood',
    name: 'Denver Atwood Camping Supplies Worker',
    emoji: '⛺',
    kategoria: 'Handel',
    opis: 'Pracujesz w Denver Atwood Camping Supplies — sklepie z wyposażeniem turystycznym i campingowym w Greenville. Doradzasz klientom i zarządzasz magazynem.',
    wymagania: ['Brak aktywnych kar na Discord'],
    rola_discord: 'Denver Atwood',
    typ: 'PUBLIC',
    formularz: [
      { id: 'motywacja',  pytanie: 'Co przyciąga Cię do pracy w sklepie outdoorowym? (min. 25 znaków)', min: 25 },
      { id: 'produkty',   pytanie: 'Wymień 3 kategorie sprzętu campingowego, które znasz (min. 30 znaków)', min: 30 }
    ],
    mini_regulamin: '1. Doradzaj klientom kompetentnie i uczciwie.\n2. Sprawdzaj stan magazynu przed rekomendowaniem produktów.\n3. Dbaj o porządek na półkach i ekspozycji.\n4. Zgłaszaj braki towarowe kierownikowi.'
  },
  {
    id: 'karate_wisconsin',
    name: 'Karate Wisconsin Instructor',
    emoji: '🥋',
    kategoria: 'Edukacja',
    opis: 'Jesteś instruktorem w Karate Wisconsin — lokalnej szkole sztuk walki. Prowadzisz zajęcia, uczysz technik i dbasz o bezpieczeństwo uczniów.',
    wymagania: ['Brak aktywnych kar na Discord'],
    rola_discord: 'Karate Wisconsin',
    typ: 'PUBLIC',
    formularz: [
      { id: 'motywacja',    pytanie: 'Dlaczego chcesz uczyć karate? (min. 25 znaków)', min: 25 },
      { id: 'doswiadczenie', pytanie: 'Opisz swoje doświadczenie ze sztukami walki (min. 20 znaków)', min: 20 }
    ],
    mini_regulamin: '1. Bezpieczeństwo uczniów jest priorytetem absolutnym.\n2. Nie demonstruj technik bez asekuracji.\n3. Traktuj każdego ucznia z szacunkiem, niezależnie od poziomu.\n4. Zajęcia prowadź zgodnie z harmonogramem.'
  },
  {
    id: 'nextstop',
    name: 'NextStop Worker',
    emoji: '🏪',
    kategoria: 'Handel',
    opis: 'Pracujesz w NextStop — całodobowej stacji i minimarkecie przy drodze w Greenville. Obsługujesz klientów przy kasie i dbasz o zaopatrzenie sklepu.',
    wymagania: ['Brak aktywnych kar na Discord'],
    rola_discord: 'NextStop',
    typ: 'PUBLIC',
    formularz: [
      { id: 'motywacja', pytanie: 'Dlaczego chcesz pracować w NextStop? (min. 20 znaków)', min: 20 }
    ],
    mini_regulamin: '1. Bądź uprzejmy wobec każdego klienta.\n2. Dbaj o czystość kasy i półek.\n3. Nie opuszczaj stanowiska bez zastępstwa.\n4. Sprawdzaj daty ważności produktów regularnie.'
  },
  {
    id: 'british_fish_chips',
    name: 'British Fish & Chips Worker',
    emoji: '🐟',
    kategoria: 'Gastronomia',
    opis: 'Pracujesz w British Fish & Chips — restauracji serwującej klasyczne dania kuchni brytyjskiej. Przygotowujesz ryby, frytki i inne specjały w brytyjskim stylu.',
    wymagania: ['Brak aktywnych kar na Discord'],
    rola_discord: 'British Fish & Chips',
    typ: 'PUBLIC',
    formularz: [
      { id: 'motywacja', pytanie: 'Co podoba Ci się w kuchni brytyjskiej? (min. 20 znaków)', min: 20 },
      { id: 'obs',       pytanie: 'Opisz jak obsłużysz klienta zamawiającego rybę z frytkami (min. 30 znaków)', min: 30 }
    ],
    mini_regulamin: '1. Ryby smażone podawaj świeże — nie przechowuj zbyt długo pod lampą.\n2. Frytki muszą być chrupiące — kontroluj temperaturę oleju.\n3. Dbaj o higienę przy obróbce ryb.\n4. Informuj klientów o alergenach.'
  }
];

let added = 0;
for (const job of missingJobs) {
  if (!existingIds.has(job.id)) {
    // Insert into correct category position
    const lastCatIdx = cfg.jobs.reduce((acc, j, i) => j.kategoria === job.kategoria ? i : acc, -1);
    if (lastCatIdx !== -1) {
      cfg.jobs.splice(lastCatIdx + 1, 0, job);
    } else {
      cfg.jobs.push(job);
    }
    newRoles.push({ name: job.rola_discord, id: job.id });
    added++;
    console.log('Added missing game job:', job.name);
  } else {
    console.log('Already exists:', job.id);
  }
}
console.log('Added', added, 'missing game jobs. Total jobs now:', cfg.jobs.length);

// ─── 4. Fix bobahaus name ────────────────────────────────────────────────────
const bobaJob = cfg.jobs.find(j => j.id === 'bobahaus');
if (bobaJob && bobaJob.name === 'bobahaus Worker') {
  bobaJob.name = 'Bobahaus Worker';
  bobaJob.rola_discord = 'Bobahaus';
  console.log('Fixed bobahaus name capitalization');
}

// ─── 5. Write updated config ──────────────────────────────────────────────────
fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('\nDone! Total jobs:', cfg.jobs.length);
console.log('\nPaste these role definitions into setupServer.js ROLE_DEFS (between Nitro Booster and Taksówkarz):');
console.log('(job roles for non-service jobs — color 0x94A3B8, hoist false, mentionable true)');

// Output unique new roles (skip ones already defined as service roles)
const serviceRoles = new Set(['Policja','EMS','DOT','Straż Pożarna','Security Guard','Park Ranger','Taksówkarz']);
const uniqueNew = [];
const seen = new Set();
cfg.jobs.forEach(j => {
  if (j.rola_discord && !serviceRoles.has(j.rola_discord) && !seen.has(j.rola_discord) && j.id !== 'unemployed') {
    seen.add(j.rola_discord);
    uniqueNew.push(j.rola_discord);
  }
});
console.log('\nUnique job roles needed (', uniqueNew.length, '):');
uniqueNew.forEach(r => console.log(`  { name: '${r}', color: 0x94A3B8, hoist: false, mentionable: true },`));
