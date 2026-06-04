// Komenda /log-ic — przegląd historii akcji IC gracza (Staff+)
// Wyświetla ostatnie wpisy /me, /do, /krzyk z modelu ProximityMessage.
// Przydatne przy dochodzeniach FRP, PG, Combat Log i innych naruszeń zasad RP.
// Dane wygasają automatycznie po 30 dniach.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Prefix → czytelna etykieta i emoji
const TYPE_META = {
  ME:    { label: '/me',    emoji: '✨' },
  DO:    { label: '/do',    emoji: '👁️' },
  KRZYK: { label: '/krzyk', emoji: '📢' },
};

function parseEntry(content) {
  const match = content.match(/^\[([A-Z]+)\] ([\s\S]+)$/);
  if (!match) return { type: '?', emoji: '❓', text: content };
  const meta = TYPE_META[match[1]] ?? { label: match[1], emoji: '🔹' };
  return { type: meta.label, emoji: meta.emoji, text: match[2] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-ic')
    .setDescription('Przegląd historii akcji IC gracza: /me, /do, /krzyk — do celów moderacyjnych (Staff+)')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz, którego logi IC chcesz sprawdzić')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Liczba wpisów do wyświetlenia (domyślnie: 10, maks: 20)')
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('typ')
        .setDescription('Filtruj po typie akcji IC (domyślnie: wszystkie)')
        .setRequired(false)
        .addChoices(
          { name: '✨ /me — akcje postaci',    value: 'ME'    },
          { name: '👁️ /do — opis otoczenia',  value: 'DO'    },
          { name: '📢 /krzyk — krzyk IC',      value: 'KRZYK' },
        )
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply(noPermissionReply('Staff'));
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');
    const limit      = interaction.options.getInteger('limit') ?? 10;
    const typeFilter = interaction.options.getString('typ') ?? null;

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można sprawdzić logów IC bota.' });
    }

    // Znajdź rekord bazy dla gracza
    let userDb;
    try {
      userDb = await prisma.user.findUnique({
        where:  { discordId: targetUser.id },
        select: { id: true },
      });
    } catch (err) {
      logger.error(`/log-ic: błąd zapytania user: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    if (!userDb) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie ma konta w bazie (nie przeszedł weryfikacji).`,
      });
    }

    // Wyczyść wygasłe wpisy przy każdym wywołaniu (housekeeping)
    prisma.proximityMessage
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => {});

    // Pobierz wpisy IC — opcjonalnie filtruj po typie
    const whereClause = {
      userId:    userDb.id,
      expiresAt: { gte: new Date() }, // tylko nieWygasłe
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
      logger.error(`/log-ic: błąd zapytania proximityMessage: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    if (entries.length === 0) {
      const typeLabel = typeFilter ? ` (${TYPE_META[typeFilter]?.label ?? typeFilter})` : '';
      return interaction.editReply({
        content:
          `ℹ️ Brak zapisanych akcji IC${typeLabel} dla <@${targetUser.id}>.\n` +
          `> *Logi IC są rejestrowane od chwili wdrożenia tej funkcji i wygasają po 30 dniach.*`,
      });
    }

    // Buduj treść embeda
    const lines = entries.map((entry, i) => {
      const { type, emoji, text } = parseEntry(entry.content);
      const ts     = Math.floor(entry.createdAt.getTime() / 1000);
      const truncated = text.length > 120 ? text.slice(0, 117) + '…' : text;
      return `**${i + 1}.** ${emoji} \`${type}\` <t:${ts}:R> — <#${entry.locationId}>\n> ${truncated}`;
    });

    // Pogrupuj statystyki
    const counts = entries.reduce((acc, e) => {
      const m = e.content.match(/^\[([A-Z]+)\]/);
      const key = m?.[1] ?? '?';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const statsLine = Object.entries(counts)
      .map(([k, v]) => `${TYPE_META[k]?.emoji ?? '🔹'} ${TYPE_META[k]?.label ?? k}: **${v}**`)
      .join(' · ');

    const typeLabel = typeFilter
      ? ` — filtr: ${TYPE_META[typeFilter]?.emoji} ${TYPE_META[typeFilter]?.label}`
      : '';

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`🔍 Log IC — ${targetUser.username}${typeLabel}`)
      .setDescription(lines.join('\n\n'))
      .addFields({
        name:  '📊 Wyświetlone wpisy',
        value: statsLine || '—',
        inline: false,
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .setFooter({
        text: `AURORA Greenville RP — Log IC | Sprawdzający: ${interaction.user.tag} | Logi wygasają po 30 dniach`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/log-ic | ${interaction.user.tag} → ${targetUser.tag} | limit=${limit} typ=${typeFilter ?? 'ALL'} | wyniki=${entries.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
