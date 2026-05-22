// Komenda /userinfo — informacje o użytkowniku Discord i jego profilu RP

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Informacje o użytkowniku Discord i koncie RP')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz (domyślnie: ty)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    const targetUser = interaction.options.getUser('gracz') ?? interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const dbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: { character: true },
    });

    const roles = member?.roles.cache
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => `${r}`)
      .join(' ') || '*Brak ról*';

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor ?? '#5865F2')
      .setTitle(`👤 ${member?.displayName ?? targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '🏷️ Tag', value: targetUser.tag, inline: true },
        { name: '🆔 ID', value: targetUser.id, inline: true },
        { name: '🤖 Bot', value: targetUser.bot ? 'Tak' : 'Nie', inline: true },
        { name: '📅 Konto Discord od', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '🛬 Na serwerze od', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Brak', inline: true },
        { name: '🎨 Kolor roli', value: member?.displayHexColor ?? 'Brak', inline: true },
        { name: '🏷️ Role', value: roles.slice(0, 1000), inline: false },
      )
      .setFooter({ text: 'AURORA Greenville RP — Info' })
      .setTimestamp();

    // Dodaj dane RP jeśli są
    if (dbUser) {
      embed.addFields(
        { name: '── Profil RP ──', value: '​', inline: false },
        { name: '✅ Weryfikacja', value: dbUser.robloxUsername ? `✅ ${dbUser.robloxUsername}` : '❌ Niezweryfikowany', inline: true },
        { name: '💰 Portfel', value: `${dbUser.balance.toLocaleString('pl-PL')}$`, inline: true },
        { name: '🏦 Bank', value: `${dbUser.bankBalance.toLocaleString('pl-PL')}$`, inline: true },
      );

      if (dbUser.character) {
        const ch = dbUser.character;
        embed.addFields({
          name: '🪪 Postać',
          value: `${ch.firstName} ${ch.lastName}`,
          inline: true,
        });
      }

      if (dbUser.currentJob) {
        embed.addFields({ name: '💼 Praca', value: dbUser.currentJob, inline: true });
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};
