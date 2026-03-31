// Komenda /zwolnij — zwolnienie zatrzymanego gracza
// Dostępna dla: Policja | Staff+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zwolnij')
    .setDescription('Zwolnij zatrzymanego gracza (Policja)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do zwolnienia')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('notatka')
        .setDescription('Notatka przy zwolnieniu (opcjonalnie)')
        .setRequired(false)
        .setMaxLength(200)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const member = interaction.member;
    const isPolicja = member.roles.cache.some(r => r.name === ROLES.POLICJA || r.name === 'Policja On-Duty');

    if (!isPolicja && !isStaff(member)) {
      return interaction.editReply({ content: '❌ Tylko Policja lub Staff może używać tej komendy.' });
    }

    const targetUser = interaction.options.getUser('gracz');
    const notatka = interaction.options.getString('notatka');

    const targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDb) {
      return interaction.editReply({ content: '❌ Ten gracz nie jest zarejestrowany w systemie.' });
    }

    const arrest = await prisma.arrest.findFirst({
      where: { targetId: targetDb.id, active: true },
    });

    if (!arrest) {
      return interaction.editReply({ content: `❌ <@${targetUser.id}> nie jest aktualnie zatrzymany/a.` });
    }

    await prisma.arrest.update({
      where: { id: arrest.id },
      data: {
        active:    false,
        releasedAt: new Date(),
        releasedBy: interaction.user.tag,
      },
    });

    logger.info(`Zwolnienie ${arrest.id}: ${targetUser.tag} przez ${interaction.user.tag}`);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('✅ Zwolnienie z zatrzymania')
      .addFields(
        { name: '👤 Zwolniony/a', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '🚔 Funkcjonariusz', value: `<@${interaction.user.id}>`, inline: true },
        { name: '🕐 Czas', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
      )
      .setFooter({ text: 'Greenville RP — Policja' })
      .setTimestamp();

    if (notatka) {
      embed.addFields({ name: '📝 Notatka', value: notatka });
    }

    await interaction.editReply({ embeds: [embed] });

    // DM do zwolnionego
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('✅ Zostałeś/aś zwolniony/a')
            .setDescription('Twoje zatrzymanie zostało zakończone.')
            .setFooter({ text: 'Greenville RP — Policja' })
            .setTimestamp(),
        ],
      });
    } catch {
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag} (zwolnij)`);
    }
  },
};
