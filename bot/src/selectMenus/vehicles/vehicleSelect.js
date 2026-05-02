// Select menu — wybór konkretnego modelu pojazdu
// Po wyborze otwiera modal z tablicą, kolorem i opisem

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { getVehicleById, KONESER_LIMIT, formatPrice } = require('../../data/greenvilleVehicles');

module.exports = {
  async execute(interaction, client, prisma) {
    const vehicleId = interaction.values[0];
    const vehicle   = getVehicleById(vehicleId);

    if (!vehicle) {
      return interaction.update({ content: '❌ Nieznany pojazd.', components: [], embeds: [] });
    }

    // Sprawdź rolę Koneser Aut jeśli wymagana
    if (vehicle.wartosc > KONESER_LIMIT) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const hasRole = member.roles.cache.some(r => r.name === 'Koneser Aut');
      if (!hasRole) {
        return interaction.update({
          embeds: [],
          components: [],
          content:
            `❌ **${vehicle.marka} ${vehicle.model}** kosztuje **${formatPrice(vehicle.wartosc)}** i wymaga roli 💎 **Koneser Aut**.\n\n` +
            `Pojazdy o wartości powyżej **${formatPrice(KONESER_LIMIT)}** są dostępne wyłącznie dla posiadaczy tej roli.`,
        });
      }
    }

    // Otwórz modal — customId zawiera vehicleId
    const modal = new ModalBuilder()
      .setCustomId(`modal_vehicle_${vehicleId}`)
      .setTitle(`🚗 Rejestracja: ${vehicle.marka} ${vehicle.model}`);

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('tablica')
          .setLabel('Tablica rejestracyjna RP')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. GV 123 AB')
          .setMinLength(3)
          .setMaxLength(12)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('kolor')
          .setLabel('Kolor pojazdu')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. Czarny / Metaliczny Szary / #1A1A1A')
          .setMinLength(2)
          .setMaxLength(40)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('opis')
          .setLabel('Dodatkowe uwagi (opcjonalne)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Modyfikacje, uwagi, dodatkowe informacje...')
          .setRequired(false)
          .setMaxLength(300)
      )
    );

    await interaction.showModal(modal);
  },
};
