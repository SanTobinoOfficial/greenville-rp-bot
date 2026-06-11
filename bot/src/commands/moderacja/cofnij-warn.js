// Komenda /cofnij-warn — cofnięcie jednego konkretnego ostrzeżenia po numerze case'a
// Dostępna dla: Administrator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cofnij-warn')
    .setDescription('Cofnij konkretne ostrzeżenie po numerze case\'a (Admin+)')
    .addIntegerOption(opt =>
      opt.setName('case')
        .setDescription('Numer case\'a ostrzeżenia do cofnięcia')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód cofnięcia ostrzeżenia')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isAdmin(interaction.member)) {
      return interaction.editReply(noPermissionReply('Administrator+'));
    }

    const caseNumber = interaction.options.getInteger('case');
    const powod = interaction.options.getString('powod') || 'Brak podanego powodu';

    const caseData = await prisma.case.findUnique({
      where: { caseNumber },
      include: { target: true, moderator: true },
    });

    if (!caseData) {
      return interaction.editReply({ content: `❌ Nie znaleziono case'a o numerze **#${caseNumber}**.` });
    }

    if (caseData.type !== 'WARN') {
      return interaction.editReply({
        content: `❌ Case **#${caseNumber}** nie jest ostrzeżeniem (typ: ${caseData.type}). Użyj odpowiedniej komendy.`,
      });
    }

    if (caseData.status !== 'ACTIVE') {
      const statusLabels = { REMOVED: 'już usunięty', EXPIRED: 'wygasły', APPEALED: 'odwołany' };
      const label = statusLabels[caseData.status] || caseData.status;
      return interaction.editReply({ content: `ℹ️ Case **#${caseNumber}** jest ${label} i nie wymaga akcji.` });
    }

    await prisma.case.update({
      where: { caseNumber },
      data: { status: 'REMOVED' },
    });

    const targetDiscord = await client.users.fetch(caseData.target.discordId).catch(() => null);

    const activeWarnsAfter = await prisma.case.count({
      where: { targetId: caseData.target.id, type: 'WARN', status: 'ACTIVE' },
    });

    logger.info(
      `Cofnięto warn #${caseNumber} dla ${caseData.target.discordId} przez ${interaction.user.tag} (powód: ${powod})`
    );

    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.mod_unban)
      .setTitle(`🗑️ Cofnięcie ostrzeżenia | Case #${caseNumber}`)
      .addFields(
        {
          name: '👤 Gracz',
          value: targetDiscord
            ? `<@${targetDiscord.id}> (${targetDiscord.tag})`
            : `ID: ${caseData.target.discordId}`,
          inline: true,
        },
        { name: '🛡️ Admin', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📝 Powód cofnięcia', value: powod, inline: false },
        { name: '🔢 Cofnięty case', value: `#${caseNumber}`, inline: true },
        { name: '📊 Aktywne warny po cofnięciu', value: `${activeWarnsAfter}`, inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — Moderacja' })
      .setTimestamp();

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', logEmbed);

    if (targetDiscord) {
      try {
        await targetDiscord.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.mod_unban)
              .setTitle('🗑️ Ostrzeżenie cofnięte')
              .addFields(
                { name: '🔢 Numer case', value: `#${caseNumber}`, inline: true },
                { name: '📊 Aktywne warny', value: `${activeWarnsAfter}`, inline: true },
                { name: '📝 Powód cofnięcia', value: powod, inline: false },
              )
              .setFooter({ text: 'AURORA Greenville RP — Moderacja' })
              .setTimestamp(),
          ],
        });
      } catch {
        logger.warn(`Nie udało się wysłać DM do ${caseData.target.discordId} (cofnij-warn)`);
      }
    }

    await interaction.editReply({
      content: `✅ Ostrzeżenie **#${caseNumber}** zostało cofnięte. Gracz ma teraz **${activeWarnsAfter}** aktywnych warnów.`,
    });
  },
};
