// Komenda /skip — pomiń aktualny utwór

const { SlashCommandBuilder } = require('discord.js');
const { skip, getQueue } = require('../../music/player');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Pomiń aktualny utwór (Staff)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień.', ephemeral: true });
    }

    const queue = getQueue(interaction.guild.id);
    if (!queue?.currentTrack) {
      return interaction.reply({ content: '❌ Nic nie jest aktualnie odtwarzane.', ephemeral: true });
    }

    const skipped = skip(interaction.guild.id);
    await interaction.reply({
      content: skipped ? '⏭️ Pominięto utwór.' : '❌ Nie można pominąć.',
      ephemeral: true,
    });
  },
};
