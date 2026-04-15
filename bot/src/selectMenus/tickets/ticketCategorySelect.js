// Select menu "ticket_category"
// Obsługuje wybór kategorii ticketu i tworzy prywatny kanał

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const logger = require('../../utils/logger');

// Nazwy wyświetlane kategorii (value → etykieta PL)
const CATEGORY_LABELS = {
  techniczny: '🆘 Problem techniczny',
  pytanie:    '❓ Pytanie do staffu',
  apelacja:   '⚖️ Apelacja od kary',
  pojazd:     '🚗 Problem z pojazdem / PJ',
  praca:      '💼 Sprawa dot. pracy / służby',
  skarga:     '😡 Skarga na gracza lub staffa',
};

// Role które mogą widzieć i obsługiwać tickety
const STAFF_ROLE_NAMES = [
  'Helper',
  'HR',
  'Host',
  'Moderator',
  'Administrator',
  'Co-Owner',
  'Owner',
];

module.exports = {
  async execute(interaction, client, prisma) {
    // Pobierz wybraną kategorię
    const category = interaction.values[0];
    const categoryLabel = CATEGORY_LABELS[category] ?? category;

    await interaction.deferReply({ ephemeral: true });

    // Sprawdź czy użytkownik posiada konto w bazie
    let user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    // Jeśli konto nie istnieje — utwórz podstawowy rekord
    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: interaction.user.id,
          discordUsername: interaction.user.username,
        },
      });
    }

    // Sprawdź czy użytkownik ma już otwarty ticket
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        userId: user.id,
        status: 'OPEN',
      },
    });

    if (existingTicket) {
      // Znajdź istniejący kanał na serwerze
      const existingChannel = interaction.guild.channels.cache.get(existingTicket.channelId);
      const channelMention = existingChannel ? `<#${existingTicket.channelId}>` : `#ticket-${String(existingTicket.ticketNumber).padStart(4, '0')}`;

      return interaction.editReply({
        content: `❌ Masz już otwarty ticket! Przejdź do ${channelMention} aby kontynuować.\nJeśli chcesz otworzyć nowe zgłoszenie, najpierw zamknij poprzedni ticket.`,
      });
    }

    // Utwórz ticket w bazie — pobieramy numer z autoincrement
    const ticket = await prisma.ticket.create({
      data: {
        userId: user.id,
        channelId: 'pending', // tymczasowo, zaktualizujemy po utworzeniu kanału
        category,
        status: 'OPEN',
      },
    });

    // Numer ticketu wypełniony zerami do 4 cyfr
    const ticketNumber = String(ticket.ticketNumber).padStart(4, '0');
    const channelName = `ticket-${ticketNumber}`;

    // Zbierz ID ról staffowych istniejących na serwerze
    const staffRoles = interaction.guild.roles.cache.filter(r =>
      STAFF_ROLE_NAMES.includes(r.name)
    );

    // Zbuduj tablicę uprawnień dla kanału
    // 1. @everyone — brak dostępu
    const permissionOverwrites = [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      // 2. Twórca ticketu — może widzieć i pisać
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
    ];

    // 3. Każda rola staffowa — pełny dostęp do kanału
    staffRoles.forEach(role => {
      permissionOverwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.AttachFiles,
        ],
      });
    });

    // Znajdź kategorię kanałów "Tickety" (jeśli istnieje) dla porządku
    const ticketCategory = interaction.guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('ticket')
    );

    // Utwórz prywatny kanał tekstowy
    let ticketChannel;
    try {
      ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: ticketCategory?.id ?? null,
        topic: `Ticket #${ticketNumber} | Kategoria: ${categoryLabel} | Użytkownik: ${interaction.user.tag}`,
        permissionOverwrites,
      });
    } catch (err) {
      logger.error(`Błąd tworzenia kanału ticketu #${ticketNumber}:`, err.message);

      // Usuń rekord z bazy jeśli kanał się nie utworzył
      await prisma.ticket.delete({ where: { id: ticket.id } });

      return interaction.editReply({
        content: '❌ Wystąpił błąd podczas tworzenia kanału ticketu. Spróbuj ponownie lub skontaktuj się z administracją.',
      });
    }

    // Zaktualizuj channelId w bazie
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { channelId: ticketChannel.id },
    });

    // Zbuduj embed powitalny w kanale ticketu
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎫 Ticket #${ticketNumber} — ${categoryLabel}`)
      .setDescription(
        `Dzień dobry! Opisz swój problem, a staff się z Tobą skontaktuje.\n\n` +
        `👤 **Zgłaszający:** ${interaction.user}\n` +
        `📂 **Kategoria:** ${categoryLabel}\n` +
        `🕐 **Otwarto:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setFooter({ text: `AURORA Greenville RP • Ticket #${ticketNumber}` })
      .setTimestamp();

    // Przyciski akcji w kanale ticketu
    const closeButton = new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('✅ Zamknij ticket')
      .setStyle(ButtonStyle.Success);

    const claimButton = new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('🔒 Przejmij ticket')
      .setStyle(ButtonStyle.Primary);

    const actionRow = new ActionRowBuilder().addComponents(closeButton, claimButton);

    // Wyślij embed do nowego kanału z pingiem użytkownika
    await ticketChannel.send({
      content: `${interaction.user} — Twój ticket został utworzony. Staff wkrótce się z Tobą skontaktuje.`,
      embeds: [embed],
      components: [actionRow],
    });

    // Odpowiedz użytkownikowi z linkiem do kanału (ephemeral)
    await interaction.editReply({
      content: `✅ Ticket został utworzony! Przejdź do <#${ticketChannel.id}> aby opisać swój problem.`,
    });

    logger.info(`Ticket #${ticketNumber} (${category}) utworzony przez ${interaction.user.tag} — kanał: ${channelName}`);
  },
};
