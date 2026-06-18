// Komenda /historia-ic-gracza — historia akcji IC dowolnego gracza (Staff+)
// Wyświetla treść akcji /me, /do, /krzyk dla wskazanego gracza.
// Różni się od /aktywnosc-ic gracza (tam tylko statystyki) — tu widać pełną treść.
// Przydatna do dochodzenia w sprawach FRP, PG i innych naruszeń regulaminu.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { hasRole } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const TYPE_META = {
  ME:    { label: '/me',    emoji: '✨' },
  DO:    { label: '/do',    emoji: '👁️' },
  KRZYK: { label: '/krzyk', emoji: '📢' },
  NPC:   { label: '/npc',   emoji: '🤖' },
};

function parseEntry(content) {
  const match = content.match(/^\[([A-Z]+)\] ([\s\S]+)$/);
  if (!match) return { type: '?', emoji: '🔹', text: content };
  const meta = TYPE_META[match[1]] ?? { label: match[1], emoji: '🔹' };
  return { type: meta.label, emoji: meta.emoji, text: match[2] };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historia-ic-gracza')
    .setDescription('Przeglądaj historię akcji IC dowolnego gracza — treść /me, /do, /krzyk (Staff+)')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz do sprawdzenia')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('typ')
        .setDescription('Filtruj po typie akcji IC (domyślnie: wszystkie)')
        .setRequired(false)
        .addChoices(
          { name: '✨ /me — akcje postaci',   value: 'ME'    },
          { name: '👁️ /do — opis otoczenia', value: 'DO'    },
          { name: '📢 /krzyk — krzyk IC',     value: 'KRZYK' },
          { name: '🤖 /npc — akcja NPC',      value: 'NPC'   },
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Liczba wpisów do wyświetlenia (domyślnie: 15, maks: 20)')
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!hasRole(interaction.member, 'Moderator')) {
      return interaction.reply({
        content: '❌ Brak uprawnień. Wymagane: **Moderator+**.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser  = interaction.options.getUser('gracz');
    const typeFilter  = interaction.options.getString('typ') ?? null;
    const limit       = interaction.options.getInteger('limit') ?? 15;

    let dbUser;
    try {
      dbUser = await prisma.user.findUnique({
        where:   { discordId: targetUser.id },
        include: { character: { select: { firstName: true, lastName: true } } },
      });
    } catch (err) {
      logger.error(`/historia-ic-gracza: błąd pobierania użytkownika: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    if (!dbUser) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie jest zarejestrowany w bazie — brak weryfikacji.`,
      });
    }

    const whereClause = {
      userId:    dbUser.id,
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
      logger.error(`/historia-ic-gracza: błąd zapytania proximityMessage: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    const icName = dbUser.character
      ? `${dbUser.character.firstName} ${dbUser.character.lastName}`
      : '*(brak postaci)*';

    const typeLabel = typeFilter
      ? ` — filtr: ${TYPE_META[typeFilter]?.emoji ?? ''} ${TYPE_META[typeFilter]?.label ?? typeFilter}`
      : '';

    if (entries.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle(`📜 Historia IC — ${icName}${typeLabel}`)
            .setDescription(
              `Gracz <@${targetUser.id}> nie ma zarejestrowanych akcji IC w ciągu ostatnich 30 dni` +
              (typeFilter ? ` (typ: ${TYPE_META[typeFilter]?.label ?? typeFilter})` : '') + '.'
            )
            .setFooter({ text: 'AURORA Greenville RP — Historia IC (Staff) | Dane wygasają po 30 dniach' })
            .setTimestamp(),
        ],
      });
    }

    const lines = entries.map((entry, i) => {
      const { type, emoji, text } = parseEntry(entry.content);
      const ts        = Math.floor(entry.createdAt.getTime() / 1000);
      const truncated = text.length > 120 ? text.slice(0, 117) + '…' : text;
      return `**${i + 1}.** ${emoji} \`${type}\` <t:${ts}:R> — <#${entry.locationId}>\n> ${truncated}`;
    });

    const typeCounts = entries.reduce((acc, e) => {
      const m   = e.content.match(/^\[([A-Z]+)\]/);
      const key = m?.[1] ?? '?';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const statsLine = Object.entries(typeCounts)
      .map(([k, v]) => `${TYPE_META[k]?.emoji ?? '🔹'} ${TYPE_META[k]?.label ?? k}: **${v}**`)
      .join(' · ');

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning ?? 0xFEE75C)
      .setTitle(`📜 Historia IC — ${icName}${typeLabel}`)
      .setDescription(lines.join('\n\n'))
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .addFields(
        {
          name:  '📊 Akcje w tym widoku',
          value: statsLine || '—',
          inline: true,
        },
        {
          name:  '🎮 Gracz',
          value: `<@${targetUser.id}> \`${targetUser.tag}\``,
          inline: true,
        },
      )
      .setFooter({
        text:    `Użyte przez: ${interaction.user.tag} • AURORA Greenville RP — Historia IC (Staff) | Widoczna tylko dla Ciebie`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/historia-ic-gracza | mod=${interaction.user.tag} | gracz=${targetUser.tag} | typ=${typeFilter ?? 'ALL'} | limit=${limit} | wyniki=${entries.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
