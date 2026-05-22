// Komenda /avatar — wyświetl avatar gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Wyświetl avatar gracza')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz (domyślnie: ty)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    const targetUser = interaction.options.getUser('gracz') ?? interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const globalAvatar = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });
    const serverAvatar = member?.displayAvatarURL({ dynamic: true, size: 4096 });

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🖼️ Avatar — ${member?.displayName ?? targetUser.username}`)
      .setImage(serverAvatar ?? globalAvatar)
      .setFooter({ text: 'AURORA Greenville RP' })
      .setTimestamp();

    if (serverAvatar && serverAvatar !== globalAvatar) {
      embed.setDescription(`[Globalny avatar](${globalAvatar}) | [Avatar na serwerze](${serverAvatar})`);
    } else {
      embed.setDescription(`[Pełny rozmiar](${globalAvatar})`);
    }

    await interaction.reply({ embeds: [embed] });
  },
};
