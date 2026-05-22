// Komenda /ping — latencja bota i API

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Sprawdź latencję bota i API Discord'),

  async execute(interaction, client, prisma) {
    const start = Date.now();
    await interaction.deferReply({ ephemeral: true });
    const latency = Date.now() - start;
    const wsLatency = client.ws.ping;

    const pingEmoji = wsLatency < 100 ? '🟢' : wsLatency < 250 ? '🟡' : '🔴';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: `${pingEmoji} WebSocket`, value: `${wsLatency}ms`, inline: true },
        { name: '⚡ Odpowiedź', value: `${latency}ms`, inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — Bot Status' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
