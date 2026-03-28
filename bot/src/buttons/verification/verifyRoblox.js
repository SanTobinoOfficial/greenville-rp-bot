// Przycisk "Zweryfikuj nick Roblox"
// Otwiera modal z polem na nick Roblox

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  async execute(interaction, client, prisma) {
    // Sprawdź czy już zweryfikowany
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (user?.robloxId) {
      return interaction.reply({
        content: `✅ Twój nick Roblox jest już zweryfikowany jako **${user.robloxUsername}**.`,
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_verify_roblox')
      .setTitle('Weryfikacja nicku Roblox');

    const nickInput = new TextInputBuilder()
      .setCustomId('roblox_nick')
      .setLabel('Nick Roblox')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Wpisz swój dokładny nick Roblox...')
      .setMinLength(3)
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nickInput));

    await interaction.showModal(modal);
  },
};
