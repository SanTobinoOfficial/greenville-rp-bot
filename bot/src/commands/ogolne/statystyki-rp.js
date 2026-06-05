// Komenda /statystyki-rp — dashboard statystyk bazy danych serwera RP
// Pokazuje liczniki graczy, postaci, pojazdów, sesji, mandatów i ticketów.
// Dostępna dla: Mieszkaniec+ (zweryfikowani gracze)
// Moderator+ widzi dodatkowo aktywne bany i wyciszenia.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isMod } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki-rp')
    .setDescription('Wyświetl statystyki serwera AURORA Greenville RP'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą wyświetlić statystyki serwera.',
      });
    }

    const isModOrAbove = isMod(interaction.member);

    try {
      const [
        totalUsers,
        verifiedUsers,
        totalCharacters,
        totalVehicles,
        activeLicenses,
        totalFines,
        activeFines,
        upcomingSessions,
        ongoingSessions,
        totalSessions,
        openTickets,
        pendingApplications,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { verifiedAt: { not: null } } }),
        prisma.character.count(),
        prisma.vehicle.count(),
        prisma.license.count({ where: { status: 'ACTIVE' } }),
        prisma.fine.count(),
        prisma.fine.count({ where: { active: true } }),
        prisma.session.count({ where: { status: 'UPCOMING' } }),
        prisma.session.count({ where: { status: 'ONGOING' } }),
        prisma.session.count(),
        prisma.ticket.count({ where: { status: { not: 'CLOSED' } } }),
        prisma.application.count({ where: { status: 'PENDING' } }),
      ]);

      let activeBans = 0;
      let activeMutes = 0;
      if (isModOrAbove) {
        [activeBans, activeMutes] = await Promise.all([
          prisma.case.count({ where: { status: 'ACTIVE', type: 'BAN' } }),
          prisma.case.count({ where: { status: 'ACTIVE', type: 'MUTE' } }),
        ]);
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📊 Statystyki AURORA Greenville RP')
        .setDescription('Dane na żywo pobrane z bazy danych serwera.')
        .addFields(
          {
            name: '👥 Gracze',
            value: [
              `Zarejestrowani: **${totalUsers}**`,
              `Zweryfikowani: **${verifiedUsers}**`,
              `Postaci: **${totalCharacters}**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🚗 Pojazdy & Prawo jazdy',
            value: [
              `Zarejestrowanych pojazdów: **${totalVehicles}**`,
              `Aktywnych praw jazdy: **${activeLicenses}**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🎪 Sesje RP',
            value: [
              `Nadchodzące: **${upcomingSessions}**`,
              `Trwające: **${ongoingSessions}**`,
              `Łącznie: **${totalSessions}**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '📋 Mandaty RP',
            value: [
              `Aktywne: **${activeFines}**`,
              `Łącznie wystawionych: **${totalFines}**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🎫 Tickety & Podania',
            value: [
              `Otwarte tickety: **${openTickets}**`,
              `Podania do rozpatrzenia: **${pendingApplications}**`,
            ].join('\n'),
            inline: true,
          },
        )
        .setFooter({ text: 'AURORA Greenville RP — Statystyki RP' })
        .setTimestamp();

      if (isModOrAbove) {
        embed.addFields({
          name: '🛡️ Moderacja (staff)',
          value: [
            `Aktywne bany: **${activeBans}**`,
            `Aktywne wyciszenia: **${activeMutes}**`,
          ].join('\n'),
          inline: true,
        });
      }

      logger.info(`/statystyki-rp | ${interaction.user.tag} | staff: ${isModOrAbove}`);

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      logger.error('/statystyki-rp błąd:', err.message);
      return interaction.editReply({
        content: '❌ Nie udało się pobrać statystyk. Spróbuj ponownie za chwilę.',
      });
    }
  },
};
