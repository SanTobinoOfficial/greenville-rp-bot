// Przycisk "Zweryfikuj się" — pierwszy krok weryfikacji
// Otwiera modal z polem na nick Roblox

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  async execute(interaction, client, prisma) {
    // Sprawdź czy już w pełni zweryfikowany (ma Mieszkaniec)
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const hasMieszkaniee = member.roles.cache.some(r => r.name === 'Mieszkaniec');
    if (hasMieszkaniee) {
      return interaction.reply({
        content: '✅ Jesteś już zweryfikowany! Masz rolę **Mieszkaniec**.',
        ephemeral: true,
      });
    }

    // Sprawdź czy nick Roblox już powiązany — jeśli tak, przejdź od razu do quizu
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (user?.robloxId) {
      // Nick już zweryfikowany — wyślij quiz bezpośrednio
      const { startQuiz } = require('../../utils/quizEngine');
      return startQuiz(interaction, client, prisma, user);
    }

    // Brak nicku — pokaż modal
    const modal = new ModalBuilder()
      .setCustomId('modal_verification')
      .setTitle('Weryfikacja — Greenville RP');

    const nickInput = new TextInputBuilder()
      .setCustomId('roblox_nick')
      .setLabel('Nick Roblox')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Wpisz swój dokładny nick na Roblox...')
      .setMinLength(3)
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nickInput));
    await interaction.showModal(modal);
  },
};
