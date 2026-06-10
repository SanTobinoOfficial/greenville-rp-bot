// Komenda /statystyki-moderacji — panel statystyk moderacyjnych (Moderator+)
// Rozkład case'ów, ranking moderatorów, najczęściej karani gracze

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod } = require('../../utils/permissions');

const CASE_TYPE = {
  WARN:   { emoji: '⚠️', label: 'Ostrzeżenia' },
  BAN:    { emoji: '🔨', label: 'Bany'        },
  KICK:   { emoji: '👢', label: 'Kicki'       },
  MUTE:   { emoji: '🔇', label: 'Mute'        },
  UNBAN:  { emoji: '✅', label: 'Odbanowania' },
  UNMUTE: { emoji: '🔊', label: 'Odmute'      },
};

const PERIOD_LABEL = {
  dzisiaj:  '— Dzisiaj',
  tydzien:  '— Ostatnie 7 dni',
  miesiac:  '— Ostatnie 30 dni',
  wszystko: '— Cały czas',
};

function getSince(periodKey) {
  if (periodKey === 'wszystko') return null;
  if (periodKey === 'dzisiaj') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const days = periodKey === 'tydzien' ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki-moderacji')
    .setDescription('Panel statystyk moderacyjnych serwera (Moderator+)')
    .addStringOption(opt =>
      opt.setName('okres')
        .setDescription('Zakres czasowy (domyślnie: 30 dni)')
        .setRequired(false)
        .addChoices(
          { name: '📅 Dzisiaj',          value: 'dzisiaj'  },
          { name: '📆 Ostatnie 7 dni',   value: 'tydzien'  },
          { name: '🗓️ Ostatnie 30 dni',  value: 'miesiac'  },
          { name: '📚 Cały czas',        value: 'wszystko' },
        )
    ),

  async execute(interaction, client, prisma) {
    if (!isMod(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Moderatorzy mogą przeglądać statystyki moderacji.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const periodKey  = interaction.options.getString('okres') ?? 'miesiac';
    const since      = getSince(periodKey);
    const whereBase  = since ? { createdAt: { gte: since } } : {};

    // ── Równoległe zapytania ─────────────────────────────────────────────────
    const [
      totalCases,
      activeWarns,
      activeBans,
      activeMutes,
      byType,
      topModsRaw,
      topOffendersRaw,
      autoActionsCount,
    ] = await Promise.all([
      prisma.case.count({ where: whereBase }),

      prisma.case.count({ where: { type: 'WARN', status: 'ACTIVE' } }),
      prisma.case.count({ where: { type: 'BAN',  status: 'ACTIVE' } }),
      prisma.case.count({ where: { type: 'MUTE', status: 'ACTIVE' } }),

      prisma.case.groupBy({
        by: ['type'],
        where: whereBase,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      prisma.case.groupBy({
        by: ['moderatorId'],
        where: { ...whereBase, moderatorId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      prisma.case.groupBy({
        by: ['targetId'],
        where: whereBase,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),

      prisma.case.count({
        where: { ...whereBase, reason: { startsWith: 'Auto-' } },
      }),
    ]);

    // ── Rozwiązanie discordId ────────────────────────────────────────────────
    const modDbIds      = topModsRaw.map(r => r.moderatorId).filter(Boolean);
    const offenderDbIds = topOffendersRaw.map(r => r.targetId).filter(Boolean);
    const allDbIds      = [...new Set([...modDbIds, ...offenderDbIds])];

    const dbUsers = allDbIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: allDbIds } },
          select: { id: true, discordId: true },
        })
      : [];
    const userMap = Object.fromEntries(dbUsers.map(u => [u.id, u.discordId]));

    // ── Budowanie pól ────────────────────────────────────────────────────────
    const typeLines = byType.length > 0
      ? byType.map(row => {
          const meta = CASE_TYPE[row.type] ?? { emoji: '📝', label: row.type };
          return `${meta.emoji} **${meta.label}**: ${row._count.id}`;
        }).join('\n')
      : '_Brak danych_';

    const activeValue = [
      `⚠️ Warny aktywne: **${activeWarns}**`,
      `🔨 Bany aktywne:  **${activeBans}**`,
      `🔇 Mute aktywne:  **${activeMutes}**`,
    ].join('\n');

    const modLines = topModsRaw.length > 0
      ? topModsRaw.map((row, i) => {
          const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          const dId     = userMap[row.moderatorId];
          const mention = dId ? `<@${dId}>` : '_nieznany_';
          return `${medal} ${mention} — **${row._count.id}** case'ów`;
        }).join('\n')
      : '_Brak danych_';

    const offenderLines = topOffendersRaw.length > 0
      ? topOffendersRaw.map((row, i) => {
          const dId     = userMap[row.targetId];
          const mention = dId ? `<@${dId}>` : '_nieznany_';
          return `${i + 1}. ${mention} — **${row._count.id}** case'ów`;
        }).join('\n')
      : '_Brak danych_';

    // ── Embed ─────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`🛡️ Statystyki Moderacji ${PERIOD_LABEL[periodKey]}`)
      .addFields(
        {
          name: '📊 Podsumowanie okresu',
          value:
            `📋 Łącznie case'ów: **${totalCases}**\n` +
            `🤖 Auto-akcje: **${autoActionsCount}**`,
          inline: false,
        },
        { name: '📂 Rozkład typów',       value: typeLines,     inline: true },
        { name: '🚨 Stan aktywny (teraz)', value: activeValue,   inline: true },
        { name: '​',                  value: '​',      inline: false },
        { name: '🏆 Top Moderatorzy',      value: modLines,      inline: true },
        { name: '⚠️ Najczęściej Karani',   value: offenderLines, inline: true },
      )
      .setFooter({ text: `AURORA Greenville RP · sprawdził: ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
