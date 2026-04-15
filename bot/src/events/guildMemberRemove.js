// Event guildMemberRemove — członek opuszcza serwer
// Wysyła embed na #odloty

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  once: false,

  async execute(member, client, prisma) {
    try {
      const guild = member.guild;

      const joinedAt = member.joinedAt
        ? member.joinedAt.toLocaleDateString('pl-PL', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })
        : 'Nieznana';

      // Embed na #odloty
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('🛫 Odlot...')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setDescription(
          `**${member.user.username}** opuścił/a serwer.\n\n` +
          `📅 Był/a z nami od: **${joinedAt}**`
        )
        .setFooter({ text: 'AURORA Greenville RP — Pożegnanie' })
        .setTimestamp();

      const odlotyChannel = guild.channels.cache.find(
        c => c.name === '🛫│odloty' && c.isTextBased()
      );
      if (odlotyChannel) {
        await odlotyChannel.send({ embeds: [embed] });
      }

      // Log na #logi-członków
      const logChannel = guild.channels.cache.find(
        c => c.name === '👥│logi-członków' && c.isTextBased()
      );
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('👤 Członek opuścił serwer')
              .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
              .addFields(
                { name: 'Użytkownik', value: `${member.user.tag} (${member.id})`, inline: false },
                { name: 'Dołączył', value: joinedAt, inline: true },
                { name: 'Role', value: member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ') || 'Brak', inline: false }
              )
              .setTimestamp()
          ],
        });
      }

      logger.info(`Członek opuścił serwer: ${member.user.tag} (${member.id})`);
    } catch (error) {
      logger.error('Błąd w guildMemberRemove:', error);
    }
  },
};
