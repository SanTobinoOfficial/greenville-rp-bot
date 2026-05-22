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
          c => c.isTextBased() && c.name.toLowerCase().includes('logi-nick')
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

      // ==================== NITRO BOOST ====================
      const wasBooster = oldMember.premiumSince != null;
      const isBooster  = newMember.premiumSince != null;

      if (!wasBooster && isBooster) {
        // Właśnie doboostował serwer
        const boosterRole = guild.roles.cache.find(r => r.name === 'Nitro Booster');
        if (boosterRole && !newMember.roles.cache.has(boosterRole.id)) {
          await newMember.roles.add(boosterRole, 'Auto: Nitro Boost').catch(() => {});
        }
        try {
          await newMember.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF73FA)
                .setTitle('💜 Dziękujemy za Nitro Boost!')
                .setDescription(
                  `Hej **${newMember.user.username}**! 🚀\n\n` +
                  `Bardzo dziękujemy za wsparcie serwera AURORA Greenville RP boostem!\n` +
                  `Jako podzięka masz dostęp do kanału **#vip-lounge** i rolę **Nitro Booster** 💜`
                )
                .setFooter({ text: 'AURORA Greenville RP — Dziękujemy!' })
                .setTimestamp()
            ]
          });
        } catch {}

        const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
        const boostCh = guild.channels.cache.find(
          c => c.isTextBased() &&
          norm(c.name).includes('ogloszenia') &&
          !norm(c.name).includes('staffu') &&
          !norm(c.name).includes('sesji')
        );
        if (boostCh) {
          await boostCh.send({
            content: `<@${newMember.id}> właśnie zboostował serwer! 💜 Dziękujemy! 🚀`,
            embeds: [
              new EmbedBuilder()
                .setColor(0xFF73FA)
                .setTitle('💜 Nowy Nitro Booster!')
                .setDescription(`**${newMember.user.username}** wspiera AURORA Greenville RP boostem Nitro! Dziękujemy! 🎉`)
                .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .setTimestamp()
            ]
          }).catch(() => {});
        }
      }

      // ==================== ZMIANY RÓL ====================
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      if (addedRoles.size === 0 && removedRoles.size === 0) return;

      const normRole = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const roleLogChannel = guild.channels.cache.find(
        c => c.isTextBased() && normRole(c.name).includes('logi-rol')
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
