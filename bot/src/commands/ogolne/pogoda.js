// Komenda /pogoda — prognoza pogody RP w Greenville
// Generuje deterministyczną pogodę RP spójną dla wszystkich graczy podczas sesji.
// Seed: ID aktywnej sesji (stały na całą sesję) lub data dzienna (brak sesji).
// Brak zapisu do bazy — wyłącznie odczyt (Session.status=ONGOING).
// Dostępna dla: wszyscy gracze

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

// ── Seeded PRNG ───────────────────────────────────────────────────────────────

/**
 * Hashuje ciąg znaków do liczby uint32.
 * Deterministyczne: ten sam input → ten sam output zawsze.
 * Oparte na cyrb53 (zredukowane do 32-bitów dla uproszczenia).
 */
function hashSeed(str) {
  let h1 = 0xdeadbeef >>> 0;
  let h2 = 0x41c6ce57 >>> 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = (Math.imul(h1 ^ c, 2654435761)) >>> 0;
    h2 = (Math.imul(h2 ^ c, 1597334677)) >>> 0;
  }
  h1 = (Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)) >>> 0;
  h2 = (Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)) >>> 0;
  return (h1 ^ h2) >>> 0;
}

/**
 * Zwraca funkcję pseudo-losową z podanym seedem (mulberry32).
 * Każde wywołanie przesuwa stan i zwraca liczbę z [0, 1).
 */
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Losuje element tablicy przy użyciu seeded RNG. */
function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Tabele pogody ─────────────────────────────────────────────────────────────

const CLOUD_COVER = [
  { label: 'Bezchmurnie',           emoji: '☀️',  cloudFactor: 0 },
  { label: 'Małe zachmurzenie',      emoji: '🌤️', cloudFactor: 1 },
  { label: 'Częściowo zachmurzone',  emoji: '⛅',  cloudFactor: 2 },
  { label: 'Zachmurzone',            emoji: '🌥️', cloudFactor: 3 },
  { label: 'Całkowite zachmurzenie', emoji: '☁️',  cloudFactor: 4 },
];

const WIND_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Opady — każdy wariant ma minimalny wymagany poziom zachmurzenia (cloudFactor)
const PRECIPITATION = [
  { label: 'Brak opadów',  emoji: '✅', minCloud: 0 },
  { label: 'Brak opadów',  emoji: '✅', minCloud: 0 },
  { label: 'Brak opadów',  emoji: '✅', minCloud: 0 },
  { label: 'Mżawka',       emoji: '🌦️', minCloud: 2 },
  { label: 'Lekki deszcz', emoji: '🌧️', minCloud: 3 },
  { label: 'Deszcz',       emoji: '🌧️', minCloud: 3 },
  { label: 'Ulewa',        emoji: '⛈️', minCloud: 4 },
];

const VISIBILITY = [
  'Bardzo dobra (ponad 10 km)',
  'Dobra (5–10 km)',
  'Dobra (5–10 km)',
  'Umiarkowana (2–5 km)',
  'Ograniczona (poniżej 2 km)',
];

// Narracyjne opisy RP — podkreślają atmosferę sesji
const RP_FLAVORS = [
  'Idealne warunki do patrolu ulicznego. Widoczność bez zastrzeżeń.',
  'Typowa pogoda dla Greenville o tej porze. Kierowcy — zachowajcie ostrożność.',
  'Służby pracują w normalnych warunkach. Brak ostrzeżeń meteorologicznych.',
  'Warunki mogą wpłynąć na ruch drogowy — zalecana ostrożność za kierownicą.',
  'Meteorolodzy nie przewidują gwałtownych zmian. Wygodna sesja przed nami.',
  'Mieszkańcy Greenville przygotowali się na typową dla regionu aurę.',
  'Lokalna stacja pogodowa potwierdza brak alertów. Spokojny dzień przed nami.',
  'Pogoda sprzyja aktywności na zewnątrz. Wyjdź na ulice — to dobry czas na RP!',
  'Standardowe warunki atmosferyczne. Nic nadzwyczajnego na niebie nad Greenville.',
  'Ciągłe zachmurzenie utrzymuje się nad okolicą. Typowy dzień w tym regionie.',
];

// ── Generator pogody ──────────────────────────────────────────────────────────

/**
 * Generuje kompletny raport pogody na podstawie ciągu seed.
 * Identyczny seed → identyczna pogoda (deterministyczne).
 * @param {string} seedStr - unikalny ciąg dla bieżącej sesji lub dnia
 * @returns {object} raport pogody gotowy do wyświetlenia
 */
