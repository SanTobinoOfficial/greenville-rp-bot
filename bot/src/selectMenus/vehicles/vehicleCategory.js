// Select menu — wybór kategorii pojazdu
// Po wyborze pokazuje listę modeli z tej kategorii

const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const { getByCategory, KONESER_LIMIT, formatPrice } = require('../../data/greenvilleVehicles');

module.exports = {
  async execute(interaction, client, prisma) {
    const selectedCategory = interaction.values[0];
    const byCategory = getByCategory();
    const vehicles = byCategory[selectedCategory] || [];

    if (vehicles.length === 0) {
      return interaction.update({ content: '❌ Brak pojazdów w tej kategorii.', components: [], embeds: [] });
    }

    // Max 25 opcji w select menu
    const options = vehicles.slice(0, 25).map(v =>
      new StringSelectMenuOptionBuilder()
        .setLabel(`${v.marka} ${v.model} (${v.rok})`)
        .setValue(v.id)
        .setDescription(`${formatPrice(v.wartosc)}${v.wartosc > KONESER_LIMIT ? ' — 💎 Wymaga Koneser Aut' : ''}`)
        .setEmoji(v.wartosc > KONESER_LIMIT ? '💎' : '🚗')
    );

    const select = new StringSelectMenuBuilder()
      .setCustomId('vehicle_select')
      .setPlaceholder(`Wybierz model (${selectedCategory})...`)
      .addOptions(options);

    const koneserCount = vehicles.filter(v => v.wartosc > KONESER_LIMIT).length;

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle(`🚗 ${selectedCategory} — Wybierz model`)
          .setDescription(`Dostępnych modeli: **${vehicles.length}**${koneserCount > 0 ? ` (w tym 💎 ${koneserCount} wymagających roli **Koneser Aut**)` : ''}`)
          .setFooter({ text: 'AURORA Greenville RP — Rejestracja pojazdów' }),
      ],
      components: [new ActionRowBuilder().addComponents(select)],
    });
  },
};
