// setupServer.js — tworzy pełną strukturę serwera Greenville RP
// Uruchamiane przez komendę /setup (tylko Owner)
// Usuwa istniejące kanały i role, tworzy nowe

const logger = require('../utils/logger');

const delay = ms => new Promise(r => setTimeout(r, ms));

// ─── Role ────────────────────────────────────────────────────────────────────

const ROLE_DEFS = [
  { name: 'Niezweryfikowany', color: 0x6B7280, hoist: false, mentionable: false },
  { name: 'Mieszkaniec',      color: 0x4ADE80, hoist: false, mentionable: false },
  { name: 'Kat. AM',          color: 0x94A3B8, hoist: false, mentionable: false },
  { name: 'Kat. A1',          color: 0x94A3B8, hoist: false, mentionable: false },
  { name: 'Kat. A2',          color: 0x94A3B8, hoist: false, mentionable: false },
  { name: 'Kat. A',           color: 0x94A3B8, hoist: false, mentionable: false },
  { name: 'Kat. B',           color: 0x94A3B8, hoist: false, mentionable: false },
  { name: 'Kat. C',           color: 0x94A3B8, hoist: false, mentionable: false },
  { name: 'Kat. D',           color: 0x94A3B8, hoist: false, mentionable: false },
  { name: 'Kat. T',           color: 0x94A3B8, hoist: false, mentionable: false },
  { name: '🔔 Powiadomienia', color: 0xFFFFFF, hoist: false, mentionable: false },
  { name: 'Wspierający',      color: 0xA855F7, hoist: false, mentionable: false },
  { name: 'Nitro Booster',    color: 0xFF73FA, hoist: false, mentionable: false },
  { name: 'Taksówkarz',       color: 0xEAB308, hoist: false, mentionable: true  },
  { name: 'Straż Miejska',    color: 0x6366F1, hoist: false, mentionable: true  },
  { name: 'DOT',              color: 0xF59E0B, hoist: false, mentionable: true  },
  { name: 'Straż Pożarna',    color: 0xDC2626, hoist: false, mentionable: true  },
  { name: 'EMS',              color: 0x10B981, hoist: false, mentionable: true  },
  { name: 'Policja',          color: 0x1D4ED8, hoist: false, mentionable: true  },
  { name: 'Helper',           color: 0xF1C40F, hoist: true,  mentionable: true  },
  { name: 'HR',               color: 0x3B82F6, hoist: true,  mentionable: true  },
  { name: 'Host',             color: 0x9B59B6, hoist: true,  mentionable: true  },
  { name: 'Moderator',        color: 0xE67E22, hoist: true,  mentionable: true  },
  { name: 'Administrator',    color: 0xE74C3C, hoist: true,  mentionable: true  },
  { name: 'Co-Owner',         color: 0xFF6B00, hoist: true,  mentionable: true  },
  { name: 'Owner',            color: 0xFFD700, hoist: true,  mentionable: true  },
];

// ─── Buduj strukturę kanałów ─────────────────────────────────────────────────

