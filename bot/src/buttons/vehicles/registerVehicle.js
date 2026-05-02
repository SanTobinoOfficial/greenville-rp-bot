// Przycisk "Zarejestruj pojazd"
// Otwiera select menu z kategoriami pojazdów

const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const { getCategories, KONESER_LIMIT } = require('../../data/greenvilleVehicles');

const CATEGORY_EMOJIS = {
  'Ekonomiczne': '🚙',
  'Sedany':      '🚗',
  'SUV':         '🚐',
  'Pickupy':     '🛻',
  'Sportowe':    '🏎️',
  'Luksusowe':   '💎',
  'Vany':        '🚌',
  'Elektryczne': '⚡',
};

module.exports = {
  async execute(interaction, client, prisma) {
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user?.robloxId) {
      return interaction.reply({
        content: '❌ Musisz być zweryfikowany, aby zarejestrować pojazd.',
        ephemeral: true,
      });
    }

    const categories = getCategories();

    const select = new StringSelectMenuBuilder()
      .setCustomId('vehicle_category')
      .setPlaceholder('Wybierz kategorię pojazdu...')
      .addOptions(
        categories.map(cat =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat)
            .setValue(cat)
            .setEmoji(CATEGORY_EMOJIS[cat] || '🚗')
            .setDescription(cat === 'Luksusowe' ? `Wymaga roli "Koneser Aut" (wartość > ${(KONESER_LIMIT/1000).toFixed(0)}k $)` : `Pojazdy kategorii ${cat}`)
        )
      );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('🚗 Rejestracja Pojazdu — Wybór Kategorii')
          .setDescription('Wybierz kategorię pojazdu z listy poniżej, aby zobaczyć dostępne modele.')
          .addFields({
            name: '💎 Pojazdy luksusowe',
            value: `Pojazdy o wartości powyżej **${(KONESER_LIMIT/1000).toFixed(0)} 000 $** wymagają roli **Koneser Aut**.`,
            inline: false,
          })
          .setFooter({ text: 'AURORA Greenville RP — Rejestracja pojazdów' }),
      ],
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true,
    });
  },
};
