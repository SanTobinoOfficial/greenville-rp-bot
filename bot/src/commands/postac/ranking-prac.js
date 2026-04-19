// Komenda /ranking-prac — ranking najpopularniejszych prac i statystyki zatrudnienia
// Dostępna dla: wszystkich

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking-prac')
    .setDescription('Statystyki zatrudnienia — najpopularniejsze prace na serwerze')
    .addStringOption(opt =>
      opt.setName('typ')
        .setDescription('Rodzaj rankingu')
        .setRequired(false)
        .addChoices(
          { name: '💼 Najpopularniejsze prace', value: 'popular' },
          { name: '📁 Zatrudnienie wg kategorii', value: 'kategoria' },
          { name: '📊 Ogólne statystyki', value: 'stats' },
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false }); // publiczne

    const typ = interaction.options.getString('typ') ?? 'popular';

    if (typ === 'popular') {
      // Top 10 najpopularniejszych prac (grouped currentJob)
      const users = await prisma.user.findMany({
        where: { currentJob: { not: null } },
        select: { currentJob: true, jobCategory: true },
      });

      const counts = {};
      for (const u of users) {
        if (!u.currentJob) continue;
        if (!counts[u.currentJob]) counts[u.currentJob] = { count: 0, kategoria: u.jobCategory ?? '—' };
        counts[u.currentJob].count++;
      }

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

      const embed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle('🏆 Ranking Prac — Top 10 Najpopularniejszych')
        .setDescription(
          sorted.length === 0
            ? 'Brak danych — nikt nie ma jeszcze wybranej pracy.'
            : sorted.map(([name, data], i) =>
                `${MEDALS[i] ?? `${i + 1}.`} **${name}** — **${data.count}** pracowników\n` +
                `┗ 📁 ${data.kategoria}`
              ).join('\n\n')
        )
        .setFooter({ text: `Łącznie zatrudnionych: ${users.length} graczy • AURORA Greenville RP` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (typ === 'kategoria') {
      const users = await prisma.user.findMany({
        where: { jobCategory: { not: null } },
        select: { jobCategory: true },
      });

      const counts = {};
      for (const u of users) {
        if (!u.jobCategory) continue;
        counts[u.jobCategory] = (counts[u.jobCategory] ?? 0) + 1;
      }

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, c]) => s + c, 0);

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle('📁 Zatrudnienie według Kategorii')
        .setDescription(
          sorted.length === 0
            ? 'Brak danych.'
            : sorted.map(([kat, count], i) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const bar = '█'.repeat(Math.round(pct / 10)).padEnd(10, '░');
                return `${MEDALS[i] ?? '•'} **${kat}** — ${count} (${pct}%)\n\`${bar}\``;
              }).join('\n\n')
        )
        .setFooter({ text: `Łącznie: ${total} zatrudnionych • AURORA Greenville RP` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    if (typ === 'stats') {
      const [totalUsers, employed, pendingApps, totalApps] = await Promise.all([
        prisma.user.count({ where: { verifiedAt: { not: null } } }),
        prisma.user.count({ where: { currentJob: { not: null } } }),
        prisma.jobApplication.count({ where: { status: 'PENDING' } }),
        prisma.jobApplication.count(),
      ]);

      const unemployed = totalUsers - employed;
      const employmentRate = totalUsers > 0 ? Math.round((employed / totalUsers) * 100) : 0;

      const recentApps = await prisma.jobApplication.findMany({
        orderBy: { appliedAt: 'desc' },
        take: 5,
        select: { jobName: true, status: true, appliedAt: true },
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📊 Statystyki Zatrudnienia — Greenville RP')
        .addFields(
          {
            name: '👥 Gracze',
            value: [
              `Zweryfikowani: **${totalUsers}**`,
              `Zatrudnieni: **${employed}** (${employmentRate}%)`,
              `Bezrobotni: **${unemployed}**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '📋 Podania',
            value: [
              `Złożonych łącznie: **${totalApps}**`,
              `Oczekujących: **${pendingApps}**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🕓 Ostatnie podania',
            value: recentApps.length > 0
              ? recentApps.map(a =>
                  `• **${a.jobName}** — ${a.status} <t:${Math.floor(new Date(a.appliedAt).getTime() / 1000)}:R>`
                ).join('\n')
              : 'Brak podań',
            inline: false,
          },
        )
        .setFooter({ text: 'AURORA Greenville RP • Statystyki systemu pracy' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
