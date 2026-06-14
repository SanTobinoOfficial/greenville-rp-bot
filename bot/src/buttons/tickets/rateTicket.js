// Przycisk "ticket_rate_[stars]_[ticketId]"
// Twórca ticketu ocenia obsługę po zamknięciu (1–5 gwiazdek)

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');

const STAR_LABELS = {
  1: 'Bardzo słabo',
  2: 'Słabo',
  3: 'Przeciętnie',
  4: 'Dobrze',
  5: 'Świetnie',
};

module.exports = {
  async execute(interaction, client, prisma, args) {
    // customId: ticket_rate_[stars]_[ticketId]
    // args: ['rate', stars, ticketId]
    if (args[0] !== 'rate') return;

    const stars = parseInt(args[1], 10);
    const ticketId = args[2];

    if (!stars || stars < 1 || stars > 5 || !ticketId) {
      return interaction.reply({ content: '❌ Nieprawidłowe dane oceny.', ephemeral: true });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { user: true },
    });

    if (!ticket) {
      return interaction.reply({ content: '❌ Nie znaleziono ticketu.', ephemeral: true });
    }

    if (ticket.user.discordId !== interaction.user.id) {
      return interaction.reply({
        content: '❌ Tylko twórca ticketu może wystawić tę ocenę.',
        ephemeral: true,
      });
    }

    if (ticket.rating !== null) {
      return interaction.reply({
        content: `ℹ️ Twoja ocena (**${ticket.rating}⭐**) została już zapisana. Dziękujemy!`,
        ephemeral: true,
      });
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { rating: stars },
    });

    const starsDisplay = '⭐'.repeat(stars);
    const label = STAR_LABELS[stars] ?? '';
    const color = stars >= 4 ? 0x57F287 : stars >= 3 ? 0xFEE75C : 0xED4245;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('✅ Ocena zapisana!')
      .setDescription(
        `Wystawiłeś **${starsDisplay} ${stars}/5** — _${label}_.\n\nDziękujemy za opinię! Pomaga nam poprawić jakość obsługi.`
      )
      .setFooter({ text: 'AURORA Greenville RP • Ticket Support' })
      .setTimestamp();

    const disabledRow = new ActionRowBuilder().addComponents(
      [1, 2, 3, 4, 5].map(s =>
        new ButtonBuilder()
          .setCustomId(`ticket_rate_${s}_${ticketId}`)
          .setLabel(`${s}⭐`)
          .setStyle(s === stars ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(true)
      )
    );

    await interaction.update({ embeds: [embed], components: [disabledRow] });

    logger.info(
      `Ticket #${String(ticket.ticketNumber).padStart(4, '0')} oceniony na ${stars}/5 przez ${interaction.user.tag}`
    );
  },
};
