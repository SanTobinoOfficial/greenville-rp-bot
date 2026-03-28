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
          .setCustomId('birth_date')
          .setLabel('Data urodzenia (DD.MM.RRRR)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. 15.06.1995')
          .setMinLength(10)
          .setMaxLength(10)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('gender')
          .setLabel('Płeć (M / K)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('M lub K')
          .setMinLength(1)
          .setMaxLength(1)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('appearance')
          .setLabel('Kolor oczu / włosów (opcjonalne)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('np. Oczy: niebieskie, Włosy: brązowe')
          .setRequired(false)
          .setMaxLength(100)
      )
    );

    await interaction.showModal(modal);
  },
};