function buildStructure(roles, everyoneId) {
  const STAFF  = ['Helper','HR','Host','Moderator','Administrator','Co-Owner','Owner'];
  const MEMBER = ['Mieszkaniec','Nitro Booster','Wspierający',...STAFF];

  const VIEW      = String(1n << 10n);
  const SEND      = String(1n << 11n);
  const CONNECT   = String(1n << 20n);
  const VIEW_SEND = String((1n << 10n) | (1n << 11n));
  const VIEW_HIST = String((1n << 10n) | (1n << 16n));

  const ow = (id, allow, deny) => ({ id, type: 0, allow: allow || '0', deny: deny || '0' });
  const ids = names => names.map(n => roles[n]).filter(Boolean);

  const only = names => [
    ow(everyoneId, '0', VIEW),
    ...ids(names).map(r => ow(r.id, VIEW_SEND, '0')),
  ];
  const readOnly = (extraWrite = []) => [
    ow(everyoneId, VIEW_HIST, SEND),
    ...ids(extraWrite).map(r => ow(r.id, SEND, '0')),
  ];
  const staffOnly    = () => only(STAFF);
  const serviceOnly  = names => only([...STAFF, ...names]);
  const memberOnly   = () => only(MEMBER);
  const vipOnly      = () => only(['Nitro Booster','Wspierający',...STAFF]);
  const voiceReadOnly = () => [ow(everyoneId, VIEW, CONNECT)];

  return [
    {
      name: '📊 ──── Statystyki ────', type: 4,
      children: [
        { name: '👥│Mieszkańcy: 0', type: 2, perm: voiceReadOnly() },
        { name: '🟢│Sesja: Brak',   type: 2, perm: voiceReadOnly() },
        { name: '🤖│Boty: 0',       type: 2, perm: voiceReadOnly() },
      ],
    },
    {
      name: '✅ ──── Weryfikacja ────', type: 4,
      children: [
        { name: '📋│zacznij-tutaj',    type: 0, topic: 'Zweryfikuj się — powiąż konto Roblox i zdaj quiz', perm: [ow(everyoneId, VIEW_HIST, SEND)] },
        { name: '🪪│logi-weryfikacji', type: 0, topic: 'Logi weryfikacji — tylko staff', perm: staffOnly() },
      ],
    },
    {
      name: '❗ ──── Informacje ────', type: 4,
      children: [
        { name: '📢│ogłoszenia',        type: 0, perm: readOnly(STAFF), topic: 'Oficjalne ogłoszenia serwera Greenville RP' },
        { name: '❗│regulamin',         type: 0, perm: readOnly(),       topic: 'Regulamin serwera — przeczytaj przed weryfikacją' },
        { name: '📖│słownik-rp',       type: 0, perm: readOnly(),       topic: 'Pojęcia RP: FRP, NLR, metagaming i inne' },
        { name: '🗺️│o-greenville',     type: 0, perm: readOnly(),       topic: 'Informacje o mapie i lokacjach w Greenville' },
        { name: '🔔│rola-powiadomień',  type: 0, perm: readOnly(),       topic: 'Kliknij przycisk aby otrzymywać powiadomienia o sesjach' },
        { name: '🏆│rankingi',         type: 0, perm: readOnly(STAFF),   topic: 'Rankingi graczy i służb' },
      ],
    },
    {
      name: '💬 ──── Ogólne ────', type: 4,
      children: [
        { name: '💬│ogólny',            type: 0, perm: memberOnly(), topic: 'Główny kanał rozmów' },
        { name: '🎮│roblox-off-topic',  type: 0, perm: memberOnly(), topic: 'Rozmowy o Roblox' },
        { name: '📸│screenshoty',       type: 0, perm: memberOnly(), topic: 'Zdjęcia z sesji — tylko screenshoty!' },
        { name: '😂│memy',              type: 0, perm: memberOnly(), topic: 'Memy związane z RP' },
        { name: '🏆│osiągnięcia',       type: 0, perm: memberOnly(), topic: 'Pochwal się swoimi osiągnięciami!' },
        { name: '💡│sugestie',          type: 0, perm: memberOnly(), topic: 'Sugestie — 1 sugestia per wiadomość' },
        { name: '💜│vip-lounge',        type: 0, perm: vipOnly(),    topic: 'Kanał dla Wspierających i Boosterów 💜' },
      ],
    },
    {
      name: '🎪 ──── Sesje RP ────', type: 4,
      children: [
        { name: '📅│plan-sesji',         type: 0, perm: readOnly(),      topic: 'Harmonogram nadchodzących sesji' },
        { name: '📢│ogłoszenia-sesji',   type: 0, perm: readOnly(STAFF), topic: 'Ogłoszenia o sesjach' },
        { name: '✅│zapisy-na-sesję',    type: 0, perm: memberOnly(),    topic: 'Zapisz się na sesję komendą /sesja zapisy' },
        { name: '📊│wyniki-sesji',       type: 0, perm: readOnly(STAFF), topic: 'Podsumowania zakończonych sesji' },
        { name: '💬│rozmowy-o-sesjach', type: 0, perm: memberOnly(),    topic: 'Dyskusje i pytania o sesje' },
      ],
    },
    {
      name: '👤 ──── Postacie & Pojazdy ────', type: 4,
      children: [
        { name: '🪪│stwórz-postać',    type: 0, perm: memberOnly(), topic: 'Stwórz postać RP — dowód, PESEL, numer tel.' },
        { name: '🚗│rejestracja-auta', type: 0, perm: memberOnly(), topic: 'Zarejestruj pojazd — wymagane kat. B' },
        { name: '📋│prawo-jazdy',      type: 0, perm: memberOnly(), topic: 'Zdaj egzamin i zdobądź prawo jazdy' },
        { name: '📜│moje-mandaty',     type: 0, perm: memberOnly(), topic: 'Sprawdź swoje mandaty /mandaty lista' },
      ],
    },
    {
      name: '💼 ──── Praca & Służby ────', type: 4,
      children: [
        { name: '📋│dostępne-stanowiska', type: 0, perm: readOnly(),      topic: 'Lista dostępnych służb i wymagania' },
        { name: '📝│podania-o-służbę',    type: 0, perm: memberOnly(),    topic: 'Złóż podanie do wybranej służby' },
        { name: '📊│wyniki-podań',        type: 0, perm: readOnly(STAFF), topic: 'Wyniki podań' },
      ],
    },
    {
      name: '🆘 ──── Pomoc ────', type: 4,
      children: [
        { name: '❓│faq',            type: 0, perm: readOnly(),   topic: 'Najczęściej zadawane pytania' },
        { name: '🎫│otwórz-ticket', type: 0,                      topic: 'Otwórz prywatny ticket ze staffem' },
        { name: '😡│skargi',        type: 0, perm: memberOnly(),  topic: 'Skargi na graczy lub staff' },
      ],
    },
    {
      name: '🔊 ──── Głosowe ────', type: 4,
      children: [
        { name: 'Lobby',              type: 2 },
        { name: 'Ogólny 1',           type: 2 },
        { name: 'Ogólny 2',           type: 2 },
        { name: 'Ogólny 3',           type: 2 },
        { name: '🔒 Prywatny [2os]',  type: 2, limit: 2 },
        { name: '🔒 Prywatny [4os]',  type: 2, limit: 4 },
        { name: '🎵 Radio RMF MAXX',  type: 2 },
        { name: '📻 AFK',             type: 2 },
      ],
    },
    {
      name: '🚔 ──── Policja ────', type: 4, perm: serviceOnly(['Policja']),
      children: [
        { name: '💬│policja-czat',        type: 0, perm: serviceOnly(['Policja']), topic: 'Czat wydziału Policji' },
        { name: '📋│raporty-policji',     type: 0, perm: serviceOnly(['Policja']), topic: 'Raporty i notatki służbowe' },
        { name: '📜│lista-poszukiwanych', type: 0, perm: serviceOnly(['Policja']), topic: 'Lista poszukiwanych' },
        { name: '🚔 Patrol Alpha',        type: 2, perm: serviceOnly(['Policja']) },
        { name: '🚔 Patrol Bravo',        type: 2, perm: serviceOnly(['Policja']) },
        { name: '🏢 Centrum Dowodzenia',  type: 2, perm: serviceOnly(['Policja']) },
      ],
    },
    {
      name: '🚑 ──── EMS ────', type: 4, perm: serviceOnly(['EMS']),
      children: [
        { name: '💬│ems-czat',    type: 0, perm: serviceOnly(['EMS']), topic: 'Czat ratownictwa medycznego' },
        { name: '📋│raporty-ems', type: 0, perm: serviceOnly(['EMS']), topic: 'Raporty medyczne' },
        { name: '🚑 Dyżur EMS 1', type: 2, perm: serviceOnly(['EMS']) },
        { name: '🚑 Dyżur EMS 2', type: 2, perm: serviceOnly(['EMS']) },
      ],
    },
    {
      name: '🚒 ──── Straż Pożarna ────', type: 4, perm: serviceOnly(['Straż Pożarna']),
      children: [
        { name: '💬│straż-czat',     type: 0, perm: serviceOnly(['Straż Pożarna']), topic: 'Czat Straży Pożarnej' },
        { name: '📋│raporty-straży', type: 0, perm: serviceOnly(['Straż Pożarna']), topic: 'Raporty interwencji' },
        { name: '🚒 Dyżur Straży',   type: 2, perm: serviceOnly(['Straż Pożarna']) },
      ],
    },
    {
      name: '🚧 ──── DOT ────', type: 4, perm: serviceOnly(['DOT']),
      children: [
        { name: '💬│dot-czat',   type: 0, perm: serviceOnly(['DOT']), topic: 'Czat Departamentu Transportu' },
        { name: '🚧 Dyżur DOT', type: 2, perm: serviceOnly(['DOT']) },
      ],
    },
    {
      name: '🛡️ ──── Straż Miejska ────', type: 4, perm: serviceOnly(['Straż Miejska']),
      children: [
        { name: '💬│sm-czat',    type: 0, perm: serviceOnly(['Straż Miejska']), topic: 'Czat Straży Miejskiej' },
        { name: '🛡️ Dyżur SM', type: 2, perm: serviceOnly(['Straż Miejska']) },
      ],
    },
    {
      name: '📝 ──── Logi ────', type: 4, perm: staffOnly(),
      children: [
        { name: '🤖│logi-bota',         type: 0, perm: staffOnly(), topic: 'Automatyczne logi bota' },
        { name: '👥│logi-członków',     type: 0, perm: staffOnly(), topic: 'Dołączenia / opuszczenia' },
        { name: '✏️│logi-nicków',       type: 0, perm: staffOnly(), topic: 'Zmiany nicków i avatarów' },
        { name: '🗑️│logi-wiadomości',  type: 0, perm: staffOnly(), topic: 'Usunięte i edytowane wiadomości' },
        { name: '🔨│logi-moderacji',    type: 0, perm: staffOnly(), topic: 'Warny, bany, kicke, mute' },
        { name: '🎫│logi-ticketów',     type: 0, perm: staffOnly(), topic: 'Historia ticketów' },
        { name: '🚗│logi-pojazdów',     type: 0, perm: staffOnly(), topic: 'Rejestracje i zmiany pojazdów' },
        { name: '🔊│logi-głosowe',      type: 0, perm: staffOnly(), topic: 'Wejścia/wyjścia z kanałów głosowych' },
      ],
    },
    {
      name: '🛡️ ──── STAFF ────', type: 4, perm: staffOnly(),
      children: [
        { name: '📢│ogłoszenia-staffu', type: 0, perm: staffOnly(),                                          topic: 'Ogłoszenia wewnętrzne staffu' },
        { name: '💬│staff-ogólny',      type: 0, perm: staffOnly(),                                          topic: 'Ogólny czat staffu' },
        { name: '👑│host-chat',         type: 0, perm: only(['Host','Administrator','Co-Owner','Owner']),     topic: 'Czat Hostów i wyżej' },
        { name: '🔨│mod-chat',          type: 0, perm: staffOnly(),                                          topic: 'Czat moderatorów' },
        { name: '👥│hr-chat',           type: 0, perm: only(['HR','Administrator','Co-Owner','Owner']),       topic: 'Czat HR — nabory, podania' },
        { name: '🤖│bot-komendy',       type: 0, perm: staffOnly(),                                          topic: 'Testowanie i konfiguracja bota' },
        { name: '📋│notatki-staffu',    type: 0, perm: staffOnly(),                                          topic: 'Notatki, przypomnienia' },
        { name: '⚠️│warny-i-bany',      type: 0, perm: staffOnly(),                                          topic: 'Rejestr kar moderacyjnych' },
        { name: '📖│regulamin-staffu',  type: 0, perm: staffOnly(),                                          topic: 'Regulamin pracy staffu' },
        { name: '🔊 Staff Voice',       type: 2, perm: staffOnly() },
        { name: '🏛️ Spotkanie Staffu', type: 2, perm: staffOnly() },
      ],
    },
  ];
}