function generateWeather(seedStr) {
  const rng = makeRng(hashSeed(seedStr));

  // Temperatura: 4–30°C (zakres RP dla Greenville, klimat umiarkowany)
  const tempRaw  = Math.floor(rng() * 27) + 4;          // 4..30°C
  const tempFeel = tempRaw + Math.floor(rng() * 5) - 2; // ±2°C odczuwalna

  // Zachmurzenie
  const cloud = pick(rng, CLOUD_COVER);

  // Wiatr
  const windDir   = pick(rng, WIND_DIRECTIONS);
  const windSpeed = Math.floor(rng() * 44) + 2; // 2–45 km/h

  // Opady — tylko opcje pasujące do aktualnego zachmurzenia
  const precipPool = PRECIPITATION.filter(p => p.minCloud <= cloud.cloudFactor);
  const precip = pick(rng, precipPool.length > 0 ? precipPool : PRECIPITATION.slice(0, 3));

  // Widoczność — gorsza przy opadach lub silnym zachmurzeniu
  const visPool = cloud.cloudFactor >= 3
    ? VISIBILITY.slice(1)          // min. "Dobra" przy pełnym zachmurzeniu
    : VISIBILITY;
  const vis = pick(rng, visPool);

  // Narracja RP
  const flavor = pick(rng, RP_FLAVORS);

  return { tempRaw, tempFeel, cloud, windDir, windSpeed, precip, vis, flavor };
}

// ── Kolor embeda ──────────────────────────────────────────────────────────────

function getEmbedColor(w) {
  if (w.precip.label === 'Ulewa')          return 0x4A4E8A; // ciemnoniebieski — burza
  if (w.precip.label === 'Deszcz')         return 0x5B93C4; // niebieski — deszcz
  if (w.precip.label === 'Lekki deszcz')   return 0x7BAED6; // jasnoniebieski — lekki deszcz
  if (w.precip.label === 'Mżawka')         return 0x8BB8DC; // blady niebieski — mżawka
  if (w.cloud.cloudFactor <= 1)            return 0xFEE75C; // żółty — słońce
  if (w.cloud.cloudFactor === 2)           return 0x87CEEB; // błękitny — półchmurno
  return COLORS.primary;                                     // domyślny — zachmurzone
}

// ── Komenda ───────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pogoda')
    .setDescription('Sprawdź aktualną pogodę RP w Greenville — spójna dla całej sesji'),

  async execute(interaction, client, prisma) {
    // Odpowiedź publiczna — wszyscy widzą pogodę IC
    await interaction.deferReply({ ephemeral: false });

    // Szukaj aktywnej sesji RP (ONGOING) — jej ID służy jako seed
    const activeSession = await prisma.session
      .findFirst({ where: { status: 'ONGOING' } })
      .catch(() => null);

    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // Seed: ID aktywnej sesji (spójne przez całą sesję) lub data dzienna (fallback)
    const seedStr = activeSession
      ? `session-${activeSession.id}`
      : `daily-${dateKey}`;

    const w = generateWeather(seedStr);

    // Opis źródła prognozy do stopki
    const sourceNote = activeSession
      ? `Prognoza dla aktywnej sesji RP · ID sesji: ${activeSession.id.slice(0, 8)}`
      : `Prognoza dzienna (${dateKey}) — brak aktywnej sesji RP`;

    const embed = new EmbedBuilder()
      .setColor(getEmbedColor(w))
      .setTitle(`${w.cloud.emoji} Pogoda RP — Greenville`)
      .setDescription(`*${w.flavor}*`)
      .addFields(
        {
          name: '🌡️ Temperatura',
          value: `**${w.tempRaw}°C** (odczuwalna: ${w.tempFeel}°C)`,
          inline: true,
        },
        {
          name: `${w.cloud.emoji} Zachmurzenie`,
          value: w.cloud.label,
          inline: true,
        },
        {
          name: `${w.precip.emoji} Opady`,
          value: w.precip.label,
          inline: true,
        },
        {
          name: '💨 Wiatr',
          value: `**${w.windSpeed} km/h** z kierunku ${w.windDir}`,
          inline: true,
        },
        {
          name: '👁️ Widoczność',
          value: w.vis,
          inline: true,
        },
        {
          name: '🕐 Czas lokalny',
          value: `<t:${Math.floor(now.getTime() / 1000)}:T>`,
          inline: true,
        },
      )
      .setFooter({ text: `AURORA Greenville RP — ${sourceNote}` })
      .setTimestamp();

    logger.info(
      `/pogoda | ${interaction.user.tag} | ` +
      `seed: ${seedStr.slice(0, 24)} | ` +
      `${w.cloud.label} ${w.tempRaw}°C wiatr ${w.windSpeed}km/h ${w.windDir} ${w.precip.label}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
