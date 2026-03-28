// Przycisk "Złóż wniosek o prawo jazdy"
// Wyświetla efemeryczne menu wyboru kategorii prawa jazdy (StringSelectMenu)

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

// Dostępne kategorie prawa jazdy w Polsce
const LICENSE_CATEGORIES = [
  {
    value: 'AM',
    label: 'Kategoria AM',
    description: 'Motorower, lekki czterokołowiec (do 45 km/h)',
    emoji: '🛵',
  },
  {
    value: 'A1',
    label: 'Kategoria A1',
    description: 'Motocykl do 125 cm³ i 11 kW',
    emoji: '🏍️',
  },
  {
    value: 'A2',
    label: 'Kategoria A2',
    description: 'Motocykl do 35 kW',
    emoji: '🏍️',
  },
  {
    value: 'A',
    label: 'Kategoria A',
    description: 'Motocykl bez ograniczeń',
    emoji: '🏍️',
  },
  {
    value: 'B',
    label: 'Kategoria B',
    description: 'Samochód osobowy (do 3,5 t)',
    emoji: '🚗',
  },
  {
    value: 'C',
    label: 'Kategoria C',
    description: 'Pojazd ciężarowy (powyżej 3,5 t)',
    emoji: '🚛',
  },
  {
    value: 'D',
    label: 'Kategoria D',
    description: 'Autobus (powyżej 8 miejsc)',
    emoji: '🚌',
  },
];

module.exports = {
  /**
   * Obsługa przycisku "Złóż wniosek o prawo jazdy"
   * Otwiera efemeryczne menu wyboru kategorii
   */
  async execute(interaction, client, prisma) {
    // Budowanie opcji select menu z dostępnych kategorii
    const options = LICENSE_CATEGORIES.map(cat =>
      new StringSelectMenuOptionBuilder()
        .setValue(cat.value)
        .setLabel(cat.label)
        .setDescription(cat.description)
        .setEmoji(cat.emoji)
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('license_select')
      .setPlaceholder('Wybierz kategorię prawa jazdy...')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Odpowiedź efemeryczna — widoczna tylko dla użytkownika
    await interaction.reply({
      content: '🪪 **Wniosek o prawo jazdy**\nWybierz kategorię, na którą chcesz zdawać egzamin:',
      components: [row],
      ephemeral: true,
    });
  },
};
