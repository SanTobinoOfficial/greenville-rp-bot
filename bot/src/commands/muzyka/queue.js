// Komenda /queue — pokaż kolejkę muzyczną

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../../music/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Wyświetl kolejkę muzyczną'),

  async execute(interaction, client, prisma) {
    const queue = getQueue(interaction.guild.id);

    if (!queue?.currentTrack && (!queue?.tracks || queue.tracks.length === 0)) {
      return interaction.reply({
        content: queue?.isRadioMode ? '📻 Aktualnie gra: **Radio RMF MAXX**' : '❌ Kolejka jest pusta.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎵 Kolejka muzyczna')
      .setFooter({ text: 'Greenville RP — Muzyka' })
      .setTimestamp();

    if (queue.currentTrack) {
      embed.addFields({
        name: '▶️ Aktualnie gra',
        value: `**${queue.currentTrack.title}** — dodał: ${queue.currentTrack.requestedBy}`,
        inline: false,
      });
    }

    if (queue.tracks.length > 0) {
      const trackList = queue.tracks.slice(0, 10).map((t, i) =>
        `**${i + 1}.** ${t.title} — ${t.requestedBy}`
      ).join('\n');

      embed.addFields({
        name: `📋 Następne (${queue.tracks.length})`,
        value: trackList,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
