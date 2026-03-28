// Komenda /numer-info — Staff sprawdza właściciela numeru telefonu RP

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('numer-info')
    .setDescription('Sprawdź właściciela numeru telefonu RP (Staff)')
    .addStringOption(opt =>
      opt.setName('numer')
        .setDescription('Numer telefonu do sprawdzenia')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień (wymagane: Helper+).', ephemeral: true });
    }

    const numer = interaction.options.getString('numer').trim();

    const user = await prisma.user.findUnique({
      where: { phoneNumber: numer },
      include: { character: true },
    });

    if (!user) {
      return interaction.reply({
        content: `❌ Numer **${numer}** nie jest przypisany do żadnego gracza.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3B82F6)
      .setTitle(`📱 Informacje o numerze — ${numer}`)
      .addFields(
        { name: '👤 Discord', value: `<@${user.discordId}> (${user.discordUsername})`, inline: false },
        { name: '🎮 Nick Roblox', value: user.robloxUsername || 'Brak', inline: true },
      )
      .setTimestamp();

    if (user.character) {
      embed.addFields({
        name: '🪪 Postać RP',
        value: `${user.character.firstName} ${user.character.lastName}`,
        inline: true,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
