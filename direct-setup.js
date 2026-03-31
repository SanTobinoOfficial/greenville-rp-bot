// Greenville RP — Direct Discord Server Setup Script
// Runs standalone with Bot Token, no bot connection needed

const TOKEN = 'MTQ4NzQ4MDkxMzkwOTUxNDMxMA.GEEoJE.MuYZ7C-VVm9c-VJJchwtZDIu6TpMWlxztAvW3E';
const GUILD_ID = '1487482322742804610';
const API = 'https://discord.com/api/v10';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const d = await res.json();
    const wait = (d.retry_after || 1) * 1000 + 200;
    console.log(`  ⏳ Rate limit — czekam ${Math.round(wait/1000)}s...`);
    await delay(wait);
    return api(method, path, body);
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)} [${method} ${path}]`);
  return data;
}

// ─── Role configuration ───────────────────────────────────────────────────────

const ROLES = [
  // Systemowe i niskie
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
  // Specjalne
  { name: '🔔 Powiadomienia', color: 0xFFFFFF, hoist: false, mentionable: false },
  { name: 'Wspierający',      color: 0xA855F7, hoist: false, mentionable: false },
  { name: 'Nitro Booster',    color: 0xFF73FA, hoist: false, mentionable: false },
  // Służby
  { name: 'Taksówkarz',       color: 0xEAB308, hoist: false, mentionable: true  },
  { name: 'Straż Miejska',    color: 0x6366F1, hoist: false, mentionable: true  },
  { name: 'DOT',              color: 0xF59E0B, hoist: false, mentionable: true  },
  { name: 'Straż Pożarna',    color: 0xDC2626, hoist: false, mentionable: true  },
  { name: 'EMS',              color: 0x10B981, hoist: false, mentionable: true  },
  { name: 'Policja',          color: 0x1D4ED8, hoist: false, mentionable: true  },
  // Staff (hoisted, widoczni na liście)
  { name: 'Helper',           color: 0xF1C40F, hoist: true,  mentionable: true  },
  { name: 'HR',               color: 0x3B82F6, hoist: true,  mentionable: true  },
  { name: 'Host',             color: 0x9B59B6, hoist: true,  mentionable: true  },
  { name: 'Moderator',        color: 0xE67E22, hoist: true,  mentionable: true  },
  { name: 'Administrator',    color: 0xE74C3C, hoist: true,  mentionable: true  },
  { name: 'Co-Owner',         color: 0xFF6B00, hoist: true,  mentionable: true  },
  { name: 'Owner',            color: 0xFFD700, hoist: true,  mentionable: true  },
];

// ─── Channel structure ────────────────────────────────────────────────────────

function buildStructure(r, everyone) {
  const STAFF  = ['Helper','HR','Host','Moderator','Administrator','Co-Owner','Owner'];
  const SERV   = ['Policja','EMS','Straż Pożarna','DOT','Straż Miejska','Taksówkarz'];
  const MEMBER = ['Mieszkaniec','Nitro Booster','Wspierający',...STAFF];

  const ids = names => names.map(n => r[n]).filter(Boolean).map(x => x.id);

  const DENY_ALL  = '0x400'; // VIEW_CHANNEL = (1 << 10) = 1024 = 0x400
  const VIEW      = String(1n << 10n);  // ViewChannel
  const SEND      = String(1n << 11n);  // SendMessages
  const CONNECT   = String(1n << 20n);  // Connect
  const VIEW_SEND = String((1n << 10n) | (1n << 11n));
  const VIEW_HIST = String((1n << 10n) | (1n << 16n)); // ViewChannel + ReadMessageHistory

  const ow = (id, allow, deny) => ({ id, type: 0, allow: allow || '0', deny: deny || '0' });

  // everyone: cannot see; specified roles can see+send
  function only(names) {
    return [
      ow(everyone, '0', VIEW),
      ...ids(names).map(id => ow(id, VIEW_SEND, '0')),
    ];
  }
  // everyone can see but NOT send; specified roles can send
  function readOnly(extraWrite = []) {
    return [
      ow(everyone, VIEW_HIST, SEND),
      ...ids(extraWrite).map(id => ow(id, SEND, '0')),
    ];
  }
  // everyone cannot see; only staff can see+send
  const staffOnly   = () => only(STAFF);
  // everyone cannot see; only staff + one service
  const serviceOnly = names => only([...STAFF, ...names]);
  // only members+
  const memberOnly  = () => only(MEMBER);
  // booster/wspierający only
  const vipOnly     = () => only(['Nitro Booster','Wspierający',...STAFF]);
  // voice: everyone cannot connect
  const voiceReadOnly = () => [ow(everyone, VIEW, CONNECT)];

  return [
    // ── STATYSTYKI ──────────────────────────────────────────────────────────
    {
      name: '📊 ──── Statystyki ────', type: 'GUILD_CATEGORY',
      children: [
        { name: '👥│Mieszkańcy: 0',  type: 'GUILD_VOICE', perm: voiceReadOnly() },
        { name: '🟢│Sesja: Brak',    type: 'GUILD_VOICE', perm: voiceReadOnly() },
        { name: '🤖│Boty: 0',        type: 'GUILD_VOICE', perm: voiceReadOnly() },
      ],
    },

    // ── WERYFIKACJA ─────────────────────────────────────────────────────────
    {
      name: '✅ ──── Weryfikacja ────', type: 'GUILD_CATEGORY',
      children: [
        {
          name: '📋│zacznij-tutaj', type: 'GUILD_TEXT',
          topic: 'Tutaj rozpoczniesz swój udział w Greenville RP — weryfikacja nicku Roblox + quiz',
          perm: [
            ow(everyone, VIEW_HIST, SEND),   // każdy może czytać
          ],
        },
        {
          name: '🪪│logi-weryfikacji', type: 'GUILD_TEXT',
          topic: 'Logi weryfikacji — tylko staff',
          perm: staffOnly(),
        },
      ],
    },

    // ── INFORMACJE ──────────────────────────────────────────────────────────
    {
      name: '❗ ──── Informacje ────', type: 'GUILD_CATEGORY',
      children: [
        { name: '📢│ogłoszenia',               type: 'GUILD_TEXT', perm: readOnly(STAFF), topic: 'Oficjalne ogłoszenia serwera Greenville RP' },
        { name: '❗│regulamin',                type: 'GUILD_TEXT', perm: readOnly(),       topic: 'Regulamin serwera — przeczytaj przed weryfikacją' },
        { name: '📖│słownik-rp',              type: 'GUILD_TEXT', perm: readOnly(),       topic: 'Pojęcia RP: FRP, NLR, metagaming i inne' },
        { name: '🗺️│o-greenville',            type: 'GUILD_TEXT', perm: readOnly(),       topic: 'Informacje o mapie i lokacjach w Greenville' },
        { name: '🔔│rola-powiadomień',         type: 'GUILD_TEXT', perm: readOnly(),       topic: 'Kliknij reakcję aby otrzymywać powiadomienia o sesjach' },
        { name: '🏆│rankingi',                type: 'GUILD_TEXT', perm: readOnly(STAFF),   topic: 'Rankingi graczy i służb' },
      ],
    },

    // ── OGÓLNE ──────────────────────────────────────────────────────────────
    {
      name: '💬 ──── Ogólne ────', type: 'GUILD_CATEGORY',
      children: [
        { name: '💬│ogólny',            type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Główny kanał rozmów' },
        { name: '🎮│roblox-off-topic',  type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Rozmowy o Roblox, nie tylko RP' },
        { name: '📸│screenshoty',       type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Zdjęcia z sesji RP — tylko screenshoty!' },
        { name: '😂│memy',              type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Memy związane z RP' },
        { name: '🏆│osiągnięcia',       type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Pochwal się swoimi osiągnięciami!' },
        { name: '💡│sugestie',          type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Sugestie dotyczące serwera — 1 sugestia per wiadomość' },
        { name: '💜│vip-lounge',        type: 'GUILD_TEXT', perm: vipOnly(),    topic: 'Kanał dla Wspierających i Boosterów 💜' },
      ],
    },

    // ── SESJE RP ────────────────────────────────────────────────────────────
    {
      name: '🎪 ──── Sesje RP ────', type: 'GUILD_CATEGORY',
      children: [
        { name: '📅│plan-sesji',          type: 'GUILD_TEXT', perm: readOnly(),       topic: 'Harmonogram nadchodzących sesji RP' },
        { name: '📢│ogłoszenia-sesji',    type: 'GUILD_TEXT', perm: readOnly(STAFF),  topic: 'Ogłoszenia o sesjach — zapisy, zmiany, odwołania' },
        { name: '✅│zapisy-na-sesję',     type: 'GUILD_TEXT', perm: memberOnly(),     topic: 'Zapisz się na nadchodzącą sesję komendą /sesja zapisy' },
        { name: '📊│wyniki-sesji',        type: 'GUILD_TEXT', perm: readOnly(STAFF),  topic: 'Podsumowania zakończonych sesji RP' },
        { name: '💬│rozmowy-o-sesjach',  type: 'GUILD_TEXT', perm: memberOnly(),     topic: 'Dyskusje, pytania i organizacja wokół sesji' },
      ],
    },

    // ── POSTACIE & POJAZDY ──────────────────────────────────────────────────
    {
      name: '👤 ──── Postacie & Pojazdy ────', type: 'GUILD_CATEGORY',
      children: [
        { name: '🪪│stwórz-postać',      type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Stwórz swoją postać RP — dowód osobisty, PESEL, numer tel.' },
        { name: '🚗│rejestracja-auta',   type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Zarejestruj pojazd — wymagane prawo jazdy kat. B' },
        { name: '📋│prawo-jazdy',        type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Zdaj egzamin i zdobądź prawo jazdy kat. AM, A, B, C, D...' },
        { name: '📜│moje-mandaty',       type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Sprawdź swoje mandaty i grzywny /mandaty lista' },
      ],
    },

    // ── PRACA & SŁUŻBY ──────────────────────────────────────────────────────
    {
      name: '💼 ──── Praca & Służby ────', type: 'GUILD_CATEGORY',
      children: [
        { name: '📋│dostępne-stanowiska', type: 'GUILD_TEXT', perm: readOnly(),       topic: 'Lista dostępnych służb i wymagania' },
        { name: '📝│podaj-o-służbę',      type: 'GUILD_TEXT', perm: memberOnly(),     topic: 'Złóż podanie do wybranej służby' },
        { name: '📊│wyniki-podań',        type: 'GUILD_TEXT', perm: readOnly(STAFF),  topic: 'Wyniki podań na służby i prace' },
      ],
    },

    // ── POMOC ───────────────────────────────────────────────────────────────
    {
      name: '🆘 ──── Pomoc ────', type: 'GUILD_CATEGORY',
      children: [
        { name: '❓│faq',            type: 'GUILD_TEXT', perm: readOnly(),  topic: 'Najczęściej zadawane pytania' },
        { name: '🎫│otwórz-ticket', type: 'GUILD_TEXT',                    topic: 'Otwórz prywatny ticket ze staffem' },
        { name: '😡│skargi',        type: 'GUILD_TEXT', perm: memberOnly(), topic: 'Skargi na graczy lub staff — użyj ticketu dla pilnych spraw' },
      ],
    },

    // ── GŁOSOWE PUBLICZNE ────────────────────────────────────────────────────
    {
      name: '🔊 ──── Głosowe ────', type: 'GUILD_CATEGORY',
      children: [
        { name: 'Lobby',                type: 'GUILD_VOICE' },
        { name: 'Ogólny 1',             type: 'GUILD_VOICE' },
        { name: 'Ogólny 2',             type: 'GUILD_VOICE' },
        { name: 'Ogólny 3',             type: 'GUILD_VOICE' },
        { name: '🔒 Prywatny [2os]',   type: 'GUILD_VOICE', limit: 2 },
        { name: '🔒 Prywatny [4os]',   type: 'GUILD_VOICE', limit: 4 },
        { name: '🎵 Radio RMF MAXX',   type: 'GUILD_VOICE' },
        { name: '📻 AFK',              type: 'GUILD_VOICE' },
      ],
    },

    // ── POLICJA ─────────────────────────────────────────────────────────────
    {
      name: '🚔 ──── Policja ────', type: 'GUILD_CATEGORY',
      perm: serviceOnly(['Policja']),
      children: [
        { name: '💬│policja-czat',         type: 'GUILD_TEXT',  perm: serviceOnly(['Policja']), topic: 'Czat wydziału Policji' },
        { name: '📋│raporty-policji',      type: 'GUILD_TEXT',  perm: serviceOnly(['Policja']), topic: 'Raporty i notatki służbowe' },
        { name: '📜│lista-poszukiwanych',  type: 'GUILD_TEXT',  perm: serviceOnly(['Policja']), topic: 'Lista poszukiwanych osób RP' },
        { name: '🚔 Patrol Alpha',         type: 'GUILD_VOICE', perm: serviceOnly(['Policja']) },
        { name: '🚔 Patrol Bravo',         type: 'GUILD_VOICE', perm: serviceOnly(['Policja']) },
        { name: '🏢 Centrum Dowodzenia',   type: 'GUILD_VOICE', perm: serviceOnly(['Policja']) },
      ],
    },

    // ── EMS ─────────────────────────────────────────────────────────────────
    {
      name: '🚑 ──── EMS ────', type: 'GUILD_CATEGORY',
      perm: serviceOnly(['EMS']),
      children: [
        { name: '💬│ems-czat',      type: 'GUILD_TEXT',  perm: serviceOnly(['EMS']), topic: 'Czat ratownictwa medycznego' },
        { name: '📋│raporty-ems',   type: 'GUILD_TEXT',  perm: serviceOnly(['EMS']), topic: 'Raporty medyczne' },
        { name: '🚑 Dyżur EMS 1',   type: 'GUILD_VOICE', perm: serviceOnly(['EMS']) },
        { name: '🚑 Dyżur EMS 2',   type: 'GUILD_VOICE', perm: serviceOnly(['EMS']) },
      ],
    },

    // ── STRAŻ POŻARNA ────────────────────────────────────────────────────────
    {
      name: '🚒 ──── Straż Pożarna ────', type: 'GUILD_CATEGORY',
      perm: serviceOnly(['Straż Pożarna']),
      children: [
        { name: '💬│straż-czat',       type: 'GUILD_TEXT',  perm: serviceOnly(['Straż Pożarna']), topic: 'Czat wydziału Straży Pożarnej' },
        { name: '📋│raporty-straży',   type: 'GUILD_TEXT',  perm: serviceOnly(['Straż Pożarna']), topic: 'Raporty interwencji' },
        { name: '🚒 Dyżur Straży',     type: 'GUILD_VOICE', perm: serviceOnly(['Straż Pożarna']) },
      ],
    },

    // ── DOT ─────────────────────────────────────────────────────────────────
    {
      name: '🚧 ──── DOT ────', type: 'GUILD_CATEGORY',
      perm: serviceOnly(['DOT']),
      children: [
        { name: '💬│dot-czat',    type: 'GUILD_TEXT',  perm: serviceOnly(['DOT']), topic: 'Czat Departamentu Transportu' },
        { name: '🚧 Dyżur DOT',  type: 'GUILD_VOICE', perm: serviceOnly(['DOT']) },
      ],
    },

    // ── STRAŻ MIEJSKA ────────────────────────────────────────────────────────
    {
      name: '🛡️ ──── Straż Miejska ────', type: 'GUILD_CATEGORY',
      perm: serviceOnly(['Straż Miejska']),
      children: [
        { name: '💬│sm-czat',    type: 'GUILD_TEXT',  perm: serviceOnly(['Straż Miejska']), topic: 'Czat Straży Miejskiej' },
        { name: '🛡️ Dyżur SM',  type: 'GUILD_VOICE', perm: serviceOnly(['Straż Miejska']) },
      ],
    },

    // ── LOGI ────────────────────────────────────────────────────────────────
    {
      name: '📝 ──── Logi ────', type: 'GUILD_CATEGORY',
      perm: staffOnly(),
      children: [
        { name: '🤖│logi-bota',          type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Automatyczne logi bota' },
        { name: '👥│logi-członków',      type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Dołączenia / opuszczenia serwera' },
        { name: '✏️│logi-nicków',        type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Zmiany nicków i avatarów' },
        { name: '🗑️│logi-wiadomości',   type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Usunięte i edytowane wiadomości' },
        { name: '🔨│logi-moderacji',     type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Warny, bany, kicke, mute' },
        { name: '🎫│logi-ticketów',      type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Historia ticketów' },
        { name: '🚗│logi-pojazdów',      type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Rejestracje i zmiany pojazdów' },
        { name: '🔊│logi-głosowe',       type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Wejścia/wyjścia z kanałów głosowych' },
      ],
    },

    // ── STAFF ───────────────────────────────────────────────────────────────
    {
      name: '🛡️ ──── STAFF ────', type: 'GUILD_CATEGORY',
      perm: staffOnly(),
      children: [
        { name: '📢│ogłoszenia-staffu',  type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Ogłoszenia wewnętrzne staffu' },
        { name: '💬│staff-ogólny',       type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Ogólny czat staffu' },
        { name: '👑│host-chat',          type: 'GUILD_TEXT',  perm: only(['Host','Administrator','Co-Owner','Owner']), topic: 'Czat Hostów i wyżej' },
        { name: '🔨│mod-chat',           type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Czat moderatorów' },
        { name: '👥│hr-chat',            type: 'GUILD_TEXT',  perm: only(['HR','Administrator','Co-Owner','Owner']), topic: 'Czat HR — nabory, podania' },
        { name: '🤖│bot-komendy',        type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Testowanie i konfiguracja bota' },
        { name: '📋│notatki-staffu',     type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Notatki, przypomnienia, sprawy w toku' },
        { name: '⚠️│warny-i-bany',       type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Rejestr kar moderacyjnych' },
        { name: '📖│regulamin-staffu',   type: 'GUILD_TEXT',  perm: staffOnly(), topic: 'Regulamin i zasady pracy staffu' },
        { name: '🔊 Staff Voice',        type: 'GUILD_VOICE', perm: staffOnly() },
        { name: '🏛️ Spotkanie Staffu',  type: 'GUILD_VOICE', perm: staffOnly() },
      ],
    },
  ];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Greenville RP — Konfiguracja serwera Discord\n');

  // 1. Pobierz aktualny stan
  console.log('📡 Pobieranie aktualnego stanu serwera...');
  const guild = await api('GET', `/guilds/${GUILD_ID}?with_counts=true`);
  console.log(`✅ Serwer: ${guild.name} (${guild.approximate_member_count} członków)\n`);

  const channels = await api('GET', `/guilds/${GUILD_ID}/channels`);
  const roles     = await api('GET', `/guilds/${GUILD_ID}/roles`);
  const everyoneRole = roles.find(r => r.name === '@everyone');

  // 2. Usuń istniejące kanały (poza systemowymi)
  console.log(`🗑️  Usuwanie ${channels.length} istniejących kanałów...`);
  for (const ch of channels) {
    try {
      await api('DELETE', `/channels/${ch.id}`);
      process.stdout.write('.');
      await delay(300);
    } catch (e) {
      process.stdout.write('x');
    }
  }
  console.log('\n');

  // 3. Usuń istniejące role (poza @everyone i zarządzanymi przez boty)
  const deletableRoles = roles.filter(r =>
    r.name !== '@everyone' && !r.managed && r.id !== guild.id
  );
  console.log(`🗑️  Usuwanie ${deletableRoles.length} istniejących ról...`);
  for (const r of deletableRoles) {
    try {
      await api('DELETE', `/guilds/${GUILD_ID}/roles/${r.id}`);
      process.stdout.write('.');
      await delay(300);
    } catch (e) {
      process.stdout.write('x');
    }
  }
  console.log('\n');

  // 4. Twórz nowe role
  console.log('🎭 Tworzenie ról...');
  const createdRoles = {};
  for (const cfg of ROLES) {
    try {
      const role = await api('POST', `/guilds/${GUILD_ID}/roles`, {
        name: cfg.name, color: cfg.color, hoist: cfg.hoist, mentionable: cfg.mentionable,
      });
      createdRoles[cfg.name] = role;
      console.log(`  ✅ @${role.name}`);
      await delay(400);
    } catch (e) {
      console.log(`  ❌ ${cfg.name}: ${e.message}`);
    }
  }
  console.log();

  // 5. Twórz kanały
  const structure = buildStructure(createdRoles, everyoneRole);
  const TYPE_MAP = {
    GUILD_TEXT:     0,
    GUILD_VOICE:    2,
    GUILD_CATEGORY: 4,
  };

  console.log('📁 Tworzenie struktury kanałów...');
  for (const cat of structure) {
    try {
      const catBody = {
        name: cat.name,
        type: TYPE_MAP[cat.type],
      };
      if (cat.perm) catBody.permission_overwrites = cat.perm;

      const category = await api('POST', `/guilds/${GUILD_ID}/channels`, catBody);
      console.log(`\n  📁 ${category.name}`);
      await delay(400);

      for (const child of (cat.children || [])) {
        try {
          const chBody = {
            name:   child.name,
            type:   TYPE_MAP[child.type] ?? 0,
            parent_id: category.id,
          };
          if (child.topic) chBody.topic = child.topic;
          if (child.limit) chBody.user_limit = child.limit;
          if (child.perm)  chBody.permission_overwrites = child.perm;
          else if (cat.perm) chBody.permission_overwrites = cat.perm;

          await api('POST', `/guilds/${GUILD_ID}/channels`, chBody);
          process.stdout.write(`    ✅ ${child.name}\n`);
          await delay(350);
        } catch (e) {
          console.log(`    ❌ ${child.name}: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`  ❌ Kategoria ${cat.name}: ${e.message}`);
    }
  }

  // 6. Edytuj ustawienia serwera
  console.log('\n⚙️  Aktualizacja ustawień serwera...');
  try {
    await api('PATCH', `/guilds/${GUILD_ID}`, {
      name: 'Greenville RP',
      description: 'Największy polski serwer Roleplay na Roblox. Weryfikacja, sesje, służby, pojazdy i więcej!',
      verification_level: 1,        // LOW — email verified
      default_message_notifications: 1, // only mentions
      preferred_locale: 'pl',
    });
    console.log('  ✅ Ustawienia serwera zaktualizowane');
  } catch (e) {
    console.log(`  ❌ Ustawienia: ${e.message}`);
  }

  console.log('\n🎉 Struktura serwera Discord gotowa!');
  console.log('➡️  Teraz uruchom /setup w bocie aby wypełnić kanały embedami.\n');
}

main().catch(e => {
  console.error('\n💥 Krytyczny błąd:', e.message);
  process.exit(1);
});
