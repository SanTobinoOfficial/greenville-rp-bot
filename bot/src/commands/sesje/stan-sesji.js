// Komenda /stan-sesji — publiczny status bieżącej sesji RP
// Pokazuje peacetime, hosta, liczbę graczy, czas trwania i obowiązujące zasady.
// Dostępna dla: wszyscy (w tym niezweryfikowani — przydatne przed dołączeniem)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

// Konfiguracja trybów peacetime — spójna z /peacetime.js
const PEACETIME_INFO = {
  0: {
    label:  '✅ Normalny tryb — Brak Peacetime',
    color:  0x57F287,
    rules:  [
      '✅ Akcje kryminalne dozwolone zgodnie z regulaminem',
      '✅ Pościgi i ucieczki przed policją dozwolone',
      '✅ Wypadki mają pełne skutki RP (/me + EMS)',
      '✅ Limit prędkości FRP: 131 mph',
    ],
  },
  1: {
    label:  '⚠️ PEACETIME 1° — Zakaz Crime i ucieczki',
    color:  0xFEE75C,
    rules:  [
      '🚫 Zakaz organizowania akcji kryminalnych (napady, rozboje itp.)',
      '🚫 Zakaz ucieczki przed funkcjonariuszami policji',
      '✅ Normalny ruch drogowy i inne aktywności RP dozwolone',
    ],
  },
  2: {
    label:  '🚨 PEACETIME 2° — PT1° + Void wypadków + limit 70 mph',
    color:  0xED4245,
    rules:  [
      '🚫 Zakaz akcji kryminalnych (jak w PT 1°)',
      '🚫 Zakaz ucieczki przed policją (jak w PT 1°)',
      '🚫 Wypadki drogowe są void (brak skutków RP)',
      '🚫 Limit prędkości FRP: maksymalnie 70 mph',
    ],
  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stan-sesji')
    .setDescription('Sprawdź status bieżącej sesji RP — peacetime, host, gracze, zasady'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    // Szukaj aktywnej sesji (ONGOING), następnie planowanej (UPCOMING)
    const ongoingSession = await prisma.session
      .findFirst({
        where:   { status: 'ONGOING' },
        include: { signups: { select: { id: true } } },
      })
      .catch(() => null);

    const upcomingSession = ongoingSession
      ? null
      : await prisma.session
          .findFirst({
            where:   { status: 'UPCOMING', date: { gte: new Date() } },
            orderBy: { date: 'asc' },
            include: { signups: { select: { id: true } } },
          })
          .catch(() => null);

    const session = ongoingSession ?? upcomingSession;

    // ── Brak sesji ────────────────────────────────────────────────────────────
    if (!session) {
      const embed = new EmbedBuilder()
        .setColor(0x747F8D)
        .setTitle('🔴 Brak aktywnej sesji RP')
        .setDescription(
          'Aktualnie nie trwa żadna sesja RP i nie zaplanowano żadnej nadchodzącej.\n' +
          'Obserwuj kanał ogłoszeń sesji, aby wiedzieć kiedy pojawi się następna!'
        )
        .setFooter({ text: 'AURORA Greenville RP — Stan sesji' })
        .setTimestamp();

      logger.info(`/stan-sesji | ${interaction.user.tag} | brak sesji`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── Sesja znaleziona ──────────────────────────────────────────────────────
    const isOngoing      = session.status === 'ONGOING';
    const ptLevel        = isOngoing ? (session.peacetime ?? 0) : 0;
    const ptInfo         = PEACETIME_INFO[ptLevel] ?? PEACETIME_INFO[0];
    const signupCount    = session.signups?.length ?? 0;
    const startTs        = session.startedAt ?? session.date;
    const startUnix      = Math.floor(startTs.getTime() / 1000);
    const sessionShortId = session.id.slice(0, 8).toUpperCase();

    // ── Pobierz nick hosta (Discord) ─────────────────────────────────────────
    let hostMention = `\`${session.hostId}\``;
    try {
      const hostMember = await interaction.guild.members.fetch(session.hostId);
      hostMention = `${hostMember}`;
    } catch {
      // Fallback: ID
    }

    // ── Status badge ──────────────────────────────────────────────────────────
    const statusBadge = isOngoing ? '🟢 **SESJA TRWA**' : '🔵 **SESJA PLANOWANA**';
    const timeField   = isOngoing
      ? `Sesja trwa od <t:${startUnix}:R>\nRozpoczęto: <t:${startUnix}:T>`
      : `Zaplanowana na <t:${startUnix}:F>\nZaczyna się <t:${startUnix}:R>`;

    // ── Embed ─────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(isOngoing ? ptInfo.color : COLORS.primary)
      .setTitle(`🎪 Stan Sesji RP — ${statusBadge}`)
      .addFields(
        {
          name:   '⏱️ Czas',
          value:  timeField,
          inline: true,
        },
        {
          name:   '👥 Gracze',
          value:  `**${signupCount}** / ${session.maxPlayers} zapisanych`,
          inline: true,
        },
        {
          name:   '🎙️ Host',
          value:  hostMention,
          inline: true,
        },
      );

    // Opis sesji (opcjonalny)
    if (session.description) {
      embed.addFields({
        name:   '📋 Opis sesji',
        value:  session.description,
        inline: false,
      });
    }

    // Peacetime (tylko dla trwającej sesji)
    if (isOngoing) {
      embed.addFields({
        name:   ptInfo.label,
        value:  ptInfo.rules.join('\n'),
        inline: false,
      });
    }

    embed
      .setFooter({ text: `AURORA Greenville RP — Stan sesji | ID: ${sessionShortId}` })
      .setTimestamp();

    logger.info(
      `/stan-sesji | ${interaction.user.tag} | status: ${session.status} | ` +
      `PT: ${ptLevel} | gracze: ${signupCount}/${session.maxPlayers}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
