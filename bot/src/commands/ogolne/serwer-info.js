// Komenda /serwer-info — informacje o serwerze Discord

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const VERIFICATION_LEVELS = {
  0: 'Brak',
  1: 'Niski (email)',
  2: 'Średni (5 min)',
  3: 'Wysoki (10 min)',
  4: 'Najwyższy (tel)',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serwer-info')
    .setDescription('Wyświetl informacje o serwerze AURORA Greenville RP'),

  async execute(interaction, client, prisma) {
    const guild = interaction.guild;
    await guild.members.fetch().catch(() => {});

    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(m => !m.user.bot).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const roles = guild.roles.cache.size - 1; // bez @everyone
    const emojis = guild.emojis.cache.size;
    const boosts = guild.premiumSubscriptionCount ?? 0;
    const boostLevel = guild.premiumTier;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🏙️ ${guild.name}`)
      .setDescription(guild.description ?? 'Polski serwer Roleplay na Roblox — AURORA Greenville RP')
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) ?? null)
      .addFields(
        { name: '👑 Właściciel', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Założony', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '🌍 Region', value: 'Europa', inline: true },
        { name: '👥 Członkowie', value: `**${totalMembers}** łącznie\n👤 ${humans} ludzi | 🤖 ${bots} boty`, inline: true },
        { name: '💬 Kanały', value: `📝 ${textChannels} tekstowych\n🔊 ${voiceChannels} głosowych`, inline: true },
        { name: '🏷️ Role', value: `${roles}`, inline: true },
        { name: '🚀 Boost', value: `${boosts} boostów (Poziom ${boostLevel})`, inline: true },
        { name: '😀 Emoji', value: `${emojis}`, inline: true },
        { name: '🔐 Weryfikacja', value: VERIFICATION_LEVELS[guild.verificationLevel] ?? 'Nieznany', inline: true },
        { name: '🆔 ID Serwera', value: guild.id, inline: false },
      )
      .setImage(guild.bannerURL({ dynamic: true, size: 1024 }) ?? null)
      .setFooter({ text: 'AURORA Greenville RP — Informacje o serwerze' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
