// Komenda /przypadki — lista aktywnych warnów/banów/mute danego gracza
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');

const TYPE_EMOJI = {
  WARN:   '⚠️',
  BAN:    '🔨',
  KICK:   '👢',
  MUTE:   '🔇',
  UNBAN:  '✅',
  UNMUTE: '🔊',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('przypadki')
    .setDescription('Lista aktywnych kar danego gracza (Moderator+)')
    .addUserOption(opt =>
      opt.setName('gracz').setDescription('Gracz').setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isMod(interaction.member)) {
      return interaction.editReply(noPermissionReply('Moderator+'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });

    if (!targetDb) {
      return interaction.editReply({ content: '❌ Ten gracz nie jest zarejestrowany.' });
    }

    const activeCases = await prisma.case.findMany({
      where: { targetId: targetDb.id, status: 'ACTIVE' },
      include: { moderator: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeCases.length === 0) {
      return interaction.editReply({ content: `✅ <@${targetUser.id}> nie ma żadnych aktywnych kar.` });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`📋 Aktywne kary — ${targetUser.tag}`)
      .setDescription(
        activeCases.map(c =>
          `${TYPE_EMOJI[c.type] || '•'} **Case #${c.caseNumber}** — ${c.reason.slice(0, 80)}\n` +
          `  → @${c.moderator.discordUsername} • <t:${Math.floor(c.createdAt.getTime() / 1000)}:D>` +
          (c.expiresAt ? ` • wygasa <t:${Math.floor(c.expiresAt.getTime() / 1000)}:R>` : '')
        ).join('\n\n')
      )
      .setFooter({ text: `${activeCases.length} aktywnych kar | AURORA Greenville RP` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
