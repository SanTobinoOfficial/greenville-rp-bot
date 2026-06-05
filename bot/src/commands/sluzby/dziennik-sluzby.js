// Komenda /dziennik-sluzby — lista ostatnich dyżurów jako indywidualne sesje
// Różni się od /czas-sluzby (który pokazuje sumy) — tu każdy dyżur to osobny wpis
// Moje: własne sesje | gracza (Staff): sesje innego gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_META = {
  POLICJA:       { label: 'Policja',       emoji: '🚔', color: 0x003087 },
  EMS:           { label: 'EMS',           emoji: '🚑', color: 0xED4245 },
  STRAZ:         { label: 'Straż Pożarna', emoji: '🚒', color: 0xFEE75C },
  DOT:           { label: 'DOT',           emoji: '🚧', color: 0xFF7F00 },
  STRAZ_MIEJSKA: { label: 'Straż Miejska', emoji: '🛡️', color: 0x2ECC71 },
  TAKSOWKARZ:    { label: 'Taksówkarz',    emoji: '🚕', color: 0xF1C40F },
};

function formatMinutes(minutes) {
  if (minutes < 1) return '< 1 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Paruje kolejne ON_DUTY → OFF_DUTY wpisy w sesje
// Zwraca tablicę { service, startedAt, endedAt|null, minutes }
function pairSessions(logs) {
  const sessions = [];
  const openByService = {};

  for (const log of logs) {
    if (log.action === 'ON_DUTY') {
      openByService[log.service] = log.createdAt;
    } else if (log.action === 'OFF_DUTY' && openByService[log.service]) {
      const startedAt = openByService[log.service];
      const endedAt = log.createdAt;
      const minutes = Math.round((endedAt - startedAt) / 60_000);
      sessions.push({ service: log.service, startedAt, endedAt, minutes });
      delete openByService[log.service];
    }
  }

  // Dodaj aktywne (bez OFF_DUTY) jako otwarte sesje
  for (const [service, startedAt] of Object.entries(openByService)) {
    const minutes = Math.round((Date.now() - startedAt) / 60_000);
    sessions.push({ service, startedAt, endedAt: null, minutes });
  }

  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dziennik-sluzby')
    .setDescription('Wyświetl historię dyżurów jako listę indywidualnych sesji')
    .addSubcommand(sub =>
      sub
        .setName('moje')
        .setDescription('Twoje ostatnie sesje służby')
        .addStringOption(opt =>
          opt
            .setName('sluzba')
            .setDescription('Filtruj po służbie (domyślnie: wszystkie)')
            .setRequired(false)
            .addChoices(
              { name: '🚔 Policja',       value: 'POLICJA' },
              { name: '🚑 EMS',           value: 'EMS' },
              { name: '🚒 Straż Pożarna', value: 'STRAZ' },
              { name: '🚧 DOT',           value: 'DOT' },
              { name: '🛡️ Straż Miejska', value: 'STRAZ_MIEJSKA' },
              { name: '🚕 Taksówkarz',    value: 'TAKSOWKARZ' },
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('limit')
            .setDescription('Liczba sesji do wyświetlenia (1–20, domyślnie: 10)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('gracza')
        .setDescription('Sesje służby innego gracza (Staff+)')
        .addUserOption(opt =>
          opt.setName('gracz').setDescription('Gracz do sprawdzenia').setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('sluzba')
            .setDescription('Filtruj po służbie (domyślnie: wszystkie)')
            .setRequired(false)
            .addChoices(
              { name: '🚔 Policja',       value: 'POLICJA' },
              { name: '🚑 EMS',           value: 'EMS' },
              { name: '🚒 Straż Pożarna', value: 'STRAZ' },
              { name: '🚧 DOT',           value: 'DOT' },
              { name: '🛡️ Straż Miejska', value: 'STRAZ_MIEJSKA' },
              { name: '🚕 Taksówkarz',    value: 'TAKSOWKARZ' },
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('limit')
            .setDescription('Liczba sesji do wyświetlenia (1–20, domyślnie: 10)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    ),

  async execute(interaction, client, prisma) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'gracza' && !isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Staff może przeglądać dziennik służby innych graczy.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const targetDiscordUser =
      sub === 'gracza'
        ? interaction.options.getUser('gracz')
        : interaction.user;

    const serviceFilter = interaction.options.getString('sluzba') ?? null;
    const limit = interaction.options.getInteger('limit') ?? 10;

    const userDb = await prisma.user.findUnique({
      where: { discordId: targetDiscordUser.id },
      select: { id: true },
    });

    if (!userDb) {
      return interaction.editReply({
        content: `❌ ${sub === 'gracza' ? 'Ten gracz nie jest' : 'Nie jesteś'} zarejestrowany/a w systemie.`,
      });
    }

    // Pobierz ostatnie 200 wpisów (wystarczy do zparsowania ~100 sesji)
    const whereClause = { userId: userDb.id };
    if (serviceFilter) whereClause.service = serviceFilter;

    const logs = await prisma.dutyLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    if (logs.length === 0) {
      const filterLabel = serviceFilter ? ` dla służby **${SERVICE_META[serviceFilter]?.label}**` : '';
      return interaction.editReply({
        content: `📋 Brak wpisów służby${filterLabel} dla **${targetDiscordUser.tag}**.`,
      });
    }

    const sessions = pairSessions(logs);

    if (sessions.length === 0) {
      return interaction.editReply({
        content: '📋 Nie znaleziono żadnych zakończonych dyżurów.',
      });
    }

    const shown = sessions.slice(0, limit);
    const totalMinutesShown = shown.reduce((s, sess) => s + sess.minutes, 0);
    const hasActive = shown.some(s => s.endedAt === null);

    const lines = shown.map((sess, i) => {
      const meta = SERVICE_META[sess.service] ?? { emoji: '🔷', label: sess.service };
      const startTs = Math.floor(sess.startedAt.getTime() / 1000);
      const endStr = sess.endedAt
        ? `<t:${Math.floor(sess.endedAt.getTime() / 1000)}:t>`
        : '🟢 **trwa**';
      return (
        `\`${String(i + 1).padStart(2, ' ')}.\` ${meta.emoji} **${meta.label}** ` +
        `— <t:${startTs}:d> <t:${startTs}:t> → ${endStr} ` +
        `\`${formatMinutes(sess.minutes)}\``
      );
    });

    const serviceLabel = serviceFilter
      ? `${SERVICE_META[serviceFilter]?.emoji} ${SERVICE_META[serviceFilter]?.label}`
      : 'Wszystkie służby';

    const embedColor =
      serviceFilter && SERVICE_META[serviceFilter]
        ? SERVICE_META[serviceFilter].color
        : COLORS.info;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`📋 Dziennik Służby — ${targetDiscordUser.displayName}`)
      .setThumbnail(targetDiscordUser.displayAvatarURL())
      .setDescription(lines.join('\n'))
      .addFields({
        name: '📊 Podsumowanie',
        value: [
          `🔍 Filtr: **${serviceLabel}**`,
          `📌 Wyświetlono: **${shown.length}** z **${sessions.length}** sesji`,
          `⏱️ Łączny czas (pokazane): **${formatMinutes(totalMinutesShown)}**`,
          hasActive ? '🟢 Aktualnie na służbie' : '',
        ]
          .filter(Boolean)
          .join('\n'),
        inline: false,
      })
      .setFooter({
        text: `AURORA Greenville RP — Dziennik Służby${sub === 'gracza' ? ` | sprawdził: ${interaction.user.tag}` : ''}`,
      })
      .setTimestamp();

    if (sub === 'gracza') {
      logger.info(
        `dziennik-sluzby | ${interaction.user.tag} → ${targetDiscordUser.tag} | filter=${serviceFilter ?? 'all'} | limit=${limit}`
      );
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
