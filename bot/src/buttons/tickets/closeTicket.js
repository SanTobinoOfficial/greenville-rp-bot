// Przycisk "✅ Zamknij ticket"
// Dostępny dla twórcy ticketu oraz staffu
// Generuje transkrypt, zapisuje do DB, wysyła na #logi-ticketów i usuwa kanał

const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { isStaff } = require('../../utils/permissions');

// Nazwa kanału logów ticketów
const TICKET_LOG_CHANNEL = 'logi-ticketów';

// Maksymalna liczba wiadomości do transkryptu
const TRANSCRIPT_MESSAGE_LIMIT = 100;

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

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
        content: '❌ Ten ticket jest już zamknięty.',
      });
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    // Sprawdź uprawnienia: twórca ticketu lub staff
    const isTicketOwner = ticket.user.discordId === interaction.user.id;
    const isStaffMember = member ? isStaff(member) : false;

    if (!isTicketOwner && !isStaffMember) {
      return interaction.editReply({
        content: '❌ Tylko twórca ticketu lub staff może zamknąć to zgłoszenie.',
      });
    }

    // ==================== TRANSKRYPT ====================

    // Pobierz ostatnie 100 wiadomości z kanału
    let messages;
    try {
      messages = await interaction.channel.messages.fetch({ limit: TRANSCRIPT_MESSAGE_LIMIT });
    } catch (err) {
      logger.warn(`Nie udało się pobrać wiadomości dla transkryptu ticketu #${ticket.ticketNumber}:`, err.message);
      messages = new Map();
    }

    // Posortuj wiadomości od najstarszej do najnowszej
    const sortedMessages = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Zbuduj prosty transkrypt HTML
    const ticketNumber = String(ticket.ticketNumber).padStart(4, '0');
    const closedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const htmlLines = sortedMessages.map(msg => {
      // Pomiń wiadomości systemowe bez treści
      if (!msg.content && msg.embeds.length === 0) return null;

      const time = msg.createdAt.toISOString().replace('T', ' ').substring(0, 19);
      const author = msg.author?.tag ?? 'System';
      const content = msg.content || '[embed]';

      // Escapuj znaki specjalne HTML
      const safeContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      return `<p><strong>${author}</strong> <span class="time">[${time}]</span>: ${safeContent}</p>`;
    }).filter(Boolean);

    const transcriptHtml = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transkrypt Ticket #${ticketNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #36393f; color: #dcddde; margin: 0; padding: 20px; }
    h1 { color: #5865F2; }
    .meta { color: #72767d; font-size: 0.9em; margin-bottom: 20px; }
    .messages { background: #2f3136; border-radius: 8px; padding: 16px; }
    p { margin: 6px 0; border-bottom: 1px solid #42454a; padding-bottom: 6px; }
    strong { color: #ffffff; }
    .time { color: #72767d; font-size: 0.8em; }
  </style>
</head>
<body>
  <h1>🎫 Transkrypt Ticket #${ticketNumber}</h1>
  <div class="meta">
    <p>Kategoria: ${ticket.category}</p>
    <p>Użytkownik: ${ticket.user.discordUsername} (${ticket.user.discordId})</p>
    <p>Zamknął: ${interaction.user.tag}</p>
    <p>Data zamknięcia: ${closedAt}</p>
    <p>Liczba wiadomości: ${htmlLines.length}</p>
  </div>
  <div class="messages">
    ${htmlLines.length > 0 ? htmlLines.join('\n    ') : '<p><em>Brak wiadomości w transkrypcie.</em></p>'}
  </div>
</body>
</html>`;

    // ==================== ZAPIS DO BAZY ====================

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CLOSED',
        transcript: transcriptHtml,
        closedAt: new Date(),
      },
    });

    // ==================== WYSYŁKA TRANSKRYPTU NA LOGI ====================

    const logChannel = interaction.guild.channels.cache.find(
      c => c.name === TICKET_LOG_CHANNEL && c.isTextBased()
    );

    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`📋 Ticket #${ticketNumber} — Zamknięty`)
        .addFields(
          { name: '👤 Twórca', value: `<@${ticket.user.discordId}>`, inline: true },
          { name: '🔒 Zamknął', value: `${interaction.user}`, inline: true },
          { name: '📂 Kategoria', value: ticket.category, inline: true },
          { name: '🕐 Data zamknięcia', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: `AURORA Greenville RP • Ticket #${ticketNumber}` })
        .setTimestamp();

      // Wyślij transkrypt jako załącznik (Buffer ze stringa HTML)
      const transcriptBuffer = Buffer.from(transcriptHtml, 'utf-8');

      await logChannel.send({
        embeds: [logEmbed],
        files: [
          {
            attachment: transcriptBuffer,
            name: `transkrypt-ticket-${ticketNumber}.html`,
          },
        ],
      }).catch(err => logger.warn('Nie udało się wysłać transkryptu na logi:', err.message));
    } else {
      logger.warn(`Nie znaleziono kanału "${TICKET_LOG_CHANNEL}" do wysyłki transkryptu ticketu #${ticketNumber}`);
    }

    // ==================== EMBED ZAMKNIĘCIA W KANALE ====================

    const closeEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🔒 Ticket zamknięty')
      .setDescription(`Ticket został zamknięty przez ${interaction.user}.\n\nKanał zostanie usunięty za **10 sekund**.`)
      .setTimestamp();

    // Odpowiedz użytkownikowi (ephemeral confirm)
    await interaction.editReply({
      content: '✅ Ticket został zamknięty. Kanał zostanie usunięty za 10 sekund.',
    });

    // Wyślij publiczny embed w kanale
    await interaction.channel.send({ embeds: [closeEmbed] }).catch(() => {});

    logger.info(`Ticket #${ticketNumber} zamknięty przez ${interaction.user.tag}`);

    // Usuń kanał po 10 sekundach
    setTimeout(async () => {
      try {
        await interaction.channel.delete(`Ticket #${ticketNumber} zamknięty przez ${interaction.user.tag}`);
      } catch (err) {
        logger.warn(`Nie udało się usunąć kanału ticket-${ticketNumber}:`, err.message);
      }
    }, 10_000);
  },
};
