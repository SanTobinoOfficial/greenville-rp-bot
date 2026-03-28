// Komenda /mój-numer — gracz sprawdza swój numer telefonu RP

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mój-numer')
    .setDescription('Sprawdź swój numer telefonu RP'),

  async execute(interaction, client, prisma) {
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user?.phoneNumber) {
      return interaction.reply({
        content: '❌ Nie masz przypisanego numeru telefonu. Zweryfikuj się w **#weryfikacja**.',
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `📱 Twój numer telefonu RP: **\`${user.phoneNumber}\`**`,
      ephemeral: true,
    });
  },
};