// ─── Główna funkcja ───────────────────────────────────────────────────────────

async function setupServer(guild) {
  logger.info('🚀 setupServer: start');

  const channels = await guild.channels.fetch();
  const roles    = await guild.roles.fetch();
  const everyone = guild.roles.everyone;

  // Usuń kanały
  logger.info(`🗑️  Usuwanie ${channels.size} kanałów...`);
  for (const [, ch] of channels) {
    await ch.delete('Setup — czyste konto').catch(() => {});
    await delay(350);
  }

  // Usuń role
  const deletable = [...roles.values()].filter(r => r.name !== '@everyone' && !r.managed);
  logger.info(`🗑️  Usuwanie ${deletable.length} ról...`);
  for (const r of deletable) {
    await r.delete('Setup — czyste konto').catch(() => {});
    await delay(350);
  }

  // Twórz role
  logger.info('🎭 Tworzenie ról...');
  const createdRoles = {};
  for (const def of ROLE_DEFS) {
    try {
      const role = await guild.roles.create({
        name: def.name, color: def.color,
        hoist: def.hoist, mentionable: def.mentionable,
        reason: 'Setup Greenville RP',
      });
      createdRoles[def.name] = role;
      logger.info(`  ✅ @${role.name}`);
      await delay(400);
    } catch (e) {
      logger.error(`  ❌ Rola ${def.name}: ${e.message}`);
    }
  }

  // Twórz kanały
  const structure = buildStructure(createdRoles, everyone.id);
  logger.info('📁 Tworzenie struktury kanałów...');

  for (const cat of structure) {
    try {
      const category = await guild.channels.create({
        name: cat.name,
        type: cat.type,
        permissionOverwrites: cat.perm ?? [],
        reason: 'Setup Greenville RP',
      });
      logger.info(`  📁 ${category.name}`);
      await delay(400);

      for (const child of (cat.children ?? [])) {
        try {
          await guild.channels.create({
            name:  child.name,
            type:  child.type,
            parent: category,
            topic: child.topic,
            userLimit: child.limit,
            permissionOverwrites: child.perm ?? cat.perm ?? [],
            reason: 'Setup Greenville RP',
          });
          logger.info(`    ✅ ${child.name}`);
          await delay(350);
        } catch (e) {
          logger.error(`    ❌ ${child.name}: ${e.message}`);
        }
      }
    } catch (e) {
      logger.error(`  ❌ Kategoria ${cat.name}: ${e.message}`);
    }
  }

  logger.info('✅ setupServer: gotowe');
  return createdRoles;
}

module.exports = { setupServer };
