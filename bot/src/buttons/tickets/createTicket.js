// Przycisk "📩 Utwórz Ticket"
// Wyświetla menu wyboru kategorii ticketu (ephemeral)

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const logger = require('../../utils/logger');

// Dostępne kategorie ticketów
const TICKET_CATEGORIES = [
  {
    label: '🆘 Problem techniczny',
    description: 'Błąd techniczny, crash, lag, problem z grą',
    value: 'techniczny',
    emoji: '🆘',
  },
  {
    label: '❓ Pytanie do staffu',
    description: 'Masz pytanie do członka zespołu',
    value: 'pytanie',
    emoji: '❓',
  },
  {
    label: '⚖️ Apelacja od kary',
    description: 'Odwołanie od bana, muta lub ostrzeżenia',
    value: 'apelacja',
    emoji: '⚖️',
  },
  {
    label: '🚗 Problem z pojazdem / PJ',
    description: 'Zgłoszenie problemu z pojazdem lub postacią',
    value: 'pojazd',
    emoji: '🚗',
  },
  {
    label: '💼 Sprawa dot. pracy / służby',
    description: 'Kwestie dotyczące pracy lub służby w grze',
    value: 'praca',
    emoji: '💼',
  },
  {
    label: '😡 Skarga na gracza lub staffa',
    description: 'Zgłoszenie naruszenia regulaminu przez gracza lub staffa',
    value: 'skarga',
    emoji: '😡',
  },
];

module.exports = {
  async execute(interaction, client, prisma) {
    // Zbuduj opcje select menu z listy kategorii
    const options = TICKET_CATEGORIES.map(cat =>
      new StringSelectMenuOptionBuilder()
        .setLabel(cat.label)
        .setDescription(cat.description)
        .setValue(cat.value)
        .setEmoji(cat.emoji)
    );

    // Zbuduj select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Wybierz kategorię ticketu...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Odpowiedz ephemeralnie — widoczne tylko dla użytkownika
    await interaction.reply({
      content: '📋 **Wybierz kategorię swojego zgłoszenia:**\nZaraz po wyborze zostanie utworzony prywatny kanał z supportem.',
      components: [row],
      ephemeral: true,
    });

    logger.info(`Użytkownik ${interaction.user.tag} otworzył menu wyboru kategorii ticketu`);
  },
};
