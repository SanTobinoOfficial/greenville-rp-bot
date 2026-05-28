// Komenda /narracja — narracja mistrza gry (Host+)
// Publikuje opis sceny RP bez atrybucji postaci — głos narracyjny podczas sesji
// Różni się od /do (obserwator-postać) i /me (akcja postaci): tu nie ma autora IC
// Dostępna dla: Host+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('narracja')
    .setDescription('Opublikuj narrację mistrza gry — opis sceny bez atrybucji postaci (Host+)')
    .addStringOption(opt =>
      opt
        .setName('tekst')
        .setDescription('Treść narracji — co dzieje się na scenie RP')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(600)
    ),

  async execute(interaction, client, prisma) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    await interaction.deferReply({ ephemeral: false });

    const tekst = interaction.options.getString('tekst').trim();

    const embed = new EmbedBuilder()
      .setColor(0x23272A)
      .setTitle('📖 NARRACJA')
      .setDescription(`*${tekst}*`)
      .setFooter({
        text: `${interaction.user.tag} • ${interaction.channel.name} • /narracja`,
      })
      .setTimestamp();

    logger.info(
      `/narracja | ${interaction.user.tag} | "${tekst.length > 80 ? tekst.slice(0, 80) + '…' : tekst}"`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
