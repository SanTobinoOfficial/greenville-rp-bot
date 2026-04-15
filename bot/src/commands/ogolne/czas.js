// Komenda /czas — aktualny czas RP na serwerze + strefa czasowa
// Dostępna dla: wszystkich

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('czas')
    .setDescription('Sprawdź aktualny czas na serwerze AURORA Greenville RP'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const now = new Date();

    // Czas polski (CET/CEST)
    const plTime = now.toLocaleString('pl-PL', {
      timeZone:    'Europe/Warsaw',
      weekday:     'long',
      year:        'numeric',
      month:       'long',
      day:         'numeric',
      hour:        '2-digit',
      minute:      '2-digit',
      second:      '2-digit',
    });

    // Sprawdź czy trwa sesja
    const ongoingSession = await prisma.session.findFirst({
      where: { status: 'ONGOING' },
    }).catch(() => null);

    const upcomingSession = await prisma.session.findFirst({
      where: { status: 'UPCOMING', date: { gte: now } },
      orderBy: { date: 'asc' },
    }).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('🕐 Czas Serwera — AURORA Greenville RP')
      .addFields(
        { name: '📅 Aktualna data i czas',     value: `**${plTime}**`, inline: false },
        { name: '🕓 Timestamp Discord',         value: `<t:${Math.floor(now.getTime() / 1000)}:F>`, inline: false },
      )
      .setFooter({ text: 'AURORA Greenville RP — Strefa czasowa: Europe/Warsaw (CET/CEST)' })
      .setTimestamp();

    if (ongoingSession) {
      embed.addFields({
        name: '🟢 Aktywna sesja RP',
        value: `Sesja trwa od <t:${Math.floor((ongoingSession.startedAt || ongoingSession.createdAt).getTime() / 1000)}:R>`,
      });
    } else if (upcomingSession) {
      embed.addFields({
        name: '🔵 Nadchodząca sesja RP',
        value: `Następna sesja: <t:${Math.floor(upcomingSession.date.getTime() / 1000)}:R>`,
      });
    } else {
      embed.addFields({ name: '⚫ Status sesji', value: 'Brak aktywnej ani planowanej sesji' });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
