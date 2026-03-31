// Komenda /clearwarns — wyczyszczenie wszystkich aktywnych warnów gracza
// Dostępna dla: Administrator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('Wyczyść wszystkie aktywne warny gracza (Admin+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do wyczyszczenia warnów')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód wyczyszczenia warnów')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isAdmin(interaction.member)) {
      return interaction.editReply(noPermissionReply('Administrator+'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const powod = interaction.options.getString('powod') || 'Brak podanego powodu';

    const targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDb) {
      return interaction.editReply({ content: '❌ Ten gracz nie jest zarejestrowany w systemie.' });
    }

    const result = await prisma.case.updateMany({
      where: {
        targetId: targetDb.id,
        type: 'WARN',
        status: 'ACTIVE',
      },
      data: { status: 'REMOVED' },
    });

    if (result.count === 0) {
      return interaction.editReply({ content: `ℹ️ <@${targetUser.id}> nie ma żadnych aktywnych warnów do wyczyszczenia.` });
    }

    logger.info(`Clearwarns: ${result.count} warnów gracza ${targetUser.tag} przez ${interaction.user.tag} (powód: ${powod})`);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🧹 Warny wyczyszczone')
      .addFields(
        { name: '👤 Gracz', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '🗑️ Usuniętych warnów', value: `${result.count}`, inline: true },
        { name: '📝 Powód', value: powod, inline: false },
        { name: '🛡️ Admin', value: `<@${interaction.user.id}>`, inline: true },
      )
      .setFooter({ text: 'Greenville RP — Moderacja' })
      .setTimestamp();

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', embed);

    // DM do gracza
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('🧹 Twoje warny zostały wyczyszczone')
            .addFields(
              { name: '🗑️ Usuniętych warnów', value: `${result.count}`, inline: true },
              { name: '📝 Powód', value: powod, inline: false },
            )
            .setFooter({ text: 'Greenville RP — Moderacja' })
            .setTimestamp(),
        ],
      });
    } catch {
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag} (clearwarns)`);
    }

    await interaction.editReply({ content: `✅ Wyczyszczono **${result.count}** warnów dla <@${targetUser.id}>.` });
  },
};
