// Komenda /ban — banowanie gracza z opcjonalnym czasem trwania
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

// Mapowanie wyborów czasu na sekundy
const DURATION_MAP = {
  '1h':        3_600,
  '1d':       86_400,
  '7d':      604_800,
  '30d':   2_592_000,
  'permanent':   null,
};

// Czytelna etykieta dla wybranego czasu
const DURATION_LABELS = {
  '1h': '1 godzina',
  '1d': '1 dzień',
  '7d': '7 dni',
  '30d': '30 dni',
  'permanent': 'Permanentny',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Zbanuj gracza z serwera (Mod+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do zbanowania')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód bana')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('czas')
        .setDescription('Czas trwania bana')
        .setRequired(true)
        .addChoices(
          { name: '1 godzina', value: '1h' },
          { name: '1 dzień', value: '1d' },
          { name: '7 dni', value: '7d' },
          { name: '30 dni', value: '30d' },
          { name: 'Permanentny', value: 'permanent' }
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Tylko Moderator+ może banować
    if (!isMod(member)) {
      return interaction.editReply(noPermissionReply('Moderator'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const powod = interaction.options.getString('powod');
    const czasChoice = interaction.options.getString('czas');

    // Nie można banować siebie
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz zbanować samego siebie.' });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można banować botów.' });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // Sprawdzenie hierarchii ról (jeśli gracz jest jeszcze na serwerze)
    if (targetMember) {
      if (isMod(targetMember) && member.roles.highest.position <= targetMember.roles.highest.position) {
        return interaction.editReply({ content: '❌ Nie możesz zbanować osoby z równą lub wyższą rolą.' });
      }
    }

    const durationSec = DURATION_MAP[czasChoice];
    const durationLabel = DURATION_LABELS[czasChoice];
    const isPermanent = czasChoice === 'permanent';
    const expiresAt = durationSec ? new Date(Date.now() + durationSec * 1000) : null;

    // Wysłanie DM przed banem (gracz musi być na serwerze)
    if (targetMember) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle('🔨 Zostałeś zbanowany')
          .setDescription(`Twój dostęp do serwera **Greenville RP** został zablokowany.`)
          .addFields(
            { name: '📝 Powód', value: powod, inline: false },
            { name: '⏱️ Czas trwania', value: durationLabel, inline: true },
            { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setFooter({ text: 'Greenville RP — Moderacja' })
          .setTimestamp();

        if (expiresAt) {
          dmEmbed.addFields({
            name: '🔓 Ban wygasa',
            value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`,
            inline: false,
          });
        }

        await targetUser.send({ embeds: [dmEmbed] });
      } catch {
        logger.warn(`Nie udało się wysłać DM przed banem do ${targetUser.tag}`);
      }
    }

    // Wykonanie bana
    try {
      await interaction.guild.members.ban(targetUser.id, {
        reason: `[${durationLabel}] ${powod} — przez ${interaction.user.tag}`,
        deleteMessageSeconds: 86_400, // Usuń wiadomości z ostatnich 24h
      });
    } catch (err) {
      logger.error(`Błąd podczas banowania ${targetUser.tag}:`, err.message);
      return interaction.editReply({ content: `❌ Nie udało się zbanować gracza: ${err.message}` });
    }

    logger.info(`Ban: ${targetUser.tag} przez ${interaction.user.tag} — ${durationLabel}`);

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
        type: 'BAN',
        targetId: targetDbUser.id,
        moderatorId: issuerDbUser.id,
        reason: powod,
        duration: durationSec,
        expiresAt,
        status: 'ACTIVE',
      },
    });

    // Planowanie auto-unbana dla krótkich banów (do 30 dni)
    if (!isPermanent && durationSec && durationSec <= 2_592_000) {
      setTimeout(async () => {
        try {
          await interaction.guild.members.unban(targetUser.id, 'Auto-unban po wygaśnięciu kary');
          await prisma.case.update({
            where: { id: newCase.id },
            data: { status: 'EXPIRED' },
          });
          logger.info(`Auto-unban ${targetUser.tag} po ${durationLabel}`);

          // Powiadomienie o unbanie w kanale logów
          const logChannel = interaction.guild.channels.cache.find(
            c => c.name === 'logi-moderacji' && c.isTextBased()
          );
          if (logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(COLORS.success)
                  .setTitle(`✅ Auto-Unban — ${targetUser.tag}`)
                  .setDescription(`Ban wygasł po ${durationLabel}.\nPowód oryginalnego bana: ${powod}`)
                  .addFields({ name: '🔢 Case', value: `#${newCase.caseNumber}`, inline: true })
                  .setTimestamp()
              ],
            });
          }
        } catch (err) {
          logger.error(`Błąd auto-unbana ${targetUser.tag}:`, err.message);
        }
      }, durationSec * 1000);
    } else if (!isPermanent && durationSec > 2_592_000) {
      // Dla bardzo długich banów — tylko notatka (bot może nie przetrwać tak długo)
      logger.warn(`Ban ${targetUser.tag} jest na ${durationLabel} — auto-unban nie zostanie zaplanowany (zbyt długi)`);
    }

    // Log embed do kanału moderacyjnego
    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.mod_ban)
      .setTitle(`🔨 Ban | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: '⏱️ Czas', value: durationLabel, inline: true },
        { name: '📝 Powód', value: powod, inline: false }
      )
      .setFooter({ text: 'Greenville RP — System moderacji' })
      .setTimestamp();

    if (expiresAt) {
      logEmbed.addFields({
        name: '🔓 Wygasa',
        value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`,
        inline: false,
      });
    }

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', logEmbed);

    await interaction.editReply({
      content: `✅ Gracz <@${targetUser.id}> (${targetUser.tag}) został zbanowany.\n📋 **Case:** #${newCase.caseNumber} | ⏱️ **Czas:** ${durationLabel}`,
    });
  },
};
