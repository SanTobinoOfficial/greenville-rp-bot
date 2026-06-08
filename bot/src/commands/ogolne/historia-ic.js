// Komenda /historia-ic — historia własnych akcji IC gracza
// Pozwala zweryfikowanemu graczowi przejrzeć swoje ostatnie akcje /me, /do, /krzyk
// zapisane w bazie danych. Przydatne do przypomnienia sobie co postać robiła podczas sesji.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const TYPE_META = {
  ME:    { label: '/me',    emoji: '✨' },
  DO:    { label: '/do',    emoji: '👁️' },
  KRZYK: { label: '/krzyk', emoji: '📢' },
};

function parseEntry(content) {
  const match = content.match(/^\[([A-Z]+)\] ([\s\S]+)$/);
  if (!match) return { type: '?', emoji: '🔹', text: content };
  const meta = TYPE_META[match[1]] ?? { label: match[1], emoji: '🔹' };
  return { type: meta.label, emoji: meta.emoji, text: match[2] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historia-ic')
    .setDescription('Przeglądaj historię swoich akcji IC (/me, /do, /krzyk) z ostatnich 30 dni')
    .addStringOption(opt =>
      opt
        .setName('typ')
        .setDescription('Filtruj po typie akcji IC (domyślnie: wszystkie)')
        .setRequired(false)
        .addChoices(
          { name: '✨ /me — akcje postaci',   value: 'ME'    },
          { name: '👁️ /do — opis otoczenia', value: 'DO'    },
          { name: '📢 /krzyk — krzyk IC',     value: 'KRZYK' },
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Liczba wpisów do wyświetlenia (domyślnie: 10, maks: 15)')
        .setMinValue(1)
        .setMaxValue(15)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą przeglądać historię IC.',
      });
    }

    const typeFilter = interaction.options.getString('typ') ?? null;
    const limit      = interaction.options.getInteger('limit') ?? 10;

    let userDb;
    try {
      userDb = await prisma.user.findUnique({
        where:  { discordId: interaction.user.id },
        select: { id: true },
      });
    } catch (err) {
      logger.error(`/historia-ic: błąd zapytania user: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    if (!userDb) {
      return interaction.editReply({
        content: '❌ Nie masz konta w bazie — najpierw przejdź przez weryfikację.',
      });
    }

    const whereClause = {
      userId:    userDb.id,
      expiresAt: { gte: new Date() },
    };
    if (typeFilter) {
      whereClause.content = { startsWith: `[${typeFilter}]` };
    }

    let entries;
    try {
      entries = await prisma.proximityMessage.findMany({
        where:   whereClause,
        orderBy: { createdAt: 'desc' },
        take:    limit,
      });
    } catch (err) {
      logger.error(`/historia-ic: błąd zapytania proximityMessage: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    const typeLabel = typeFilter
      ? ` — filtr: ${TYPE_META[typeFilter]?.emoji} ${TYPE_META[typeFilter]?.label}`
      : '';

    if (entries.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle(`📜 Twoja historia IC${typeLabel}`)
            .setDescription(
              'Nie masz żadnych zarejestrowanych akcji IC w ciągu ostatnich 30 dni.\n\n' +
              '*Akcje IC (/me, /do, /krzyk) są zapisywane automatycznie podczas sesji RP.*'
            )
            .setFooter({ text: 'AURORA Greenville RP — Historia IC | Wpisy wygasają po 30 dniach' })
            .setTimestamp(),
        ],
      });
    }

    const lines = entries.map((entry, i) => {
      const { type, emoji, text } = parseEntry(entry.content);
      const ts        = Math.floor(entry.createdAt.getTime() / 1000);
      const truncated = text.length > 110 ? text.slice(0, 107) + '…' : text;
      return `**${i + 1}.** ${emoji} \`${type}\` <t:${ts}:R> — <#${entry.locationId}>\n> ${truncated}`;
    });

    const counts = entries.reduce((acc, e) => {
      const m   = e.content.match(/^\[([A-Z]+)\]/);
      const key = m?.[1] ?? '?';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const statsLine = Object.entries(counts)
      .map(([k, v]) => `${TYPE_META[k]?.emoji ?? '🔹'} ${TYPE_META[k]?.label ?? k}: **${v}**`)
      .join(' · ');

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle(`📜 Twoja historia IC${typeLabel}`)
      .setDescription(lines.join('\n\n'))
      .addFields({
        name:  '📊 Akcje w tym widoku',
        value: statsLine || '—',
        inline: false,
      })
      .setThumbnail(interaction.user.displayAvatarURL({ size: 64 }))
      .setFooter({
        text: 'AURORA Greenville RP — Historia IC | Widoczna tylko dla Ciebie | Wpisy wygasają po 30 dniach',
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/historia-ic | ${interaction.user.tag} | typ=${typeFilter ?? 'ALL'} limit=${limit} | wyniki=${entries.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
