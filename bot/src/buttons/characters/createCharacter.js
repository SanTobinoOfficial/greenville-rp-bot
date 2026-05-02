// Przycisk "Stwórz postać" — dowód osobisty RP
// Otwiera modal z danymi postaci

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

module.exports = {
  async execute(interaction, client, prisma) {
    // Sprawdź czy jest zweryfikowany
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { character: true },
    });

    if (!user?.robloxId) {
      return interaction.reply({
        content: '❌ Musisz najpierw zweryfikować nick Roblox w kanale **#weryfikacja**.',
        ephemeral: true,
      });
    }

    if (user.character) {
      // Sprawdź czy może edytować (max 1x na 30 dni)
      const daysSinceUpdate = (Date.now() - user.character.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) {
        const nextEdit = new Date(user.character.updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        return interaction.reply({
          content: `❌ Możesz zmienić dane postaci dopiero <t:${Math.floor(nextEdit.getTime() / 1000)}:R>.\n\nID dokumentu: \`${user.character.documentId}\``,
          ephemeral: true,
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId('modal_character')
      .setTitle('📋 Tworzenie postaci RP');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('first_name')
          .setLabel('Imię postaci RP')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. Jan')
          .setMinLength(2)
          .setMaxLength(30)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('last_name')
          .setLabel('Nazwisko postaci RP')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. Kowalski')
          .setMinLength(2)
          .setMaxLength(40)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('age')
          .setLabel('Wiek postaci (18–80)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. 28')
          .setMinLength(2)
          .setMaxLength(2)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('wyglad')
          .setLabel('Wygląd postaci')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. Wysoki, ciemne włosy, niebieskie oczy, 185 cm')
          .setMinLength(10)
          .setMaxLength(200)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('historia')
          .setLabel('Historia i osobowość postaci')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Kim jest Twoja postać? Skąd pochodzi, co robi w Greenville? Jaki ma charakter?')
          .setMinLength(30)
          .setMaxLength(500)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
  },
};
