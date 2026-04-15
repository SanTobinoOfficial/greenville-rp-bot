// Handler przycisków sesji RP
// Obsługuje: session_join_ID, session_leave_ID, session_close_ID

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const { hasRole, ROLES } = require('../../utils/permissions');

module.exports = {
  async execute(interaction, client, prisma, args) {
    // customId ma format: session_<akcja>_<sessionId>
    // args = ['akcja', 'sessionId...'] (split po '_', pierwsze to prefix 'session')
    // Właściwy podział: session_join_<id> → parts[1]=join, rest=id
    const parts = interaction.customId.split('_');
    // parts[0]='session', parts[1]=akcja, parts[2..]=fragmenty id (cuid może zawierać litery i cyfry bez _)
    const action    = parts[1];
    const sessionId = parts.slice(2).join('_');

    if (!sessionId) {
      return interaction.reply({
        content: '❌ Nieprawidłowy identyfikator sesji.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // Pobierz sesję wraz z zapisami
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        signups: { include: { user: true } },
      },
    });

    if (!session) {
      return interaction.editReply({
        content: '❌ Nie znaleziono sesji. Mogła zostać usunięta.',
      });
    }

    // Pobierz lub utwórz użytkownika w bazie
    let user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          discordUsername: interaction.user.username,
        },
      });
    }

    // ==================== ZAPIS (JOIN) ====================
    if (action === 'join') {
      // Sprawdź czy sesja jest nadal aktywna
      if (session.status !== 'UPCOMING') {
        return interaction.editReply({
          content: '❌ Zapisy na tę sesję są już zamknięte.',
        });
      }

      // Sprawdź czy użytkownik nie jest już zapisany
      const alreadySignedUp = session.signups.some(s => s.user.discordId === interaction.user.id);
      if (alreadySignedUp) {
        return interaction.editReply({
          content: '❌ Jesteś już zapisany na tę sesję! Aby się wypisać, kliknij **❌ Wypisz się**.',
        });
      }

      // Sprawdź limit graczy
      if (session.signups.length >= session.maxPlayers) {
        return interaction.editReply({
          content: `❌ Brak wolnych miejsc! Sesja jest pełna (${session.maxPlayers}/${session.maxPlayers}).`,
        });
      }

      // Dodaj zapis do bazy
      await prisma.sessionSignup.create({
        data: {
          sessionId: session.id,
          userId: user.id,
        },
      });

      const newCount = session.signups.length + 1;

      // Zaktualizuj embed ogłoszenia (pole "Zapisani")
      await updateSessionEmbed(interaction, client, prisma, session, newCount);

      // Wyślij DM potwierdzające
      try {
        const sessionDate = new Date(session.date);
        const dateStr = sessionDate.toLocaleDateString('pl-PL', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const timeStr = sessionDate.toLocaleTimeString('pl-PL', {
          hour: '2-digit', minute: '2-digit',
        });

        const dmEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Zapisano na sesję RP!')
          .setDescription(
            `Zostałeś pomyślnie zapisany na sesję RP.\n\n` +
            `📅 **Data:** ${dateStr}\n` +
            `⏰ **Godzina:** ${timeStr}\n` +
            `🎮 **Serwer:** ${interaction.guild.name}\n\n` +
            `Do zobaczenia na sesji! 🎉`
          )
          .setFooter({ text: 'AURORA Greenville RP — Sesje RP' })
          .setTimestamp();

        await interaction.user.send({ embeds: [dmEmbed] });
      } catch {
        // DM zablokowane — ignoruj (odpowiedź ephemeral wystarczy)
      }

      return interaction.editReply({
        content: `✅ Zapisano na sesję! Masz teraz **${newCount}** z **${session.maxPlayers}** miejsc zajętych. Sprawdź DM po potwierdzenie.`,
      });
    }

    // ==================== WYPISANIE (LEAVE) ====================
    if (action === 'leave') {
      // Sprawdź czy sesja jest nadal aktywna
      if (session.status !== 'UPCOMING') {
        return interaction.editReply({
          content: '❌ Zapisy na tę sesję są już zamknięte — nie można się wypisać.',
        });
      }

      // Sprawdź czy użytkownik jest zapisany
      const signup = session.signups.find(s => s.user.discordId === interaction.user.id);
      if (!signup) {
        return interaction.editReply({
          content: '❌ Nie jesteś zapisany na tę sesję.',
        });
      }

      // Usuń zapis z bazy
      await prisma.sessionSignup.delete({
        where: { id: signup.id },
      });

      const newCount = session.signups.length - 1;

      // Zaktualizuj embed
      await updateSessionEmbed(interaction, client, prisma, session, newCount);

      return interaction.editReply({
        content: `✅ Wypisano z sesji. Pozostało **${newCount}** zapisanych graczy.`,
      });
    }

    // ==================== ZAMKNIĘCIE ZAPISÓW (CLOSE) ====================
    if (action === 'close') {
      // Sprawdź uprawnienia — tylko Host+ może zamknąć zapisy
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

      if (!member || !hasRole(member, ROLES.HOST)) {
        return interaction.editReply({
          content: '❌ Tylko Host lub wyżej może zamknąć zapisy na sesję.',
        });
      }

      // Sprawdź czy zapisy nie są już zamknięte
      if (session.status !== 'UPCOMING') {
        return interaction.editReply({
          content: '❌ Zapisy na tę sesję są już zamknięte.',
        });
      }

      // Zaktualizuj status sesji w bazie
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'ONGOING' },
      });

      // Dezaktywuj wszystkie przyciski w ogłoszeniu
      if (session.messageId && session.channelId) {
        try {
          const sessionChannel = await client.channels.fetch(session.channelId);
          const sessionMsg     = await sessionChannel.messages.fetch(session.messageId);

          // Zbuduj zdezaktywowane przyciski
          const disabledJoin = new ButtonBuilder()
            .setCustomId(`session_join_${session.id}`)
            .setLabel('✅ Zapisz się')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true);

          const disabledLeave = new ButtonBuilder()
            .setCustomId(`session_leave_${session.id}`)
            .setLabel('❌ Wypisz się')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true);

          const disabledClose = new ButtonBuilder()
            .setCustomId(`session_close_${session.id}`)
            .setLabel('🔒 Zapisy zamknięte')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

          const disabledRow = new ActionRowBuilder().addComponents(disabledJoin, disabledLeave, disabledClose);

          // Zaktualizuj embed — zmień kolor na szary i dodaj info o zamknięciu
          const originalEmbed = sessionMsg.embeds[0];
          const closedEmbed = EmbedBuilder.from(originalEmbed)
            .setColor(0x95A5A6)
            .setTitle(originalEmbed.title + ' — 🔒 ZAMKNIĘTE');

          await sessionMsg.edit({
            embeds: [closedEmbed],
            components: [disabledRow],
          });

          // Wyślij wiadomość w kanale o zamknięciu zapisów
          await sessionChannel.send({
            content: `🔒 **Zapisy na sesję zostały zamknięte** przez ${interaction.user}.\nZapisanych graczy: **${session.signups.length}/${session.maxPlayers}**`,
          });
        } catch (err) {
          logger.warn(`Nie udało się zaktualizować wiadomości sesji ${session.id}:`, err.message);
        }
      }

      return interaction.editReply({
        content: `✅ Zapisy na sesję zostały zamknięte. Zapisanych graczy: **${session.signups.length}/${session.maxPlayers}**.`,
      });
    }

    // Nieznana akcja
    return interaction.editReply({
      content: '❌ Nieznana akcja przycisku sesji.',
    });
  },
};

