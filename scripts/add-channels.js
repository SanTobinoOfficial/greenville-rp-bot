// Add economy and taryfikator channels to server-config.json
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'server-config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// ── Add ⚖️│taryfikator to Informacje category ──────────────────
const informacjeIdx = config.categories.findIndex(c => c.name.includes('Informacje'));
if (informacjeIdx !== -1) {
  const alreadyHasTaryfikator = config.categories[informacjeIdx].channels
    .some(ch => ch.name.includes('taryfikator'));
  if (!alreadyHasTaryfikator) {
    config.categories[informacjeIdx].channels.push({
      name: '⚖️│taryfikator',
      type: 'text',
      topic: 'Taryfikator kar serwera — Discord i RP. Przeczytaj przed zgłoszeniem odwołania.',
      permission: 'everyone_view_history',
      embed: 'taryfikator',
    });
    console.log('Added ⚖️│taryfikator to Informacje');
  }
}

// ── Add 💰 Ekonomia category ────────────────────────────────────
const hasEkonomia = config.categories.some(c => c.name.includes('Ekonomia'));
if (!hasEkonomia) {
  // Insert after Praca & Służby
  const pracaIdx = config.categories.findIndex(c => c.name.includes('Praca'));
  const ekonomiaCategory = {
    name: '💰 ──── Ekonomia ────',
    channels: [
      {
        name: '💰│ekonomia-info',
        type: 'text',
        topic: 'Informacje o systemie ekonomii RP — portfel, bank, praca, wynagrodzenia.',
        permission: 'everyone_view_history',
        embed: 'ekonomia_info',
      },
      {
        name: '🏦│transakcje',
        type: 'text',
        topic: 'Logi transakcji RP — przelewy, mandaty, wynagrodzenia.',
        permission: 'members_only',
      },
    ],
  };
  if (pracaIdx !== -1) {
    config.categories.splice(pracaIdx + 1, 0, ekonomiaCategory);
  } else {
    config.categories.push(ekonomiaCategory);
  }
  console.log('Added 💰 Ekonomia category');
}

// ── Update embeds section with ekonomia_info embed ──────────────
const hasEkonomiaEmbed = config.embeds && config.embeds.some &&
  config.embeds.some(e => e && e.id === 'ekonomia_info');

if (!hasEkonomiaEmbed) {
  if (!config.embeds) config.embeds = [];
  // Only add if embeds is an array
  if (Array.isArray(config.embeds)) {
    config.embeds.push({
      id: 'ekonomia_info',
      channel: '💰│ekonomia-info',
      title: '💰 System Ekonomii RP — AURORA Greenville RP',
      description: 'Witaj w systemie ekonomii AURORA Greenville RP!',
      color: '#F59E0B',
      fields: [
        {
          name: '👛 Portfel (Gotówka)',
          value: 'Gotówka przy sobie. Może zostać skradziona podczas akcji RP.\nKomenda: `/portfel`',
          inline: true,
        },
        {
          name: '🏦 Konto bankowe',
          value: 'Bezpieczne środki w banku. Wpłaty i wypłaty przez `/bank`.\nPrzelewy: `/przelew`',
          inline: true,
        },
        {
          name: '💼 Wynagrodzenia',
          value: 'Zarabiasz pracując na sesjach RP. Każda praca ma inną stawkę godzinową.\nSprawdź: `/zarobki stawka`',
          inline: false,
        },
        {
          name: '📋 Dostępne komendy ekonomii',
          value: '`/portfel` — stan portfela i konta\n`/bank` — operacje bankowe\n`/przelew` — przelew do gracza\n`/zarobki` — wypłata / stawka',
          inline: false,
        },
        {
          name: '⚠️ Zasady ekonomii',
          value: 'Zakaz duplikowania środków i bug abuse → permanentny ban.\nMandaty i grzywny potrącane automatycznie z konta.',
          inline: false,
        },
      ],
    });
    console.log('Added ekonomia_info embed');
  }
}

// ── Add slownik-rp section to server-config with full terms ─────
config.slownik_rp = {
  channel: '📖│słownik-rp',
  color: '#5865F2',
  terms: [
    { term: 'FRP — Fail Roleplay',      color: '🔴', desc: 'Zachowanie niezgodne z realizmem RP, niemożliwe w prawdziwym życiu. Zakaz.' },
    { term: 'NLR — New Life Rule',       color: '🔴', desc: 'Po śmierci postaci zapominasz WSZYSTKO. Zakaz powrotu w to samo miejsce przez 5 min.' },
    { term: 'Metagaming (MG)',           color: '🔴', desc: 'Używanie wiedzy zdobytej poza grą (Discord, stream, OOC) w IC. Surowy ban.' },
    { term: 'Powergaming (PG)',          color: '🔴', desc: 'Narzucanie innym graczom działań bez ich zgody. Zakaz.' },
    { term: 'RDM — Random Death Match',  color: '🔴', desc: 'Atakowanie/zabijanie graczy bez uzasadnionego powodu RP. Zakaz.' },
    { term: 'VDM — Vehicle Death Match', color: '🔴', desc: 'Używanie pojazdu jako broni bez uzasadnienia RP. Zakaz.' },
    { term: 'Combat Logging (CL)',       color: '🔴', desc: 'Wyjście z gry podczas trwającej akcji RP. Surowy ban.' },
    { term: 'Fear RP',                   color: '🟡', desc: 'Obowiązek odgrywania strachu o życie w realnym zagrożeniu (broń przy głowie).' },
    { term: 'IC — In Character',         color: '🟢', desc: 'Rozmowa i działanie jako postać podczas aktywnego RP.' },
    { term: 'OOC — Out of Character',    color: '🟢', desc: 'Rozmowa poza postacią. Dozwolona przez nawiasy () lub /b.' },
    { term: 'Void',                      color: '🟡', desc: 'Anulowanie akcji RP. Może wykonać wyłącznie Staff serwera.' },
    { term: 'Peacetime',                 color: '🟡', desc: 'Tryb bez akcji kryminalnych. Pt1°: zakaz crime. Pt2°: limit 70mph + void.' },
    { term: '/me',                       color: '🟢', desc: 'Komenda opisująca czynność postaci. Obowiązkowa przy kluczowych akcjach RP.' },
    { term: 'Hostage RP',                color: '🟡', desc: 'Akcja wzięcia zakładnika. Wymaga zgody OOC celu i aktywnego Hosta.' },
    { term: 'BOLO',                      color: '🔵', desc: 'Be On Look Out — ogłoszenie służb o poszukiwanej osobie/pojeździe.' },
    { term: '10-4',                      color: '🔵', desc: 'Potwierdzam / Odbiór (kod radiowy policji).' },
    { term: '10-33',                     color: '🔴', desc: 'ALARM! Pilna pomoc potrzebna (kod radiowy — najwyższy priorytet).' },
    { term: '10-70',                     color: '🔴', desc: 'Pościg w toku (kod radiowy policji).' },
  ],
};

console.log('Added slownik_rp section');

fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
console.log('Done! Config updated.');
