// Komenda /sesja-anuluj — anuluje zaplanowaną sesję RP (UPCOMING)
// Aktualizuje embed ogłoszenia, wysyła komunikat w kanale, DM-uje zapisanych graczy.
// Dostępna dla: Host+

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const logger = require('../../utils/logger');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesja-anuluj')
    .setDescription('Anuluj zaplanowaną sesję RP (Host+)')
    .addStringOption(opt =>
      opt
        .setName('powod')
        .setDescription('Powód anulowania (opcjonalny, widoczny w ogłoszeniu)')
        .setRequired(false)
        .setMinLength(3)
        .setMaxLength(200)
    )
    .addStringOption(opt =>
      opt
        .setName('id')
        .setDescription('ID sesji do anulowania (opcjonalne — domyślnie najbliższa Twoja sesja)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    await interaction.deferReply({ ephemeral: true });

    const powod     = interaction.options.getString('powod')?.trim() ?? null;
    const sessionId = interaction.options.getString('id')?.trim() ?? null;

    // Pobierz wewnętrzne ID hosta w bazie
    const hostDbUser = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    // Znajdź sesję do anulowania
    let session;
    if (sessionId) {
      session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { signups: { include: { user: true } } },
      });

      if (!session) {
        return interaction.editReply({ content: '❌ Nie znaleziono sesji o podanym ID.' });
      }
    } else {
      // Domyślnie: najbliższa UPCOMING sesja tego hosta
      session = hostDbUser
        ? await prisma.session.findFirst({
            where: { hostId: hostDbUser.id, status: 'UPCOMING' },
            orderBy: { date: 'asc' },
            include: { signups: { include: { user: true } } },
          })
        : null;

      if (!session) {
        return interaction.editReply({
          content: '❌ Nie masz żadnej zaplanowanej sesji do anulowania.\nJeśli chcesz zakończyć trwającą sesję, użyj `/sesja-koniec`.',
        });
      }
    }

    // Tylko UPCOMING sesje można anulować
    if (session.status !== 'UPCOMING') {
      const statusLabels = { ONGOING: 'trwa', ENDED: 'zakończona', CANCELLED: 'już anulowana' };
      return interaction.editReply({
        content: `❌ Ta sesja jest ${statusLabels[session.status] ?? 'w nieprawidłowym stanie'} — można anulować tylko zaplanowane sesje.\nAby zakończyć trwającą sesję, użyj \`/sesja-koniec\`.`,
      });
    }

    // Anuluj sesję w bazie
    await prisma.session.update({
      where: { id: session.id },
      data:  { status: 'CANCELLED' },
    });

    const sessionUnix = Math.floor(session.date.getTime() / 1000);
    const powodText   = powod ?? '_Brak podanego powodu._';

    // ── Zaktualizuj oryginalny embed ogłoszenia ───────────────────────────────
    if (session.messageId && session.channelId) {
      try {
        const sessionChannel = await client.channels.fetch(session.channelId);
        const sessionMsg     = await sessionChannel.messages.fetch(session.messageId);

        // Zdezaktywowane przyciski
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
          .setLabel('🚫 Sesja anulowana')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const disabledRow = new ActionRowBuilder().addComponents(
          disabledJoin,
          disabledLeave,
          disabledClose
        );

        // Nadpisz embed — czerwony kolor, tytuł z ANULOWANA, dodaj pole powodu
        const originalEmbed = sessionMsg.embeds[0];
        const cancelledEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(0xED4245)
          .setTitle((originalEmbed?.title ?? 'Sesja RP') + ' — 🚫 ANULOWANA')
          .addFields({
            name:   '🚫 Powód anulowania',
            value:  powodText,
            inline: false,
          });

        await sessionMsg.edit({ embeds: [cancelledEmbed], components: [disabledRow] });

        // Ogłoszenie o anulowaniu w kanale sesji
        await sessionChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('🚫 Sesja RP — ANULOWANA')
              .setDescription(
                `Sesja zaplanowana na <t:${sessionUnix}:F> została anulowana.\n\n` +
                `**Powód:** ${powodText}`
              )
              .addFields(
                { name: '👤 Anulował/a', value: `${interaction.user}`,       inline: true },
                { name: '🕐 Kiedy',      value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
              )
              .setFooter({ text: `AURORA Greenville RP — Sesja ID: ${session.id.slice(0, 8)}` })
              .setTimestamp(),
          ],
        });
      } catch (err) {
        logger.warn(`sesja-anuluj: nie udało się zaktualizować wiadomości sesji ${session.id}:`, err.message);
      }
    }

    // ── DM do zapisanych graczy ───────────────────────────────────────────────
    const signups = session.signups ?? [];
    let dmSent = 0;
    let dmFailed = 0;

    for (const signup of signups) {
      try {
        const discordUser = await client.users.fetch(signup.user.discordId).catch(() => null);
        if (!discordUser) { dmFailed++; continue; }

        const dmEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🚫 Sesja RP — Anulowana')
          .setDescription(
            `Sesja RP, na którą byłeś/aś zapisany/a, została anulowana.\n\n` +
            `📅 **Planowana data:** <t:${sessionUnix}:F>\n` +
            `**Powód:** ${powodText}\n\n` +
            `Obserwuj kanał ogłoszeń sesji — pojawi się kolejna sesja!`
          )
          .setFooter({ text: 'AURORA Greenville RP — System sesji' })
          .setTimestamp();

        await discordUser.send({ embeds: [dmEmbed] });
        dmSent++;
      } catch {
        dmFailed++;
      }
    }

    // ── Odpowiedź dla hosta ───────────────────────────────────────────────────
    const dmInfo = signups.length > 0
      ? `\n📨 DM wysłano do **${dmSent}** z **${signups.length}** zapisanych graczy${dmFailed > 0 ? ` (${dmFailed} zablokowanych)` : ''}.`
      : '';

    await interaction.editReply({
      content:
        `✅ Sesja RP **<t:${sessionUnix}:F>** została anulowana.${dmInfo}\n` +
        `📋 Sesja ID: \`${session.id.slice(0, 8)}\``,
    });

    logger.info(
      `sesja-anuluj | ${interaction.user.tag} | sesja ${session.id.slice(0, 8)} | ` +
      `${signups.length} zapisanych | dm: ${dmSent} OK ${dmFailed} fail | powod: ${powod ?? 'brak'}`
    );
  },
};
