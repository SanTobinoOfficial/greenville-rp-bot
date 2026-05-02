// Select menu — wybór konkretnego modelu pojazdu
// Po wyborze otwiera modal z tablicą, kolorem i opisem

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { getVehicleById, getRequiredRole, formatPrice } = require('../../data/greenvilleVehicles');

// Emoji per typ roli
const ROLE_EMOJI = {
  KONESER: '💎',
  KLASYK:  '🏛️',
  POLICJA: '🚔',
  STRAZ:   '🚒',
  EMS:     '🚑',
  DOT:     '🚧',
};

module.exports = {
  async execute(interaction, client, prisma) {
    const vehicleId = interaction.values[0];
    const vehicle   = getVehicleById(vehicleId);

    if (!vehicle) {
      return interaction.update({ content: '❌ Nieznany pojazd.', components: [], embeds: [] });
    }

    // Sprawdź wymaganą rolę
    const requiredRole = getRequiredRole(vehicle);
    if (requiredRole) {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const hasRole = member.roles.cache.some(r => r.name === requiredRole);
      if (!hasRole) {
        const emoji = ROLE_EMOJI[vehicle.typ] || '🔒';
        return interaction.update({
          embeds: [],
          components: [],
          content:
            `❌ **${vehicle.nazwa}** (${formatPrice(vehicle.cena)}) wymaga roli ${emoji} **${requiredRole}**.\n\n` +
            `Nie posiadasz wymaganej roli, aby zarejestrować ten pojazd.`,
        });
      }
    }

    // Otwórz modal — customId zawiera vehicleId
    const modal = new ModalBuilder()
      .setCustomId(`modal_vehicle_${vehicleId}`)
      .setTitle(`🚗 ${vehicle.nazwa}`.slice(0, 45));

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
