// Event guildMemberAdd — nowy członek dołącza do serwera
// Wysyła embed na #przyloty i nadaje rolę Niezweryfikowany

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client, prisma) {
    try {
      const guild = member.guild;

      // Nadaj rolę Niezweryfikowany
      const niezweryfikowanyRole = guild.roles.cache.find(r => r.name === 'Niezweryfikowany');
      if (niezweryfikowanyRole) {
        await member.roles.add(niezweryfikowanyRole).catch(err =>
          logger.warn('Nie można nadać roli Niezweryfikowany:', err.message)
        );
      }

      // Utwórz użytkownika w bazie danych
      await prisma.user.upsert({
        where: { discordId: member.id },
        create: {
          discordId: member.id,
          discordUsername: member.user.tag,
        },
        update: {
          discordUsername: member.user.tag,
        },
      });

      // Embed na #przyloty
      const memberCount = guild.memberCount;
      const joinDate = new Date().toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🛬 Nowy mieszkaniec!')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setDescription(
          `**${member.user.username}** dołączył/a do **Greenville RP**!\n\n` +
          `👤 Member **#${memberCount}** | Dołączył: ${joinDate}\n\n` +
          `👉 Zacznij od kanału <#${guild.channels.cache.find(c => c.name === '📋│weryfikacja')?.id || 'weryfikacja'}>`
        )
        .setFooter({ text: 'Greenville RP — Przywitanie' })
        .setTimestamp();

      const przylotypChannel = guild.channels.cache.find(
        c => c.name === '✈️│przyloty' && c.isTextBased()
      );
      if (przylotypChannel) {
        await przylotypChannel.send({ embeds: [embed] });
      }

      // Log na #logi-członków
      const logChannel = guild.channels.cache.find(
        c => c.name === '👥│logi-członków' && c.isTextBased()
      );
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('👤 Nowy członek')
              .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
              .addFields(
                { name: 'Użytkownik', value: `${member.user.tag} (${member.id})`, inline: false },
                { name: 'Konto utworzone', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Członek #', value: `${memberCount}`, inline: true }
              )
              .setTimestamp()
          ],
        });
      }

      logger.info(`Nowy członek: ${member.user.tag} (${member.id})`);
    } catch (error) {
      logger.error('Błąd w guildMemberAdd:', error);
    }
  },
};
