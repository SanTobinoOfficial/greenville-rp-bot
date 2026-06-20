// Komenda /statystyki-mandatow — panel statystyk mandatowych (Policja, SM, Staff)
// Rozkład mandatów, ranking oficerów, najczęściej karani gracze, łączna kwota grzywien

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, ROLES } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const FINE_TYPE = {
  MANDAT:  { emoji: '🚔', label: 'Mandaty'  },
  GRZYWNA: { emoji: '💰', label: 'Grzywny'  },
  ARESZT:  { emoji: '⛓️', label: 'Areszty'  },
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
    .setName('statystyki-mandatow')
    .setDescription('Panel statystyk mandatowych serwera (Policja, SM, Staff)')
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
    const member = interaction.member;
    const hasPolicja = member.roles.cache.some(r => r.name === ROLES.POLICJA);
    const hasSM      = member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

    if (!hasPolicja && !hasSM && !isStaff(member)) {
      return interaction.reply({
        content: '❌ Tylko Policja, Straż Miejska lub Staff może przeglądać statystyki mandatów.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const periodKey = interaction.options.getString('okres') ?? 'miesiac';
    const since     = getSince(periodKey);
    const whereBase = since ? { createdAt: { gte: since } } : {};

    try {
      const [
        totalFines,
        activeFines,
        byType,
        topOfficersRaw,
        topOffendersRaw,
        totalAmountRaw,
      ] = await Promise.all([
        prisma.fine.count({ where: whereBase }),

        prisma.fine.count({ where: { active: true } }),

        prisma.fine.groupBy({
          by: ['type'],
          where: whereBase,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),

        prisma.fine.groupBy({
          by: ['issuerId'],
          where: whereBase,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),

        prisma.fine.groupBy({
          by: ['targetId'],
          where: whereBase,
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5,
        }),

        prisma.fine.aggregate({
          where: { ...whereBase, amount: { not: null } },
          _sum: { amount: true },
        }),
      ]);

      // ── Rozwiązanie discordId ──────────────────────────────────────────────
      const officerDbIds  = topOfficersRaw.map(r => r.issuerId).filter(Boolean);
      const offenderDbIds = topOffendersRaw.map(r => r.targetId).filter(Boolean);
      const allDbIds      = [...new Set([...officerDbIds, ...offenderDbIds])];

      const dbUsers = allDbIds.length > 0
        ? await prisma.user.findMany({
            where:  { id: { in: allDbIds } },
            select: { id: true, discordId: true },
          })
        : [];
      const userMap = Object.fromEntries(dbUsers.map(u => [u.id, u.discordId]));

      // ── Budowanie pól ──────────────────────────────────────────────────────
      const typeLines = byType.length > 0
        ? byType.map(row => {
            const meta = FINE_TYPE[row.type] ?? { emoji: '📋', label: row.type };
            return `${meta.emoji} **${meta.label}**: ${row._count.id}`;
          }).join('\n')
        : '_Brak danych_';

      const officerLines = topOfficersRaw.length > 0
        ? topOfficersRaw.map((row, i) => {
            const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const dId     = userMap[row.issuerId];
            const mention = dId ? `<@${dId}>` : '_nieznany_';
            return `${medal} ${mention} — **${row._count.id}** wpisów`;
          }).join('\n')
        : '_Brak danych_';

      const offenderLines = topOffendersRaw.length > 0
        ? topOffendersRaw.map((row, i) => {
            const dId     = userMap[row.targetId];
            const mention = dId ? `<@${dId}>` : '_nieznany_';
            return `${i + 1}. ${mention} — **${row._count.id}** wpisów`;
          }).join('\n')
        : '_Brak danych_';

      const totalAmount = totalAmountRaw._sum.amount ?? 0;
      const amountStr   = totalAmount > 0
        ? `${totalAmount.toLocaleString('pl-PL')} zł`
        : '_brak_';

      // ── Embed ──────────────────────────────────────────────────────────────
      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(`🚔 Statystyki Mandatów ${PERIOD_LABEL[periodKey]}`)
        .addFields(
          {
            name:   '📊 Podsumowanie okresu',
            value:  `📋 Łącznie wpisów: **${totalFines}**\n🔴 Aktywnych teraz: **${activeFines}**\n💰 Suma grzywien: **${amountStr}**`,
            inline: false,
          },
          { name: '📂 Rozkład typów',           value: typeLines,     inline: true },
          { name: '​',                        value: '​',    inline: true },
          { name: '​',                        value: '​',    inline: false },
          { name: '🏆 Top Oficerowie',           value: officerLines,  inline: true },
          { name: '⚠️ Najczęściej Karani',      value: offenderLines, inline: true },
        )
        .setFooter({ text: `AURORA Greenville RP · sprawdził: ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      logger.error(`Błąd /statystyki-mandatow: ${err.message}`);
      return interaction.editReply({
        content: '❌ Wystąpił błąd podczas pobierania statystyk. Spróbuj ponownie.',
      });
    }
  },
};
