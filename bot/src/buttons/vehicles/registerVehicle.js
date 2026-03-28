// Przycisk "Zarejestruj pojazd"
// Otwiera modal rejestracji

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

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

    const modal = new ModalBuilder()
      .setCustomId('modal_vehicle')
      .setTitle('🚗 Rejestracja Pojazdu RP');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('marka_model')
          .setLabel('Marka i model (np. Ford Mustang GT)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Marka Model...')
          .setMinLength(3)
          .setMaxLength(60)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('rok')
          .setLabel('Rok produkcji')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. 2020')
          .setMinLength(4)
          .setMaxLength(4)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('kolor')
          .setLabel('Kolor pojazdu')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. Czerwony / #FF0000')
          .setMinLength(2)
          .setMaxLength(40)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('opis')
          .setLabel('Opis / uwagi (opcjonalne)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Dodatkowe informacje o pojeździe...')
          .setRequired(false)
          .setMaxLength(300)
      )
    );

    await interaction.showModal(modal);
  },
};
