// Komenda /nick — zmień nickname gracza na serwerze
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Zmień nickname gracza (Moderator+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do zmiany nicku')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('nickname')
        .setDescription('Nowy nickname (zostaw puste aby zresetować)')
        .setMaxLength(32)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Moderator+ może używać tej komendy.', ephemeral: true });
    }

    const targetUser = interaction.options.getUser('gracz');
    const newNick = interaction.options.getString('nickname') ?? null;

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: '❌ Nie znaleziono gracza na serwerze.', ephemeral: true });
    }

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({ content: '❌ Nie możesz zmienić nicku osoby z równą lub wyższą rolą.', ephemeral: true });
    }

    const oldNick = targetMember.displayName;

    try {
      await targetMember.setNickname(newNick, `Nick zmieniony przez ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('✏️ Nickname zmieniony')
        .addFields(
          { name: '👤 Gracz', value: `<@${targetUser.id}>`, inline: true },
          { name: '📝 Poprzedni nick', value: oldNick, inline: true },
          { name: '✏️ Nowy nick', value: newNick ?? '*zresetowano*', inline: true },
          { name: '👮 Moderator', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      const normN = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const logCh = interaction.guild.channels.cache.find(
        c => c.isTextBased() && normN(c.name).includes('logi-nickow')
      );
      if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});

      logger.info(`/nick: ${oldNick} → ${newNick ?? 'reset'} przez ${interaction.user.tag}`);
    } catch (e) {
      await interaction.reply({ content: `❌ Błąd: ${e.message}`, ephemeral: true });
    }
  },
};
