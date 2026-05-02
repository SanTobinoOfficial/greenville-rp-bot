// Select menu — wybór kategorii pojazdu
// Po wyborze pokazuje listę modeli z tej kategorii

const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');
const {
  getByCategory,
  getRequiredRole,
  CATEGORY_EMOJIS,
  formatPrice,
} = require('../../data/greenvilleVehicles');

// Emoji i skrót dla każdego typu wymagania
const TYPE_BADGE = {
  KONESER: { emoji: '💎', label: 'Koneser Aut' },
  KLASYK:  { emoji: '🏛️', label: 'Kolekcjoner Aut' },
  POLICJA: { emoji: '🚔', label: 'Policja' },
  STRAZ:   { emoji: '🚒', label: 'Straż' },
  EMS:     { emoji: '🚑', label: 'EMS' },
  DOT:     { emoji: '🚧', label: 'DOT' },
};

module.exports = {
  async execute(interaction, client, prisma) {
    const selectedCategory = interaction.values[0];
    const byCategory = getByCategory();
    const vehicles = byCategory[selectedCategory] || [];

    if (vehicles.length === 0) {
      return interaction.update({ content: '❌ Brak pojazdów w tej kategorii.', components: [], embeds: [] });
    }

    // Max 25 opcji w select menu
    const options = vehicles.slice(0, 25).map(v => {
      const badge   = TYPE_BADGE[v.typ];
      const roleNote = badge ? ` — ${badge.emoji} Wymaga ${badge.label}` : '';
      const itemEmoji = badge ? badge.emoji : '🚗';
      return new StringSelectMenuOptionBuilder()
        .setLabel(v.nazwa.slice(0, 100))
        .setValue(v.id)
        .setDescription(`${formatPrice(v.cena)}${roleNote}`.slice(0, 100))
        .setEmoji(itemEmoji);
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId('vehicle_select')
      .setPlaceholder(`Wybierz model (${selectedCategory})...`)
      .addOptions(options);

    // Licz pojazdy z wymaganiami
    const restricted = vehicles.filter(v => v.typ !== 'CIVILIAN').length;
    const catEmoji   = CATEGORY_EMOJIS[selectedCategory] || '🚗';

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle(`${catEmoji} ${selectedCategory} — Wybierz model`)
          .setDescription(
            `Dostępnych modeli: **${vehicles.length}**` +
            (restricted > 0 ? `\n⚠️ **${restricted}** z nich wymaga specjalnej roli.` : '')
          )
          .setFooter({ text: 'AURORA Greenville RP — Rejestracja pojazdów' }),
      ],
      components: [new ActionRowBuilder().addComponents(select)],
    });
  },
};
