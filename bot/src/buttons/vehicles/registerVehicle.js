// Przycisk "Zarejestruj pojazd"
// Otwiera select menu z kategoriami pojazdów

const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const { getCategories, CATEGORY_EMOJIS } = require('../../data/greenvilleVehicles');

// Opisy kategorii specjalnych
const CATEGORY_DESCRIPTIONS = {
  'Luksusowe': 'Wymaga roli "Koneser Aut"',
  'Klasyki':   'Wymaga roli "Kolekcjoner Aut"',
  'Policja':   'Wymaga roli "Policja"',
  'Straż':     'Wymaga roli "Straż"',
  'EMS':       'Wymaga roli "EMS"',
  'DOT':       'Wymaga roli "DOT"',
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
            .setDescription(CATEGORY_DESCRIPTIONS[cat] || `Pojazdy kategorii ${cat}`)
        )
      );

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('🚗 Rejestracja Pojazdu — Wybór Kategorii')
          .setDescription('Wybierz kategorię pojazdu z listy poniżej, aby zobaczyć dostępne modele.')
          .addFields(
            { name: '💎 Koneser Aut',     value: 'Luksusowe pojazdy (powyżej 100 000 $)',          inline: true },
            { name: '🏛️ Kolekcjoner Aut', value: 'Klasyczne / vintage pojazdy',                    inline: true },
            { name: '🔒 Służby',           value: 'Policja / Straż / EMS / DOT — tylko dla służb', inline: true },
          )
          .setFooter({ text: 'AURORA Greenville RP — Rejestracja pojazdów' }),
      ],
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true,
    });
  },
};