// ==================== HELPER: aktualizacja embeda sesji ====================

/**
 * Aktualizuje pole "Zapisani" w embedzie ogłoszenia sesji
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('discord.js').Client} client
 * @param {object} prisma
 * @param {object} session  - obiekt sesji z DB
 * @param {number} newCount - nowa liczba zapisanych
 */
async function updateSessionEmbed(interaction, client, prisma, session, newCount) {
  if (!session.messageId || !session.channelId) return;

  try {
    const sessionChannel = await client.channels.fetch(session.channelId);
    const sessionMsg     = await sessionChannel.messages.fetch(session.messageId);

    if (!sessionMsg || sessionMsg.embeds.length === 0) return;

    const originalEmbed = sessionMsg.embeds[0];

    // Zaktualizuj pole "Zapisani" — wyszukaj po nazwie i zastąp
    const updatedFields = (originalEmbed.fields ?? []).map(field => {
      if (field.name === '✅ Zapisani') {
        return { name: '✅ Zapisani', value: `${newCount} / ${session.maxPlayers}`, inline: true };
      }
      return field;
    });

    const updatedEmbed = EmbedBuilder.from(originalEmbed).setFields(updatedFields);

    await sessionMsg.edit({ embeds: [updatedEmbed] });
  } catch (err) {
    logger.warn(`Nie udało się zaktualizować embeda sesji ${session.id}:`, err.message);
  }
}
