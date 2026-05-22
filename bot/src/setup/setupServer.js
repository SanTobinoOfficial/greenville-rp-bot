// setupServer.js — tworzy pełną strukturę serwera AURORA Greenville RP
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
  // ─── Job roles (one per employment position) ────────────────────────────────
  { name: 'Dyspozytornia',                color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Burger Knight',                color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Burgerhaus',                   color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Hunty's Pizza Palace",         color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Home Barn American Grill',     color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Bill's Diner",                 color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Fiesta-Rodeo',                 color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Ol' Texas",                    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'The Red Chopstick',            color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Taco Castillo',                color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Timberwolf Drive In',          color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Ice Cream Station',            color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Superwich',                    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Holey Smokes',                 color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'British Fish & Chips',         color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Brookmere Brew',               color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Caffeine Street',              color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Kat's Kafe",                   color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Leo's Cafe",                   color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Bobahaus',                     color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Crispi Cookies',               color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Bread Shack',                  color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'The Grind',                    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Bulk Priced Food Shoppe',      color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Connor's",                     color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Farnsworths',                  color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'GVPS',                         color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Just Buy',                     color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Quick Dollar',                 color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Visitor's",                    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Nerd Squad',                   color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Verwire',                      color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Denver Atwood',                color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'NextStop',                     color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Brookmere Autos',              color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Celestial Dealership',         color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Ron Rivers Auto Group',        color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Roadmap Dealership',           color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Gary's Collision",             color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Ignition Motor Parts',         color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Tires+',                       color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'TruckPlanet',                  color: 0x94A3B8, hoist: false, mentionable: true },
  { name: "Dom's Service",                color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Rapid Wash',                   color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Credit Union',                 color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Fox Mountain',                 color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Allen Insurance',              color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'DMV',                          color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Greenville Town Hall',         color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Horton Village Hall',          color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Heist Crew',                   color: 0xEF4444, hoist: false, mentionable: true },
  { name: 'Sahara Delivery',              color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'School Bus Driver',            color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'GV Transit Bus Driver',        color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'The Twist',                    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Greenville Theater',           color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Visit 24/7 Motel',             color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Teacher',                      color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Driving Experience Center',    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Daycare',                      color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Librarian',                    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Heritage Animal Hospital',     color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Lifeguard',                    color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Factory Pulse',                color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Farmer',                       color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Enderson Cleaners',            color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'HeenerG',                      color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Beyond Beauty',               color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Gas Station Clerk',            color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Student',                      color: 0x94A3B8, hoist: false, mentionable: true },
  { name: 'Karate Wisconsin',             color: 0x94A3B8, hoist: false, mentionable: true },
  // ─── Special civilian roles ────────────────────────────────────────────────
  { name: 'Właściciel Firmy', color: 0xF59E0B, hoist: true,  mentionable: true  },
  // ─── Service roles ─────────────────────────────────────────────────────────
  { name: 'Taksówkarz',       color: 0xEAB308, hoist: false, mentionable: true  },
  { name: 'Security Guard',  color: 0x4B5563, hoist: false, mentionable: true  },
  { name: 'Park Ranger',     color: 0x16A34A, hoist: false, mentionable: true  },
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
        { name: '🎉│przyloty',          type: 0, perm: readOnly(STAFF),   topic: 'Powitania nowych członków serwera' },
        { name: '🛫│odloty',            type: 0, perm: readOnly(STAFF),   topic: 'Pożegnania opuszczających serwer' },
        { name: '📢│ogłoszenia',        type: 0, perm: readOnly(STAFF), topic: 'Oficjalne ogłoszenia serwera AURORA Greenville RP' },
        { name: '❗│regulamin',         type: 0, perm: readOnly(),       topic: 'Regulamin serwera — przeczytaj przed weryfikacją' },
        { name: '📖│słownik-rp',       type: 0, perm: readOnly(),       topic: 'Pojęcia RP: FRP, NLR, metagaming i inne' },
        { name: '🗺️│o-aurora',         type: 0, perm: readOnly(),       topic: 'Informacje o mapie i lokacjach w AURORA' },
        { name: '🔔│rola-powiadomień',  type: 0, perm: readOnly(),       topic: 'Kliknij przycisk aby otrzymywać powiadomienia o sesjach' },
        { name: '🏆│rankingi',          type: 0, perm: readOnly(STAFF),  topic: 'Rankingi graczy i służb' },
        { name: '🗳️│ankiety',          type: 0, perm: readOnly(STAFF),  topic: 'Ankiety i głosowania społeczności' },
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
        { name: '🎓│wyniki-egzaminów', type: 0, perm: readOnly(STAFF), topic: 'Wyniki egzaminów na prawo jazdy' },
        { name: '📜│moje-mandaty',     type: 0, perm: memberOnly(), topic: 'Sprawdź swoje mandaty /mandaty lista' },
        { name: '📱│telefon',          type: 0, perm: memberOnly(), topic: 'Logi SMS i połączeń RP — system telefoniczny' },
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
      name: '⚖️ ──── Zasady & Kary ────', type: 4,
      children: [
        { name: '⚖️│taryfikator', type: 0, perm: readOnly(), topic: 'Taryfikator kar Discord i RP — pełna lista sankcji' },
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
      name: '🔐 ──── Security Guard ────', type: 4, perm: serviceOnly(['Security Guard']),
      children: [
        { name: '💬│security-czat',    type: 0, perm: serviceOnly(['Security Guard']), topic: 'Czat Security Guard — wewnętrzna komunikacja' },
        { name: '📋│raporty-security', type: 0, perm: serviceOnly(['Security Guard']), topic: 'Raporty zdarzeń i interwencji' },
        { name: '🔐 Dyżur Security',   type: 2, perm: serviceOnly(['Security Guard']) },
      ],
    },
    {
      name: '🌲 ──── Park Ranger ────', type: 4, perm: serviceOnly(['Park Ranger']),
      children: [
        { name: '💬│ranger-czat',   type: 0, perm: serviceOnly(['Park Ranger']), topic: 'Czat Park Ranger — wewnętrzna komunikacja' },
        { name: '📋│raporty-parku', type: 0, perm: serviceOnly(['Park Ranger']), topic: 'Raporty z patroli i incydentów w parku' },
        { name: '🌲 Dyżur Ranger',  type: 2, perm: serviceOnly(['Park Ranger']) },
      ],
    },
    // ─── Civilian job categories ────────────────────────────────────────────────
    {
      name: '🍔 ──── Gastronomia ────', type: 4,
      children: [
        { name: '💬│gastronomia-ogólny',   type: 0, perm: only(['Właściciel Firmy',...STAFF,'Burger Knight','Burgerhaus',"Hunty's Pizza Palace",'Home Barn American Grill',"Bill's Diner",'Fiesta-Rodeo',"Ol' Texas",'The Red Chopstick','Taco Castillo','Timberwolf Drive In','Ice Cream Station','Superwich','Holey Smokes','British Fish & Chips']), topic: 'Ogólny czat pracowników gastronomii' },
        { name: '💬│burger-knight',        type: 0, perm: only(['Właściciel Firmy',...STAFF,'Burger Knight']),                 topic: 'Kanał pracowników Burger Knight' },
        { name: '💬│burgerhaus',            type: 0, perm: only(['Właściciel Firmy',...STAFF,'Burgerhaus']),                   topic: 'Kanał pracowników Burgerhaus' },
        { name: '💬│huntys-pizza',          type: 0, perm: only(['Właściciel Firmy',...STAFF,"Hunty's Pizza Palace"]),         topic: "Kanał pracowników Hunty's Pizza Palace" },
        { name: '💬│home-barn-grill',       type: 0, perm: only(['Właściciel Firmy',...STAFF,'Home Barn American Grill']),     topic: 'Kanał pracowników Home Barn American Grill' },
        { name: '💬│fiesta-rodeo',          type: 0, perm: only(['Właściciel Firmy',...STAFF,'Fiesta-Rodeo']),                 topic: 'Kanał pracowników Fiesta-Rodeo' },
        { name: '💬│taco-castillo',         type: 0, perm: only(['Właściciel Firmy',...STAFF,'Taco Castillo']),                topic: 'Kanał pracowników Taco Castillo' },
        { name: '💬│holey-smokes',          type: 0, perm: only(['Właściciel Firmy',...STAFF,'Holey Smokes']),                 topic: 'Kanał pracowników Holey Smokes' },
        { name: '💬│superwich',             type: 0, perm: only(['Właściciel Firmy',...STAFF,'Superwich']),                    topic: 'Kanał pracowników Superwich' },
        { name: '💬│british-fish-chips',    type: 0, perm: only(['Właściciel Firmy',...STAFF,'British Fish & Chips']),         topic: 'Kanał pracowników British Fish & Chips' },
        { name: '💬│inne-gastro',           type: 0, perm: only(['Właściciel Firmy',...STAFF,"Bill's Diner","Ol' Texas",'The Red Chopstick','Timberwolf Drive In','Ice Cream Station']), topic: "Bill's Diner / Ol' Texas / Red Chopstick / Timberwolf / Ice Cream" },
      ],
    },
    {
      name: '☕ ──── Kawiarnie ────', type: 4,
      children: [
        { name: '💬│kawiarnie-ogólny',   type: 0, perm: only(['Właściciel Firmy',...STAFF,'Brookmere Brew','Caffeine Street',"Kat's Kafe","Leo's Cafe",'Bobahaus','Crispi Cookies','Bread Shack','The Grind']), topic: 'Ogólny czat pracowników kawiarni' },
        { name: '💬│brookmere-brew',     type: 0, perm: only(['Właściciel Firmy',...STAFF,'Brookmere Brew']),     topic: 'Kanał pracowników Brookmere Brew' },
        { name: '💬│caffeine-street',    type: 0, perm: only(['Właściciel Firmy',...STAFF,'Caffeine Street']),    topic: 'Kanał pracowników Caffeine Street' },
        { name: '💬│the-grind',          type: 0, perm: only(['Właściciel Firmy',...STAFF,'The Grind']),          topic: 'Kanał pracowników The Grind' },
        { name: '💬│inne-kawiarnie',     type: 0, perm: only(['Właściciel Firmy',...STAFF,"Kat's Kafe","Leo's Cafe",'Bobahaus','Crispi Cookies','Bread Shack']), topic: "Kat's Kafe / Leo's Cafe / Bobahaus / Crispi Cookies / Bread Shack" },
      ],
    },
    {
      name: '🛒 ──── Handel ────', type: 4,
      children: [
        { name: '💬│handel-ogólny',        type: 0, perm: only(['Właściciel Firmy',...STAFF,'Bulk Priced Food Shoppe',"Connor's",'Farnsworths','GVPS','Just Buy','Quick Dollar',"Visitor's",'Nerd Squad','Verwire','Denver Atwood','NextStop']), topic: 'Ogólny czat pracowników handlu' },
        { name: '💬│gvps',                  type: 0, perm: only(['Właściciel Firmy',...STAFF,'GVPS']),                       topic: 'Kanał kurierów Greenville Postal Service' },
        { name: '💬│connors',               type: 0, perm: only(['Właściciel Firmy',...STAFF,"Connor's"]),                   topic: "Kanał pracowników Connor's" },
        { name: '💬│just-buy',              type: 0, perm: only(['Właściciel Firmy',...STAFF,'Just Buy']),                   topic: 'Kanał pracowników Just Buy' },
        { name: '💬│inne-handel',           type: 0, perm: only(['Właściciel Firmy',...STAFF,'Bulk Priced Food Shoppe','Farnsworths','Quick Dollar',"Visitor's",'Nerd Squad','Verwire','Denver Atwood','NextStop']), topic: 'Pozostałe sklepy detaliczne' },
      ],
    },
    {
      name: '🚗 ──── Motoryzacja ────', type: 4,
      children: [
        { name: '💬│moto-ogólny',          type: 0, perm: only(['Właściciel Firmy',...STAFF,'Brookmere Autos','Celestial Dealership','Ron Rivers Auto Group','Roadmap Dealership',"Gary's Collision",'Ignition Motor Parts','Tires+','TruckPlanet',"Dom's Service",'Rapid Wash']), topic: 'Ogólny czat pracowników motoryzacji' },
        { name: '💬│dealerzy',             type: 0, perm: only(['Właściciel Firmy',...STAFF,'Brookmere Autos','Celestial Dealership','Ron Rivers Auto Group','Roadmap Dealership']), topic: 'Czat dealerzy samochodów' },
        { name: '💬│warsztaty',            type: 0, perm: only(['Właściciel Firmy',...STAFF,"Gary's Collision",'Ignition Motor Parts','Tires+','TruckPlanet',"Dom's Service",'Rapid Wash']), topic: 'Czat serwisów i warsztatów' },
      ],
    },
    {
      name: '🚕 ──── Transport Cywilny ────', type: 4,
      children: [
        { name: '💬│taksówkarze',          type: 0, perm: only(['Właściciel Firmy',...STAFF,'Taksówkarz']),             topic: 'Kanał taksówkarzy' },
        { name: '💬│sahara-delivery',      type: 0, perm: only(['Właściciel Firmy',...STAFF,'Sahara Delivery']),         topic: 'Kanał kurierów Sahara Delivery' },
        { name: '💬│gv-transit',           type: 0, perm: only(['Właściciel Firmy',...STAFF,'GV Transit Bus Driver']),   topic: 'Kanał kierowców GV Transit' },
        { name: '💬│school-bus',           type: 0, perm: only(['Właściciel Firmy',...STAFF,'School Bus Driver']),       topic: 'Kanał kierowców szkolnych' },
      ],
    },
    {
      name: '🏛️ ──── Administracja & Finanse ────', type: 4,
      children: [
        { name: '💬│admin-ogólny',         type: 0, perm: only(['Właściciel Firmy',...STAFF,'DMV','Greenville Town Hall','Horton Village Hall','Credit Union','Fox Mountain','Allen Insurance']), topic: 'Ogólny czat administracji i finansów' },
        { name: '💬│dmv',                   type: 0, perm: only(['Właściciel Firmy',...STAFF,'DMV']),                     topic: 'Kanał pracowników DMV' },
        { name: '💬│town-hall',             type: 0, perm: only(['Właściciel Firmy',...STAFF,'Greenville Town Hall','Horton Village Hall']), topic: 'Czat urzędników miejskich' },
        { name: '💬│finanse',               type: 0, perm: only(['Właściciel Firmy',...STAFF,'Credit Union','Fox Mountain','Allen Insurance']), topic: 'Czat pracowników banków i ubezpieczeń' },
      ],
    },
    {
      name: '📚 ──── Edukacja & Zdrowie ────', type: 4,
      children: [
        { name: '💬│edukacja',             type: 0, perm: only(['Właściciel Firmy',...STAFF,'Teacher','Driving Experience Center','Daycare','Librarian','Student','Karate Wisconsin']), topic: 'Czat pracowników edukacji' },
        { name: '💬│zdrowie',              type: 0, perm: only(['Właściciel Firmy',...STAFF,'Heritage Animal Hospital','Lifeguard']), topic: 'Czat służb zdrowia i lifeguardów' },
      ],
    },
    {
      name: '⚙️ ──── Usługi & Przemysł ────', type: 4,
      children: [
        { name: '💬│uslugi-ogólny',        type: 0, perm: only(['Właściciel Firmy',...STAFF,'Enderson Cleaners','HeenerG','Beyond Beauty','Gas Station Clerk','Factory Pulse','Farmer']), topic: 'Ogólny czat pracowników usług i przemysłu' },
        { name: '💬│heenerg',              type: 0, perm: only(['Właściciel Firmy',...STAFF,'HeenerG']),                  topic: 'Kanał pracowników HeenerG' },
        { name: '💬│inne-uslugi',          type: 0, perm: only(['Właściciel Firmy',...STAFF,'Enderson Cleaners','Beyond Beauty','Gas Station Clerk']), topic: 'Cleaners / Beauty / Gas Station' },
        { name: '💬│przemysl-rolnictwo',   type: 0, perm: only(['Właściciel Firmy',...STAFF,'Factory Pulse','Farmer']),   topic: 'Czat fabryki i farmy' },
      ],
    },
    {
      name: '🎭 ──── Rozrywka ────', type: 4,
      children: [
        { name: '💬│rozrywka-ogólny',      type: 0, perm: only(['Właściciel Firmy',...STAFF,'The Twist','Greenville Theater','Visit 24/7 Motel']), topic: 'Ogólny czat pracowników rozrywki' },
        { name: '💬│the-twist',            type: 0, perm: only(['Właściciel Firmy',...STAFF,'The Twist']),                topic: 'Kanał pracowników The Twist' },
        { name: '💬│theater-motel',        type: 0, perm: only(['Właściciel Firmy',...STAFF,'Greenville Theater','Visit 24/7 Motel']), topic: 'Theater i Motel' },
      ],
    },
    {
      name: '💀 ──── Heist Crew ────', type: 4, perm: only(['Heist Crew',...STAFF]),
      children: [
        { name: '💬│heist-czat',           type: 0, perm: only(['Heist Crew',...STAFF]),                                  topic: 'Prywatny czat Heist Crew — tylko dla ekipy' },
        { name: '🗓️ Planowanie Napadu',    type: 2, perm: only(['Heist Crew',...STAFF]) },
      ],
    },
    // ─── Prywatne prace (Właściciel Firmy) ─────────────────────────────────────
    {
      name: '🏢 ──── Prywatne Prace ────', type: 4, perm: only(['Właściciel Firmy',...STAFF]),
      children: [
        { name: '📋│oferty-prywatne',      type: 0, perm: only(['Właściciel Firmy',...STAFF]),                            topic: 'Oferty prywatnych prac — tylko Właściciele Firm' },
        { name: '💬│właściciele-firm',     type: 0, perm: only(['Właściciel Firmy',...STAFF]),                            topic: 'Czat właścicieli firm' },
        { name: '🏢 Spotkanie Firmowe',    type: 2, perm: only(['Właściciel Firmy',...STAFF]) },
      ],
    },
    // ──────────────────────────────────────────────────────────────────────────
    {
      name: '📝 ──── Logi ────', type: 4, perm: staffOnly(),
      children: [
        { name: '🤖│logi-bota',         type: 0, perm: staffOnly(), topic: 'Automatyczne logi bota' },
        { name: '👥│logi-członków',     type: 0, perm: staffOnly(), topic: 'Dołączenia / opuszczenia' },
        { name: '✏️│logi-nicków',       type: 0, perm: staffOnly(), topic: 'Zmiany nicków i avatarów' },
        { name: '📋│logi-ról',          type: 0, perm: staffOnly(), topic: 'Zmiany ról członków serwera' },
        { name: '🗑️│logi-wiadomości',  type: 0, perm: staffOnly(), topic: 'Usunięte i edytowane wiadomości' },
        { name: '🔨│logi-moderacji',    type: 0, perm: staffOnly(), topic: 'Warny, bany, kicke, mute' },
        { name: '🎫│logi-ticketów',     type: 0, perm: staffOnly(), topic: 'Historia ticketów' },
        { name: '🚗│logi-pojazdów',     type: 0, perm: staffOnly(), topic: 'Rejestracje i zmiany pojazdów' },
        { name: '⚖️│logi-rp',           type: 0, perm: staffOnly(), topic: 'Logi akcji RP: mandaty, areszty, nakazy' },
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

async function setupServer(guild, progress) {
  const report = progress ?? (() => {});
  logger.info('🚀 setupServer: start');

  const existingChannels = await guild.channels.fetch();
  const existingRoles    = await guild.roles.fetch();
  const everyone         = guild.roles.everyone;

  // Usuń kanały
  await report(`🗑️ Usuwanie ${existingChannels.size} istniejących kanałów...`);
  for (const [, ch] of existingChannels) {
    await ch.delete('Setup — czyste konto').catch(() => {});
    await delay(350);
  }

  // Usuń role
  const deletable = [...existingRoles.values()].filter(r => r.name !== '@everyone' && !r.managed);
  await report(`🗑️ Usuwanie ${deletable.length} istniejących ról...`);
  for (const r of deletable) {
    await r.delete('Setup — czyste konto').catch(() => {});
    await delay(350);
  }

  // Twórz role — w odwróconej kolejności (Owner pierwszy, Niezweryfikowany ostatni)
  // Discord wstawia każdą nową rolę na pozycję 1, przesuwając poprzednie w górę.
  // Dlatego pierwsza stworzona rola ląduje najwyżej — tworzymy od najważniejszej do najniższej.
  await report(`🎭 Tworzenie ${ROLE_DEFS.length} ról...`);
  const createdRoles = {};
  for (const def of [...ROLE_DEFS].reverse()) {
    try {
      const role = await guild.roles.create({
        name: def.name, color: def.color,
        hoist: def.hoist, mentionable: def.mentionable,
        reason: 'Setup AURORA Greenville RP',
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
  await report(`📁 Tworzenie struktury kanałów (${structure.length} kategorii)...`);

  const createdChannels = {};
  let channelCount = 0;

  for (const cat of structure) {
    try {
      const category = await guild.channels.create({
        name: cat.name,
        type: cat.type,
        permissionOverwrites: cat.perm ?? [],
        reason: 'Setup AURORA Greenville RP',
      });
      createdChannels[cat.name] = category;
      logger.info(`  📁 ${category.name}`);
      await delay(400);

      for (const child of (cat.children ?? [])) {
        try {
          const channel = await guild.channels.create({
            name:  child.name,
            type:  child.type,
            parent: category,
            topic: child.topic,
            userLimit: child.limit,
            permissionOverwrites: child.perm ?? cat.perm ?? [],
            reason: 'Setup AURORA Greenville RP',
          });
          createdChannels[child.name] = channel;
          channelCount++;
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
  return { roles: createdRoles, channels: createdChannels };
}

module.exports = { setupServer };
