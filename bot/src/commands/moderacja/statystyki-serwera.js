// Komenda /statystyki-serwera — pełny raport zdrowia serwera (Staff+)
// Jeden widok dla wszystkich kluczowych wskaźników

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki-serwera')
    .setDescription('Pełny raport stanu serwera AURORA Greenville RP (Staff+)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff może sprawdzać statystyki serwera.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild  = interaction.guild;
    const now    = new Date();
    const today  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week   = new Date(today.getTime() - 7 * 86400000);
    const month  = new Date(today.getTime() - 30 * 86400000);

    // ── Równoległe zapytania ─────────────────────────────────────────────────
    const [
      // Użytkownicy
      totalUsers, verifiedUsers, newToday, newWeek, newMonth,
      // Ekonomia
      totalWallet, totalBank, avgWallet, richest,
      // Moderacja
      openTickets, activeWarns, activeBans, activeMutes, activeFines,
      // Aktywność
      sessionsTotal, sessionsOngoing, dailyToday, streak7plus,
      // Transakcje
      txToday, txWeek,
      // Pojazdy
      totalVehicles, totalLicenses,
    ] = await Promise.all([
      // Użytkownicy
      prisma.user.count(),
      prisma.user.count({ where: { robloxId: { not: null } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.user.count({ where: { createdAt: { gte: month } } }),

      // Ekonomia — sumy przez aggregate
      prisma.user.aggregate({ _sum: { balance: true } }),
      prisma.user.aggregate({ _sum: { bankBalance: true } }),
      prisma.user.aggregate({ _avg: { balance: true }, where: { robloxId: { not: null } } }),
      prisma.user.findFirst({
        where: { robloxId: { not: null } },
        orderBy: { bankBalance: 'desc' },
        select: { discordId: true, robloxUsername: true, balance: true, bankBalance: true },
      }),

      // Moderacja
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'CLAIMED'] } } }),
      prisma.case.count({ where: { type: 'WARN', status: 'ACTIVE' } }),
      prisma.case.count({ where: { type: 'BAN',  status: 'ACTIVE' } }),
      prisma.case.count({ where: { type: 'MUTE', status: 'ACTIVE' } }),
      prisma.fine.count({ where: { active: true } }),

      // Sesje
      prisma.session.count(),
      prisma.session.count({ where: { status: 'ONGOING' } }),
      prisma.user.count({ where: { dailyLastClaim: { gte: today } } }),
      prisma.user.count({ where: { dailyStreak: { gte: 7 } } }),

      // Transakcje
      prisma.transaction.count({ where: { createdAt: { gte: today } } }),
      prisma.transaction.count({ where: { createdAt: { gte: week } } }),

      // Pojazdy
      prisma.vehicle.count(),
      prisma.license.count({ where: { status: 'ACTIVE' } }),
    ]);

    // ── Obliczenia ────────────────────────────────────────────────────────────
    const verifyRate = totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : '0.0';
    const totalWalletSum  = totalWallet._sum.balance ?? 0;
    const totalBankSum    = totalBank._sum.bankBalance ?? 0;
    const avgWalletVal    = Math.round(avgWallet._avg.balance ?? 0);

    // Discord members (boty odfiltrowane)
    const humanMembers = guild.memberCount;

    const uptime  = process.uptime();
    const uptHrs  = Math.floor(uptime / 3600);
    const uptMins = Math.floor((uptime % 3600) / 60);

    // ── Embed ─────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Statystyki Serwera AURORA Greenville RP')
      .setThumbnail(guild.iconURL())
      .addFields(
        // ── Użytkownicy ───────────────────────────────────────────────────────
        {
          name: '👥 Użytkownicy',
          value:
            `Discord: **${humanMembers}** | Baza: **${totalUsers}**\n` +
            `✅ Zweryfikowanych: **${verifiedUsers}** (${verifyRate}%)\n` +
            `📅 Dziś dołączyło: **${newToday}** | Tydzień: **${newWeek}** | Miesiąc: **${newMonth}**`,
          inline: false,
        },

        // ── Ekonomia ──────────────────────────────────────────────────────────
        {
          name: '💰 Ekonomia',
          value:
            `👛 Łącznie w portfelach: **${totalWalletSum.toLocaleString('pl-PL')}$**\n` +
            `🏦 Łącznie w bankach: **${totalBankSum.toLocaleString('pl-PL')}$**\n` +
            `📈 Średni portfel gracza: **${avgWalletVal.toLocaleString('pl-PL')}$**\n` +
            (richest ? `🥇 Najbogatszy: <@${richest.discordId}> — ${(richest.balance + richest.bankBalance).toLocaleString('pl-PL')}$` : ''),
          inline: false,
        },

        // ── Moderacja ─────────────────────────────────────────────────────────
        {
          name: '🛡️ Moderacja',
          value:
            `🎫 Tickety otwarte: **${openTickets}**\n` +
            `⚠️ Aktywne warny: **${activeWarns}**\n` +
            `🔨 Aktywne bany: **${activeBans}**\n` +
            `🔇 Aktywne mute: **${activeMutes}**\n` +
            `🚔 Aktywne mandaty: **${activeFines}**`,
          inline: true,
        },

        // ── Aktywność ─────────────────────────────────────────────────────────
        {
          name: '🎮 Aktywność',
          value:
            `🎪 Sesji łącznie: **${sessionsTotal}** | Trwające: **${sessionsOngoing}**\n` +
            `🎁 Daily dziś: **${dailyToday}**\n` +
            `🔥 Seria 7+ dni: **${streak7plus}** graczy\n` +
            `💸 Transakcji dziś: **${txToday}** | Tydzień: **${txWeek}**`,
          inline: true,
        },

        // ── RP ────────────────────────────────────────────────────────────────
        {
          name: '🚗 Zasoby RP',
          value:
            `🚘 Pojazdy: **${totalVehicles}**\n` +
            `🪪 Prawa jazdy: **${totalLicenses}**`,
          inline: true,
        },

        // ── Bot uptime ────────────────────────────────────────────────────────
        {
          name: '🤖 Bot',
          value:
            `⏱️ Uptime: **${uptHrs}h ${uptMins}m**\n` +
            `🏓 Ping: **${client.ws.ping}ms**\n` +
            `🔧 Komendy: **${client.commands.size}**`,
          inline: true,
        },
      )
      .setFooter({ text: `AURORA Greenville RP · ${guild.name} · ${now.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' })}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
