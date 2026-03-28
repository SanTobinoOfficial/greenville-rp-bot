// Event voiceStateUpdate — zmiany na kanałach głosowych
// Loguje wejścia, wyjścia i przeniesienia

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,

  async execute(oldState, newState, client, prisma) {
    try {
      const guild = newState.guild || oldState.guild;
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;

      const logChannel = guild.channels.cache.find(
        c => c.name === '🔊│logi-głosowe' && c.isTextBased()
      );
      if (!logChannel) return;

      let title, description, color;

      if (!oldState.channel && newState.channel) {
        // Dołączył do kanału
        title = '🔊 Dołączono do kanału głosowego';
        description = `**${member.user.tag}** dołączył/a do **${newState.channel.name}**`;
        color = 0x57F287;

      } else if (oldState.channel && !newState.channel) {
        // Opuścił kanał
        title = '🔇 Opuszczono kanał głosowy';
        description = `**${member.user.tag}** opuścił/a **${oldState.channel.name}**`;
        color = 0xED4245;

      } else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
        // Przeniesiony między kanałami
        title = '🔄 Przeniesiono między kanałami';
        description = `**${member.user.tag}** przeniósł/a się z **${oldState.channel.name}** → **${newState.channel.name}**`;
        color = 0xFEE75C;

      } else {
        return; // Brak istotnej zmiany (mute/deafen)
      }

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .addFields({ name: 'Użytkownik', value: `${member.user.tag} (<@${member.id}>)`, inline: true })
            .setTimestamp()
        ],
      });
    } catch (error) {
      logger.error('Błąd w voiceStateUpdate:', error);
    }
  },
};
