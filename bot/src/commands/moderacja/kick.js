// Komenda /kick — wyrzucenie gracza z serwera
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Wyrzuć gracza z serwera (Mod+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do wyrzucenia')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód kicka')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Tylko Moderator+ może kickować
    if (!isMod(member)) {
      return interaction.editReply(noPermissionReply('Moderator'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const powod = interaction.options.getString('powod');

    // Nie można kickować siebie
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz wyrzucić samego siebie.' });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można wyrzucać botów.' });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.editReply({ content: `❌ Gracz ${targetUser} nie jest na serwerze.` });
    }

    // Sprawdzenie czy można kickować (hierarchia ról)
    if (!targetMember.kickable) {
      return interaction.editReply({ content: '❌ Nie mogę wyrzucić tego gracza (brak uprawnień bota lub za wysoka rola).' });
    }

    if (isMod(targetMember) && member.roles.highest.position <= targetMember.roles.highest.position) {
      return interaction.editReply({ content: '❌ Nie możesz wyrzucić osoby z równą lub wyższą rolą.' });
    }

    // Wysłanie DM przed kickiem
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.mod_kick)
        .setTitle('👢 Zostałeś wyrzucony z serwera')
        .setDescription('Twój dostęp do serwera **Greenville RP** został tymczasowo usunięty. Możesz dołączyć ponownie.')
        .addFields(
          { name: '📝 Powód', value: powod, inline: false },
          { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ text: 'Greenville RP — Moderacja' })
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Nie udało się wysłać DM przed kickiem do ${targetUser.tag}`);
    }

    // Wykonanie kicka
    try {
      await targetMember.kick(`${powod} — przez ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`Błąd podczas kickowania ${targetUser.tag}:`, err.message);
      return interaction.editReply({ content: `❌ Nie udało się wyrzucić gracza: ${err.message}` });
    }

    logger.info(`Kick: ${targetUser.tag} przez ${interaction.user.tag}`);

    // Pobranie/tworzenie użytkowników w bazie
    let issuerDbUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!issuerDbUser) {
      issuerDbUser = await prisma.user.create({
        data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
      });
    }

    let targetDbUser = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDbUser) {
      targetDbUser = await prisma.user.create({
        data: { discordId: targetUser.id, discordUsername: targetUser.tag },
      });
    }

    // Stworzenie case'a w bazie
    const newCase = await prisma.case.create({
      data: {
        type: 'KICK',
        targetId: targetDbUser.id,
        moderatorId: issuerDbUser.id,
        reason: powod,
        status: 'ACTIVE',
      },
    });

    // Log embed do kanału moderacyjnego
    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.mod_kick)
      .setTitle(`👢 Kick | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📝 Powód', value: powod, inline: false }
      )
      .setFooter({ text: 'Greenville RP — System moderacji' })
      .setTimestamp();

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', logEmbed);

    await interaction.editReply({
      content: `✅ Gracz **${targetUser.tag}** został wyrzucony z serwera.\n📋 **Case:** #${newCase.caseNumber}`,
    });
  },
};
