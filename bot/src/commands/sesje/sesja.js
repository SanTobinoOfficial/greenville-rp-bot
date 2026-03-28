// Komenda slash /sesja
// Tworzy sesję RP i wysyła ogłoszenie do kanału #sesje-ogłoszenia
// Dostępna tylko dla Host+

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const logger = require('../../utils/logger');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');

// Nazwa kanału ogłoszeń sesji
const SESSION_CHANNEL = 'sesje-ogłoszenia';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesja')
    .setDescription('Tworzy nową sesję RP i wysyła ogłoszenie')
    .addStringOption(opt =>
      opt
        .setName('data')
        .setDescription('Data sesji w formacie DD.MM.RRRR (np. 25.12.2025)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('godzina')
        .setDescription('Godzina sesji w formacie HH:MM (np. 19:00)')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName('maks_graczy')
        .setDescription('Maksymalna liczba graczy (2–50)')
        .setMinValue(2)
        .setMaxValue(50)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('opis')
        .setDescription('Dodatkowy opis sesji (opcjonalny)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    // Sprawdź uprawnienia — tylko Host+ może tworzyć sesje
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    await interaction.deferReply({ ephemeral: true });

    // Pobierz opcje komendy
    const dataStr    = interaction.options.getString('data');
    const godzina    = interaction.options.getString('godzina');
    const maksGraczy = interaction.options.getInteger('maks_graczy');
    const opis       = interaction.options.getString('opis') ?? null;

    // Walidacja formatu daty DD.MM.RRRR
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const dateMatch = dataStr.match(dateRegex);
    if (!dateMatch) {
      return interaction.editReply({
        content: '❌ Nieprawidłowy format daty. Użyj: **DD.MM.RRRR** (np. `25.12.2025`)',
      });
    }

    // Walidacja formatu godziny HH:MM
    const timeRegex = /^(\d{2}):(\d{2})$/;
    const timeMatch = godzina.match(timeRegex);
    if (!timeMatch) {
      return interaction.editReply({
        content: '❌ Nieprawidłowy format godziny. Użyj: **HH:MM** (np. `19:00`)',
      });
    }

    // Parsuj datę i godzinę do obiektu Date (lokalnie jako UTC — serwer traktuje czas jako polski)
    const [, dd, mm, yyyy] = dateMatch;
    const [, hh, min]      = timeMatch;
    const sessionDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00.000Z`);

    if (isNaN(sessionDate.getTime())) {
      return interaction.editReply({
        content: '❌ Nieprawidłowa data lub godzina. Sprawdź poprawność wartości.',
      });
    }

    // Pobierz lub utwórz użytkownika w bazie
    let hostUser = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!hostUser) {
      hostUser = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          discordUsername: interaction.user.username,
        },
      });
    }

    // Zapisz sesję do bazy danych
    const session = await prisma.session.create({
      data: {
        hostId: hostUser.id,
        date: sessionDate,
        maxPlayers: maksGraczy,
        description: opis,
        status: 'UPCOMING',
      },
    });

    // ==================== EMBED OGŁOSZENIA ====================

    const opisField = opis ?? '_Brak opisu_';

    // Unix timestamp dla Discord względnych dat
    const unixTs = Math.floor(sessionDate.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`🎪 Sesja RP — ${dataStr} o ${godzina}`)
      .setDescription('Zapisz się na nadchodzącą sesję RP! Liczba miejsc ograniczona.')
      .addFields(
        { name: '👤 Host',          value: `${interaction.user}`,           inline: true  },
        { name: '📅 Data',          value: dataStr,                          inline: true  },
        { name: '⏰ Godzina',       value: godzina,                          inline: true  },
        { name: '👥 Maks. graczy',  value: `${maksGraczy}`,                  inline: true  },
        { name: '✅ Zapisani',      value: `0 / ${maksGraczy}`,              inline: true  },
        { name: '🕐 Kiedy',         value: `<t:${unixTs}:R>`,               inline: true  },
        { name: '📝 Opis',          value: opisField,                        inline: false },
      )
      .setFooter({ text: `Greenville RP • Sesja ID: ${session.id.slice(0, 8)}` })
      .setTimestamp();

    // Przyciski akcji sesji (ID zawiera ID sesji w bazie)
    const joinButton = new ButtonBuilder()
      .setCustomId(`session_join_${session.id}`)
      .setLabel('✅ Zapisz się')
      .setStyle(ButtonStyle.Success);

    const leaveButton = new ButtonBuilder()
      .setCustomId(`session_leave_${session.id}`)
      .setLabel('❌ Wypisz się')
      .setStyle(ButtonStyle.Danger);

    const closeButton = new ButtonBuilder()
      .setCustomId(`session_close_${session.id}`)
      .setLabel('🔒 Zamknij zapisy')
      .setStyle(ButtonStyle.Secondary);

    const actionRow = new ActionRowBuilder().addComponents(joinButton, leaveButton, closeButton);

    // Znajdź kanał ogłoszeń sesji
    const sessionChannel = interaction.guild.channels.cache.find(
      c => c.name === SESSION_CHANNEL && c.isTextBased()
    );

    if (!sessionChannel) {
      logger.warn(`Nie znaleziono kanału "${SESSION_CHANNEL}" — sprawdź konfigurację serwera`);
      return interaction.editReply({
        content: `❌ Nie znaleziono kanału **#${SESSION_CHANNEL}**. Skontaktuj się z administracją.`,
      });
    }

    // Wyślij ogłoszenie sesji
    let announcementMsg;
    try {
      announcementMsg = await sessionChannel.send({
        embeds: [embed],
        components: [actionRow],
      });
    } catch (err) {
      logger.error('Błąd wysyłki ogłoszenia sesji:', err.message);
      await prisma.session.delete({ where: { id: session.id } });
      return interaction.editReply({
        content: '❌ Wystąpił błąd podczas wysyłania ogłoszenia sesji.',
      });
    }

    // Zapisz messageId i channelId do bazy
    await prisma.session.update({
      where: { id: session.id },
      data: {
        messageId: announcementMsg.id,
        channelId: announcementMsg.channelId,
      },
    });

    // ==================== PING 15 MINUT PRZED SESJĄ ====================

    const msUntilSession = sessionDate.getTime() - Date.now();
    const msUntilPing    = msUntilSession - 15 * 60 * 1000; // 15 min przed

    if (msUntilPing > 0) {
      setTimeout(async () => {
        try {
          // Sprawdź czy sesja nie została anulowana
          const currentSession = await prisma.session.findUnique({
            where: { id: session.id },
            include: { signups: { include: { user: true } } },
          });

          if (!currentSession || currentSession.status === 'CANCELLED') return;

          const signupCount = currentSession.signups.length;

          await sessionChannel.send({
            content: `⏰ **Przypomnienie!** Sesja RP zaczyna się za **15 minut**!\n📅 **${dataStr}** o **${godzina}** | Zapisanych: **${signupCount}/${maksGraczy}** graczy\n🎮 Szykujcie się — do zobaczenia na sesji!`,
          });

          logger.info(`Wysłano ping 15-minutowy dla sesji ${session.id}`);
        } catch (err) {
          logger.warn(`Nie udało się wysłać pingu 15-min dla sesji ${session.id}:`, err.message);
        }
      }, msUntilPing);

      logger.info(`Zaplanowano ping 15-min dla sesji ${session.id} za ${Math.round(msUntilPing / 60000)} minut`);
    }

    // Potwierdź hostowi
    await interaction.editReply({
      content: `✅ Sesja RP **${dataStr} o ${godzina}** została utworzona!\nOgłoszenie opublikowano w <#${sessionChannel.id}>.`,
    });

    logger.info(`Sesja ${session.id} (${dataStr} ${godzina}) utworzona przez ${interaction.user.tag}`);
  },
};
