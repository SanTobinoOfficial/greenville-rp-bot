// Komenda /me — akcja In-Character (RP)
// Opisuje czynność postaci widoczną publicznie na kanale
// Obsługa specjalna: wypadek samochodowy → losowe obrażenia RP (mechanic dla EMS)
// Dostępna dla: wszyscy gracze

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

// ── Słowa kluczowe sygnalizujące wypadek samochodowy ─────────────────────────
const ACCIDENT_KEYWORDS = [
  'wypadek', 'kolizja', 'zderzenie', 'zderzył', 'zderzyła', 'zderza',
  'wjechał', 'wjechała', 'wjeżdża', 'taranuje', 'taranował', 'taranowała',
  'rozbija', 'rozbiła', 'rozbił', 'potrąca', 'potrącił', 'potrąciła',
  'kraksa', 'dachuje', 'dachował', 'dachowała', 'stłuczka', 'uderza w',
  'uderzyła w', 'uderzył w', 'wbija', 'wbił', 'wbiła',
];

// ── Pula obrażeń RP przy wypadku (mechanic EMS) ───────────────────────────────
// null = brak obrażeń (ok. 35% szans)
const INJURY_POOL = [
  null, null, null, null, null, null, null, // 35% — brak obrażeń

  // Lekkie (30%)
  {
    emoji: '🟡',
    poziom: 'LEKKIE',
    opis: 'odczuwa ból głowy i ma drobne otarcia na rękach. Jest przytomna/y i może chodzić o własnych siłach.',
    kolor: 0xFEE75C,
  },
  {
    emoji: '🟡',
    poziom: 'LEKKIE',
    opis: 'ma powierzchowne skaleczenia twarzy i rąk po kontakcie ze szybą. Wymaga opatrunku.',
    kolor: 0xFEE75C,
  },
  {
    emoji: '🟡',
    poziom: 'LEKKIE',
    opis: 'odczuwa silny ból szyi po szarpnięciu (whiplash). Porusza się wolno i ostrożnie.',
    kolor: 0xFEE75C,
  },
  {
    emoji: '🟡',
    poziom: 'LEKKIE',
    opis: 'ma stłuczony bark i ból w klatce piersiowej po zaciśnięciu pasa. Nie wymaga natychmiastowej pomocy.',
    kolor: 0xFEE75C,
  },
  {
    emoji: '🟡',
    poziom: 'LEKKIE',
    opis: 'odczuwa zawroty głowy i lekki ból nogi. Wymaga chwili odpoczynku i podstawowej opieki.',
    kolor: 0xFEE75C,
  },
  {
    emoji: '🟡',
    poziom: 'LEKKIE',
    opis: 'ma krwawiące rozcięcie na czole i ból ramienia. Może mówić i jest zorientowana/y.',
    kolor: 0xFEE75C,
  },

  // Umiarkowane (20%)
  {
    emoji: '🟠',
    poziom: 'UMIARKOWANE',
    opis: 'ma podejrzenie stłuczenia żeber i krwawi z głowy. Oddech utrudniony — potrzebna interwencja EMS!',
    kolor: 0xFF6B00,
  },
  {
    emoji: '🟠',
    poziom: 'UMIARKOWANE',
    opis: 'doznała/ł urazu kolana i nie może samodzielnie wstać. Odczuwa silny ból — wzywając pomoc!',
    kolor: 0xFF6B00,
  },
  {
    emoji: '🟠',
    poziom: 'UMIARKOWANE',
    opis: 'ma widoczne obrażenia twarzy i prawdopodobnie złamany nadgarstek. Wymaga pomocy medycznej EMS.',
    kolor: 0xFF6B00,
  },
  {
    emoji: '🟠',
    poziom: 'UMIARKOWANE',
    opis: 'jest zdezorientowana/y, krwawi z nosa i ucha. Objaw możliwego wstrząsu mózgu — EMS niezbędne!',
    kolor: 0xFF6B00,
  },

  // Poważne (15%)
  {
    emoji: '🔴',
    poziom: 'POWAŻNE',
    opis: 'jest nieprzytomna/y z widocznymi obrażeniami głowy i klatki piersiowej. Natychmiastowy EMS — stan krytyczny!',
    kolor: 0xED4245,
  },
  {
    emoji: '🔴',
    poziom: 'POWAŻNE',
    opis: 'leży bez ruchu — podejrzenie urazu kręgosłupa. Zakaz poruszania poszkodowaną/ym bez EMS! Wzywaj pomoc!',
    kolor: 0xED4245,
  },
];

// ── Pomocnicza: wykryj wypadek w tekście akcji ───────────────────────────────
function detectAccident(akcja) {
  const lower = akcja.toLowerCase();
  return ACCIDENT_KEYWORDS.some(kw => lower.includes(kw));
}

// ── Pomocnicza: losuj obrażenie ──────────────────────────────────────────────
function rollInjury() {
  return INJURY_POOL[Math.floor(Math.random() * INJURY_POOL.length)] ?? null;
}

// ── Komenda ──────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('me')
    .setDescription('Opisz czynność swojej postaci (akcja IC/RP)')
    .addStringOption(opt =>
      opt
        .setName('akcja')
        .setDescription('Co robi Twoja postać? (np. "otwiera drzwi samochodu" lub "wysiada z wozu")')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(300)
    ),

  async execute(interaction, client, prisma) {
    // Odpowiedź publiczna — wszyscy widzą akcję IC
    await interaction.deferReply({ ephemeral: false });

    const akcja = interaction.options.getString('akcja').trim();

    // Pobierz postać gracza — potrzebujemy imienia i nazwiska IC
    const user = await prisma.user
      .findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      })
      .catch(() => null);

    const char = user?.character;
    const icName = char
      ? `${char.firstName} ${char.lastName}`
      : (interaction.member?.displayName ?? interaction.user.username);

    // Wykryj wypadek i ewentualnie losuj obrażenia
    const isAccident = detectAccident(akcja);
    const injury = isAccident ? rollInjury() : null;

    // ── Buduj embed ───────────────────────────────────────────────────────────
    const embedColor = injury ? injury.kolor : COLORS.rp;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setDescription(`*✨ **${icName}** ${akcja}*`)
      .setFooter({
        text: `${interaction.user.tag} • ${interaction.channel.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    // Pole obrażeń (tylko gdy wypadek + wylosowane obrażenie)
    if (injury) {
      embed.addFields({
        name: `${injury.emoji} Obrażenia RP — Poziom: ${injury.poziom}`,
        value:
          `Postać ${injury.opis}\n` +
          `> *Wynik losowy — mechanic EMS · pozostaw w RP lub wezwij \`/duty\` EMS*`,
        inline: false,
      });
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    logger.info(
      `/me | ${interaction.user.tag} (${icName}) | "${akcja}"` +
        (isAccident ? ` | wypadek → ${injury ? injury.poziom : 'bez obrażeń'}` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
