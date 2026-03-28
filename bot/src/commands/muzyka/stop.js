// Komenda /stop — zatrzymaj muzykę (bot pozostaje na kanale)

const { SlashCommandBuilder } = require('discord.js');
const { stop } = require('../../music/player');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Zatrzymaj muzykę (Staff)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień.', ephemeral: true });
    }

    stop(interaction.guild.id);
    await interaction.reply({ content: '⏹️ Muzyka zatrzymana.' });
  },
};
