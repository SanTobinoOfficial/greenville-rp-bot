// Przycisk "🔒 Przejmij ticket"
// Dostępny tylko dla staffu
// Zmienia status ticketu na CLAIMED i przypisuje agenta

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    // Sprawdź uprawnienia — tylko staff może przejąć ticket
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Tylko członkowie staffu mogą przejąć ticket.',
      });
    }

    // Pobierz ticket powiązany z tym kanałem
    const ticket = await prisma.ticket.findUnique({
      where: { channelId: interaction.channel.id },
      include: { user: true },
    });

    if (!ticket) {
      return interaction.editReply({
        content: '❌ Nie znaleziono ticketu powiązanego z tym kanałem.',
      });
    }

    // Sprawdź czy ticket nie jest już zamknięty
    if (ticket.status === 'CLOSED') {
      return interaction.editReply({
        content: '❌ Nie można przejąć zamkniętego ticketu.',
      });
    }

    // Sprawdź czy ktoś nie przejął już ticketu
    if (ticket.status === 'CLAIMED') {
      // Pobierz dane agenta który przejął ticket
      if (ticket.agentId) {
        const agentUser = await prisma.user.findUnique({ where: { id: ticket.agentId } });
        const agentMention = agentUser ? `<@${agentUser.discordId}>` : 'nieznany agent';
        return interaction.editReply({
          content: `❌ Ten ticket jest już obsługiwany przez ${agentMention}.`,
        });
      }
    }

    // Pobierz lub utwórz rekord użytkownika (agenta) w bazie
    let agentDbUser = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!agentDbUser) {
      agentDbUser = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          discordUsername: interaction.user.username,
        },
      });
    }

    // Zaktualizuj ticket w bazie — CLAIMED + agentId
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CLAIMED',
        agentId: agentDbUser.id,
      },
    });

    const ticketNumber = String(ticket.ticketNumber).padStart(4, '0');

    // ==================== EDYCJA ORYGINALNEGO EMBEDA ====================

    // Pobierz wiadomość z embedem (pierwsza wiadomość bota w kanale)
    let embedMessage = null;
    try {
      const fetchedMessages = await interaction.channel.messages.fetch({ limit: 20 });
      // Szukaj wiadomości bota z embedem tytułowym ticketu
      embedMessage = fetchedMessages.find(
        m => m.author.id === client.user.id &&
             m.embeds.length > 0 &&
             m.embeds[0].title?.includes(`Ticket #${ticketNumber}`)
      );
    } catch (err) {
      logger.warn(`Nie udało się znaleźć oryginalnego embeda ticketu #${ticketNumber}:`, err.message);
    }

    if (embedMessage) {
      // Skopiuj oryginalny embed i dodaj pole "Obsługuje"
      const originalEmbed = embedMessage.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor(0xFEE75C) // Żółty = przejęty
        .addFields({
          name: '🔒 Obsługuje',
          value: `${interaction.user} (${interaction.user.tag})`,
          inline: false,
        });

      // Zaktualizuj przyciski — dezaktywuj "Przejmij ticket" dla czytelności
      const disabledClaimButton = new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel(`🔒 Przejął: ${interaction.user.username}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);

      const closeButton = new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('✅ Zamknij ticket')
        .setStyle(ButtonStyle.Success);

      const updatedRow = new ActionRowBuilder().addComponents(closeButton, disabledClaimButton);

      await embedMessage.edit({
        embeds: [updatedEmbed],
        components: [updatedRow],
      }).catch(err => logger.warn('Nie udało się edytować embeda ticketu:', err.message));
    }

    // ==================== WIADOMOŚĆ W KANALE ====================

    const infoEmbed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setDescription(`🔒 Ticket przejęty przez ${interaction.user}. Wkrótce udzielę odpowiedzi!`)
      .setTimestamp();

    await interaction.channel.send({ embeds: [infoEmbed] });

    // Odpowiedz staffowi (ephemeral)
    await interaction.editReply({
      content: `✅ Przejąłeś ticket #${ticketNumber}. Powodzenia!`,
    });

    logger.info(`Ticket #${ticketNumber} przejęty przez ${interaction.user.tag}`);
  },
};
