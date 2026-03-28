// Event messageDelete — usunięte wiadomości
// Loguje treść usuniętej wiadomości na #logi-wiadomości

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  once: false,

  async execute(message, client, prisma) {
    try {
      if (message.author?.bot) return;
      if (!message.guild) return;

      const logChannel = message.guild.channels.cache.find(
        c => c.name === '🗑️│logi-wiadomości' && c.isTextBased()
      );
      if (!logChannel) return;

      const content = message.content || '*Brak treści lub wiadomość z załącznikiem*';

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🗑️ Wiadomość usunięta')
            .addFields(
              { name: 'Autor', value: message.author ? `${message.author.tag} (<@${message.author.id}>)` : 'Nieznany', inline: true },
              { name: 'Kanał', value: `<#${message.channelId}>`, inline: true },
              { name: 'Treść', value: content.slice(0, 1000), inline: false },
            )
            .setTimestamp()
        ],
      });
    } catch (error) {
      logger.error('Błąd w messageDelete:', error);
    }
  },
};
