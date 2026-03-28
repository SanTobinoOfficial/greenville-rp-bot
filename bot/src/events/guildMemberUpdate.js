// Event guildMemberUpdate — zmiany nicku i ról
// Loguje na #logi-nicków i #logi-ról

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberUpdate',
  once: false,

  async execute(oldMember, newMember, client, prisma) {
    try {
      const guild = newMember.guild;

      // ==================== ZMIANA NICKU ====================
      if (oldMember.nickname !== newMember.nickname) {
        const nickLogChannel = guild.channels.cache.find(
          c => c.name === '✏️│logi-nicków' && c.isTextBased()
        );
        if (nickLogChannel) {
          await nickLogChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('✏️ Zmiana pseudonimu')
                .addFields(
                  { name: 'Użytkownik', value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: false },
                  { name: 'Poprzedni nick', value: oldMember.nickname || '*Brak*', inline: true },
                  { name: 'Nowy nick', value: newMember.nickname || '*Brak*', inline: true },
                )
                .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
            ],
          });
        }
      }

      // ==================== ZMIANY RÓL ====================
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      if (addedRoles.size === 0 && removedRoles.size === 0) return;

      const roleLogChannel = guild.channels.cache.find(
        c => c.name === '📋│logi-ról' && c.isTextBased()
      );
      if (!roleLogChannel) return;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Zmiana ról')
        .addFields(
          { name: 'Użytkownik', value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: false }
        )
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      if (addedRoles.size > 0) {
        embed.addFields({
          name: '✅ Dodane role',
          value: addedRoles.map(r => r.toString()).join(', '),
          inline: false,
        });
      }
      if (removedRoles.size > 0) {
        embed.addFields({
          name: '❌ Usunięte role',
          value: removedRoles.map(r => r.toString()).join(', '),
          inline: false,
        });
      }

      await roleLogChannel.send({ embeds: [embed] });

    } catch (error) {
      logger.error('Błąd w guildMemberUpdate:', error);
    }
  },
};
