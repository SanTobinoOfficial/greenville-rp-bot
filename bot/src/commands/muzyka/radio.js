// Komenda /radio — wróć do trybu radiowego RMF MAXX

const { SlashCommandBuilder } = require('discord.js');
const { stop } = require('../../music/player');
const { startRadio } = require('../../music/radioManager');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Wróć do trybu radiowego RMF MAXX (Staff)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień.', ephemeral: true });
    }

    stop(interaction.guild.id);
    await startRadio(client, interaction.guild);

    await interaction.reply({ content: '📻 Powrócono do trybu radiowego **RMF MAXX**.' });
  },
};
