// Komenda /statystyki-ticketow — szczegółowe statystyki systemu ticketów (Staff+)
// Pokazuje stan bieżący, aktywność tygodniową, rozkład kategorii i ranking agentów

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

// Emoji przypisane do każdej kategorii ticketu
const CATEGORY_EMOJI = {
  'Techniczny':        '🔧',
  'Pytanie':           '❓',
  'Odwołanie':         '⚖️',
  'Pojazd':            '🚗',
  'Praca':             '💼',
  'Skarga':            '📢',
  'Dostęp':            '🔑',
};

function formatDuration(ms) {
  if (ms < 0) return '—';
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 1) return '< 1 min';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki-ticketow')
    .setDescription('Szczegółowe statystyki systemu ticketów (Staff+)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Staff może przeglądać statystyki ticketów.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week  = new Date(today.getTime() - 7  * 86_400_000);
    const month = new Date(today.getTime() - 30 * 86_400_000);

    // ── Równoległe zapytania ─────────────────────────────────────────────────
    const [
      openCount,
      claimedCount,
      weekOpened,
      weekClosed,
      todayOpened,
      todayClosed,
      byCategory,
      closedForAvg,
      topAgentsRaw,
    ] = await Promise.all([
      // Stan bieżący
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'CLAIMED' } }),

      // Aktywność tygodniowa
      prisma.ticket.count({ where: { createdAt: { gte: week } } }),
      prisma.ticket.count({ where: { status: 'CLOSED', closedAt: { gte: week } } }),

      // Aktywność dziś
      prisma.ticket.count({ where: { createdAt: { gte: today } } }),
      prisma.ticket.count({ where: { status: 'CLOSED', closedAt: { gte: today } } }),

      // Rozkład kategorii (ostatnie 30 dni)
      prisma.ticket.groupBy({
        by: ['category'],
        where: { createdAt: { gte: month } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),

      // Czas zamknięcia — tickety zamknięte w ostatnich 30 dniach
      prisma.ticket.findMany({
        where: { status: 'CLOSED', closedAt: { gte: month, not: null } },
        select: { createdAt: true, closedAt: true },
      }),

      // Top agenci (ostatnie 30 dni) — grupowanie po agentId
      prisma.ticket.groupBy({
        by: ['agentId'],
        where: {
          status: 'CLOSED',
          closedAt: { gte: month },
          agentId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // ── Średni czas zamknięcia ───────────────────────────────────────────────
    let avgCloseMs = -1;
    if (closedForAvg.length > 0) {
      const totalMs = closedForAvg.reduce(
        (sum, t) => sum + (new Date(t.closedAt) - new Date(t.createdAt)),
        0
      );
      avgCloseMs = totalMs / closedForAvg.length;
    }

    // ── Dane agentów ─────────────────────────────────────────────────────────
    const agentIds = topAgentsRaw.map(r => r.agentId).filter(Boolean);
    const agentUsers = agentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, discordId: true },
        })
      : [];
    const agentMap = Object.fromEntries(agentUsers.map(u => [u.id, u.discordId]));

    // ── Budowanie pól embeda ─────────────────────────────────────────────────

    // Stan bieżący
    const activeTotal = openCount + claimedCount;
    const currentValue = [
      `🟡 Oczekujące: **${openCount}**`,
      `🔵 Przejęte:   **${claimedCount}**`,
      `📌 Aktywnych łącznie: **${activeTotal}**`,
    ].join('\n');

    // Aktywność
    const activityValue = [
      `**Dziś:** otwarto **${todayOpened}** · zamknięto **${todayClosed}**`,
      `**7 dni:** otwarto **${weekOpened}** · zamknięto **${weekClosed}**`,
      `⏱️ Śr. czas zamknięcia (30 dni): **${formatDuration(avgCloseMs)}**`,
    ].join('\n');

    // Kategorie
    const categoryLines = byCategory.length > 0
      ? byCategory.map(row => {
          const emoji = CATEGORY_EMOJI[row.category] ?? '🎫';
          return `${emoji} **${row.category}**: ${row._count.id}`;
        }).join('\n')
      : '_Brak danych_';

    // Top agenci
    const agentLines = topAgentsRaw.length > 0
      ? topAgentsRaw.map((row, i) => {
          const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          const dId     = agentMap[row.agentId];
          const mention = dId ? `<@${dId}>` : '_nieznany_';
          return `${medal} ${mention} — **${row._count.id}** zamkniętych`;
        }).join('\n')
      : '_Brak danych_';

    // ── Embed ─────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎫 Statystyki Ticketów — AURORA Greenville RP')
      .addFields(
        { name: '📋 Stan bieżący',                        value: currentValue,   inline: false },
        { name: '📅 Aktywność',                           value: activityValue,  inline: false },
        { name: '📊 Kategorie (ostatnie 30 dni)',         value: categoryLines,  inline: true  },
        { name: '🏆 Top agenci (ostatnie 30 dni)',        value: agentLines,     inline: true  },
      )
      .setFooter({ text: `AURORA Greenville RP · sprawdził: ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
