// Select menu — wybór kategorii prawa jazdy
// Po wyborze: walidacja weryfikacji i duplikatu, start egzaminu teoretycznego

const logger = require('../../utils/logger');
const { startDrivingExam } = require('../../utils/drivingExamEngine');

module.exports = {
  /**
   * Obsługa select menu wyboru kategorii prawa jazdy
   * @param {import('discord.js').StringSelectMenuInteraction} interaction
   */
  async execute(interaction, client, prisma) {
    const kategoria  = interaction.values[0];
    const discordId  = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    // === 1. Sprawdź czy użytkownik jest zweryfikowany ===
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { licenses: { where: { kategoria } } },
    });

    if (!user || !user.robloxId) {
      return interaction.editReply({
        content:
          '❌ **Nie jesteś zweryfikowany!**\n' +
          'Aby przystąpić do egzaminu na prawo jazdy, najpierw zweryfikuj swoje konto Roblox.\n' +
          'Użyj przycisku weryfikacji na kanale startowym.',
      });
    }

    // === 2. Sprawdź czy użytkownik już posiada tę kategorię ===
    const existingLicense = user.licenses[0];

    if (existingLicense) {
      if (existingLicense.status === 'ACTIVE') {
        return interaction.editReply({
          content: `❌ **Posiadasz już prawo jazdy kategorii ${kategoria}!**\nNie możesz ponownie przystąpić do egzaminu na tę samą kategorię.`,
        });
      }
      if (existingLicense.status === 'SUSPENDED') {
        return interaction.editReply({
          content: `❌ **Twoje prawo jazdy kategorii ${kategoria} jest zawieszone.**\nNie możesz przystąpić do egzaminu podczas zawieszenia.`,
        });
      }
      // REVOKED — można zdawać ponownie
      logger.info(`Użytkownik ${interaction.user.tag} zdaje ponowny egzamin PJ ${kategoria} (poprzednie unieważnione)`);
    }

    // === 3. Przekieruj do silnika egzaminu teoretycznego ===
    // startDrivingExam korzysta z interaction.editReply (bo deferReply już wykonano)
    await startDrivingExam(interaction, client, prisma, user, kategoria);
  },
};
