// Komenda /cofnij-mandat — cofnięcie aktywnego mandatu (Staff+)
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cofnij-mandat')
    .setDescription('Cofnij/anuluj aktywny mandat gracza (Staff+)')
    .addUserOption(opt =>
      opt.setName('gracz').setDescription('Gracz').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('ID mandatu (ostatnie 8 znaków z /historia-mandatow) — pominięcie cofnie ostatni')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('powod').setDescription('Powód cofnięcia').setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isStaff(interaction.member)) {
      return interaction.editReply(noPermissionReply('Staff (Helper+)'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const shortId    = interaction.options.getString('id');
    const powod      = interaction.options.getString('powod') || 'Brak podanego powodu';

    const targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDb) {
      return interaction.editReply({ content: '❌ Ten gracz nie jest zarejestrowany w systemie.' });
    }

    let fine;

    if (shortId) {
      const candidates = await prisma.fine.findMany({
        where: { targetId: targetDb.id, active: true, id: { endsWith: shortId } },
      });
      fine = candidates[0];
    } else {
      fine = await prisma.fine.findFirst({
        where: { targetId: targetDb.id, active: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!fine) {
      return interaction.editReply({ content: '❌ Nie znaleziono aktywnego mandatu dla tego gracza.' });
    }

    await prisma.fine.update({ where: { id: fine.id }, data: { active: false } });

    logger.info(`Cofnięto mandat ${fine.id} gracza ${targetUser.tag} przez ${interaction.user.tag}`);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('📋 Mandat cofnięty')
      .addFields(
        { name: '👤 Gracz',     value: `<@${targetUser.id}>`, inline: true },
        { name: '📂 Typ',       value: fine.type, inline: true },
        { name: '📝 Treść',     value: fine.reason, inline: false },
        { name: '💡 Powód cofnięcia', value: powod, inline: false },
        { name: '🛡️ Staff',     value: `<@${interaction.user.id}>`, inline: true },
      )
      .setFooter({ text: 'Greenville RP — Mandaty RP' })
      .setTimestamp();

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-mandaty', embed);
    await interaction.editReply({ content: `✅ Mandat \`${fine.id.slice(-8)}\` dla <@${targetUser.id}> został cofnięty.` });
  },
};
