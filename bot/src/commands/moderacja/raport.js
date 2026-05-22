// Komenda /raport — wyświetl raport aktywności serwera (statystyki)
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raport')
    .setDescription('Raport aktywności i statystyki serwera (Moderator+)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff może wyświetlać raporty.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // Daty
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(today.getTime() - 7 * 86400000);
    const month = new Date(today.getTime() - 30 * 86400000);

    const [
      totalUsers,
      verifiedUsers,
      usersToday,
      usersWeek,
      totalTickets,
      openTickets,
      ticketsWeek,
      totalCases,
      casesWeek,
      activeSessions,
      totalTransactions,
      totalFines,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { robloxId: { not: null } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { gte: week } } }),
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { createdAt: { gte: week } } }),
      prisma.case.count(),
      prisma.case.count({ where: { createdAt: { gte: week } } }),
      prisma.session.count({ where: { status: 'ONGOING' } }),
      prisma.transaction.count({ where: { createdAt: { gte: week } } }),
      prisma.fine.count({ where: { active: true } }),
    ]);

    const guild = interaction.guild;
    const memberCount = guild.memberCount;
    const verRate = totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : '0.0';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Raport Aktywności — AURORA Greenville RP')
      .setDescription(`*Wygenerowany: <t:${Math.floor(now.getTime() / 1000)}:F>*`)
      .addFields(
        // Użytkownicy
        { name: '👥 Użytkownicy', value:
            `Discord: **${memberCount}**\n` +
            `W bazie: **${totalUsers}**\n` +
            `Zweryfikowani: **${verifiedUsers}** (${verRate}%)\n` +
            `Nowi dziś: **${usersToday}**\n` +
            `Nowych w tygodniu: **${usersWeek}**`,
          inline: true
        },
        // Tickety
        { name: '🎫 Tickety', value:
            `Łącznie: **${totalTickets}**\n` +
            `Otwarte: **${openTickets}**\n` +
            `Ostatni tydzień: **${ticketsWeek}**`,
          inline: true
        },
        // Moderacja
        { name: '⚖️ Moderacja', value:
            `Przypadki łącznie: **${totalCases}**\n` +
            `Ostatni tydzień: **${casesWeek}**\n` +
            `Aktywne mandaty RP: **${totalFines}**`,
          inline: true
        },
        // Ekonomia & Sesje
        { name: '💰 Ekonomia & Sesje', value:
            `Transakcje (7 dni): **${totalTransactions}**\n` +
            `Aktywne sesje: **${activeSessions}**`,
          inline: true
        },
        // Bot
        { name: '🤖 Bot', value:
            `Uptime: **${Math.floor(client.uptime / 3600000)}h ${Math.floor((client.uptime % 3600000) / 60000)}m**\n` +
            `Ping: **${client.ws.ping}ms**\n` +
            `Serwery: **${client.guilds.cache.size}**`,
          inline: true
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — Dane z bazy PostgreSQL' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
