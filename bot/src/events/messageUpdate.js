// Event messageUpdate — edytowane wiadomości
// Loguje oryginalną treść na #logi-wiadomości

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  once: false,

  async execute(oldMessage, newMessage, client, prisma) {
    try {
      if (oldMessage.partial) return;
      if (newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return;

      const guild = newMessage.guild;
      if (!guild) return;

      const logChannel = guild.channels.cache.find(
        c => c.name === '🗑️│logi-wiadomości' && c.isTextBased()
      );
      if (!logChannel) return;

      const oldContent = oldMessage.content || '*Brak treści*';
      const newContent = newMessage.content || '*Brak treści*';

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('✏️ Wiadomość edytowana')
            .addFields(
              { name: 'Autor', value: `${newMessage.author.tag} (<@${newMessage.author.id}>)`, inline: true },
              { name: 'Kanał', value: `<#${newMessage.channelId}>`, inline: true },
              { name: 'Poprzednia treść', value: oldContent.slice(0, 1000), inline: false },
              { name: 'Nowa treść', value: newContent.slice(0, 1000), inline: false },
            )
            .setURL(newMessage.url)
            .setTimestamp()
        ],
      });
    } catch (error) {
      logger.error('Błąd w messageUpdate:', error);
    }
  },
};
