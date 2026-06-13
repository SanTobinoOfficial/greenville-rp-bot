// Komenda /statystyki-quizu — analityka quizu weryfikacyjnego (Staff+)
// Funnel prób, rozkład wyników, średnia podejść, nowe weryfikacje

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki-quizu')
    .setDescription('Analityka quizu weryfikacyjnego serwera (Staff+)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply(noPermissionReply('Staff+'));
    }

    await interaction.deferReply({ ephemeral: true });

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week  = new Date(today.getTime() - 7 * 86400000);
    const month = new Date(today.getTime() - 30 * 86400000);

    const settings = await prisma.settings.findFirst({
      select: { quizCooldownHours: true },
    });
    const cooldownHours  = settings?.quizCooldownHours ?? 24;
    const cooldownCutoff = new Date(Date.now() - cooldownHours * 3_600_000);

    const [
      totalInDB,
      totalAttempted,
      totalVerified,
      avgAttemptsVerified,
      stuckInCooldown,
      neverTried,
      newVerToday,
      newVerWeek,
      newVerMonth,
      newAttemptWeek,
      scoreGroups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { quizAttempts: { gt: 0 } } }),
      prisma.user.count({ where: { verifiedAt: { not: null } } }),
      prisma.user.aggregate({
        where: { verifiedAt: { not: null }, quizAttempts: { gt: 0 } },
        _avg: { quizAttempts: true },
      }),
      // Zawieszeni w cooldownie: próbowali, niezweryfikowani, cooldown aktywny
      prisma.user.count({
        where: {
          verifiedAt:      null,
          quizAttempts:    { gt: 0 },
          quizLastAttempt: { gte: cooldownCutoff },
        },
      }),
      // Zarejestrowani, ale nigdy nie podeszli do quizu
      prisma.user.count({ where: { quizAttempts: 0, verifiedAt: null } }),
      prisma.user.count({ where: { verifiedAt: { gte: today } } }),
      prisma.user.count({ where: { verifiedAt: { gte: week  } } }),
      prisma.user.count({ where: { verifiedAt: { gte: month } } }),
      // Nowe podejścia (nieudane) w ostatnim tygodniu
      prisma.user.count({
        where: { quizLastAttempt: { gte: week }, verifiedAt: null },
      }),
      // Rozkład ostatnich wyników (quizScore to wynik ostatniego podejścia)
      prisma.user.groupBy({
        by:      ['quizScore'],
        where:   { quizScore: { not: null } },
        _count:  { quizScore: true },
        orderBy: { quizScore: 'asc' },
      }),
    ]);

    // ── Obliczenia ─────────────────────────────────────────────────────────────
    const failedCurrently = totalAttempted - totalVerified;
    const passRate   = totalAttempted > 0
      ? ((totalVerified / totalAttempted) * 100).toFixed(1)
      : '0.0';
    const avgAttempts = (avgAttemptsVerified._avg.quizAttempts ?? 1).toFixed(1);

    // Grupowanie wyników w trzy przedziały
    let low = 0, mid = 0, high = 0;
    for (const g of scoreGroups) {
      const s = g.quizScore ?? 0;
      const c = g._count.quizScore;
      if (s <= 4)      low  += c;
      else if (s <= 7) mid  += c;
      else             high += c;
    }
    const totalScored = low + mid + high;

    // Pasek postępu ASCII (długość 10)
    const bar = (count, total, len = 10) => {
      const filled = total > 0 ? Math.round((count / total) * len) : 0;
      return '`' + '█'.repeat(filled) + '░'.repeat(len - filled) + '`';
    };

    // ── Embed ──────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📋 Analityka Quizu Weryfikacyjnego')
      .addFields(
        {
          name:   '🔢 Funnel weryfikacji',
          value:
            `👥 Wszyscy w bazie:               **${totalInDB}**\n` +
            `📝 Podeszło do quizu:              **${totalAttempted}**\n` +
            `✅ Zweryfikowanych:                **${totalVerified}** (${passRate}%)\n` +
            `❌ Niezal. (prób > 0):             **${failedCurrently}**\n` +
            `🚫 Nigdy nie próbowało:            **${neverTried}**`,
          inline: false,
        },
        {
          name:   '⭐ Skuteczność',
          value:
            `📊 Wskaźnik przejścia:   **${passRate}%**\n` +
            `🔄 Śr. prób (zaliczeni): **${avgAttempts}**`,
          inline: true,
        },
        {
          name:   '⏳ Cooldown',
          value:
            `🔴 W cooldownie teraz:   **${stuckInCooldown}**\n` +
            `⏱️ Długość cooldownu:    **${cooldownHours}h**`,
          inline: true,
        },
        {
          name:   '📊 Rozkład ostatnich wyników',
          value:  totalScored > 0
            ? `\`0–4 pkt\` (słaby)   ${bar(low,  totalScored)} **${low}**\n` +
              `\`5–7 pkt\` (bliski)  ${bar(mid,  totalScored)} **${mid}**\n` +
              `\`8–10pkt\` (zalicz)  ${bar(high, totalScored)} **${high}**`
            : '_Brak danych o wynikach_',
          inline: false,
        },
        {
          name:   '📅 Nowe weryfikacje',
          value:  `Dziś: **${newVerToday}** | Tydzień: **${newVerWeek}** | Miesiąc: **${newVerMonth}**`,
          inline: true,
        },
        {
          name:   '📈 Nowe nieudane próby (tydzień)',
          value:  `**${newAttemptWeek}** graczy podeszło i nie zaliczyło`,
          inline: true,
        },
      )
      .setFooter({
        text: `AURORA Greenville RP · Staff · ${now.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
