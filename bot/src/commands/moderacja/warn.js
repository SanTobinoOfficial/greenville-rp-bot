// Komenda /warn — ostrzeżenie gracza przez staff
// Auto-akcje: 3 warny → mute 24h | 5 warnów → ban 7 dni
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

// Parsowanie czasu: "7d", "24h", "30m" → milisekundy
function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return value * multipliers[unit];
}

// Formatowanie czasu do czytelnego tekstu
function formatDuration(ms) {
  if (!ms) return null;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '< 1m';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Ostrzeż gracza (Staff+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do ostrzeżenia')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód ostrzeżenia')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('czas')
        .setDescription('Czas wygaśnięcia warnu (np. 7d, 30d) — opcjonalnie')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Tylko Staff (Helper+) może wystawiać warny
    if (!isStaff(member)) {
      return interaction.editReply(noPermissionReply('Staff (Helper+)'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const powod = interaction.options.getString('powod');
    const czasStr = interaction.options.getString('czas');

    // Nie można ostrzegać siebie samego
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz ostrzec samego siebie.' });
    }

    // Nie można ostrzegać botów
    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można ostrzegać botów.' });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    // Sprawdzenie czy cel jest na serwerze
    if (!targetMember) {
      return interaction.editReply({ content: `❌ Nie znaleziono gracza ${targetUser} na serwerze.` });
    }

    // Sprawdzenie hierarchii ról — nie można ostrzegać kogoś z wyższą rolą
    if (isStaff(targetMember) && member.roles.highest.position <= targetMember.roles.highest.position) {
      return interaction.editReply({ content: '❌ Nie możesz ostrzegać osoby z równą lub wyższą rolą niż ty.' });
    }

    // Pobranie/tworzenie użytkownika w bazie (wystawiający)
    let issuerDbUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!issuerDbUser) {
      issuerDbUser = await prisma.user.create({
        data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
      });
    }

    // Pobranie/tworzenie użytkownika w bazie (cel)
    let targetDbUser = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDbUser) {
      targetDbUser = await prisma.user.create({
        data: { discordId: targetUser.id, discordUsername: targetUser.tag },
      });
    }

    // Parsowanie czasu wygaśnięcia
    const expiresMs = parseTime(czasStr);
    const expiresAt = expiresMs ? new Date(Date.now() + expiresMs) : null;

    // Stworzenie case'a w bazie
    const newCase = await prisma.case.create({
      data: {
        type: 'WARN',
        targetId: targetDbUser.id,
        moderatorId: issuerDbUser.id,
        reason: powod,
        expiresAt,
        status: 'ACTIVE',
      },
    });

    logger.info(`Warn #${newCase.caseNumber} dla ${targetUser.tag} przez ${interaction.user.tag}`);

    // Zliczenie aktywnych warnów
    const activeWarns = await prisma.case.count({
      where: {
        targetId: targetDbUser.id,
        type: 'WARN',
        status: 'ACTIVE',
      },
    });

    // Pobranie ustawień auto-akcji
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const warnAutoMuteCount = settings?.warnAutoMuteCount || 3;
    const warnAutoBanCount = settings?.warnAutoBanCount || 5;

    let autoAction = null;

    // Auto-mute przy 3 aktywnych warnach
    if (activeWarns >= warnAutoMuteCount && activeWarns < warnAutoBanCount) {
      const muteDuration = 24 * 60 * 60 * 1000; // 24h w ms
      try {
        await targetMember.timeout(muteDuration, `Auto-mute: ${activeWarns} aktywnych ostrzeżeń`);

        // Stworzenie case'a dla auto-mute
        const muteCase = await prisma.case.create({
          data: {
            type: 'MUTE',
            targetId: targetDbUser.id,
            moderatorId: issuerDbUser.id,
            reason: `Auto-mute: osiągnięto ${activeWarns} aktywnych ostrzeżeń`,
            duration: muteDuration,
            expiresAt: new Date(Date.now() + muteDuration),
            status: 'ACTIVE',
          },
        });

        autoAction = { type: 'mute', label: 'Wyciszenie 24h', caseNumber: muteCase.caseNumber };
        logger.info(`Auto-mute dla ${targetUser.tag}: ${activeWarns} warnów (Case #${muteCase.caseNumber})`);
      } catch (err) {
        logger.error(`Nie udało się auto-mutować ${targetUser.tag}:`, err.message);
      }
    }

    // Auto-ban przy 5 aktywnych warnach
    if (activeWarns >= warnAutoBanCount) {
      const banDuration = 7 * 24 * 60 * 60; // 7 dni w sekundach (Discord API)
      try {
        await interaction.guild.members.ban(targetUser.id, {
          reason: `Auto-ban: ${activeWarns} aktywnych ostrzeżeń`,
          deleteMessageSeconds: 0,
        });

        const banExpiresAt = new Date(Date.now() + banDuration * 1000);

        // Stworzenie case'a dla auto-bana
        const banCase = await prisma.case.create({
          data: {
            type: 'BAN',
            targetId: targetDbUser.id,
            moderatorId: issuerDbUser.id,
            reason: `Auto-ban: osiągnięto ${activeWarns} aktywnych ostrzeżeń`,
            duration: banDuration,
            expiresAt: banExpiresAt,
            status: 'ACTIVE',
          },
        });

        autoAction = { type: 'ban', label: 'Ban 7 dni', caseNumber: banCase.caseNumber };
        logger.info(`Auto-ban dla ${targetUser.tag}: ${activeWarns} warnów (Case #${banCase.caseNumber})`);

        // Odban po 7 dniach
        setTimeout(async () => {
          try {
            await interaction.guild.members.unban(targetUser.id, 'Auto-unban po wygaśnięciu kary');
            await prisma.case.update({
              where: { id: banCase.id },
              data: { status: 'EXPIRED' },
            });
            logger.info(`Auto-unban ${targetUser.tag} po 7 dniach`);
          } catch (err) {
            logger.error(`Błąd auto-unbana ${targetUser.tag}:`, err.message);
          }
        }, banDuration * 1000);
      } catch (err) {
        logger.error(`Nie udało się auto-banować ${targetUser.tag}:`, err.message);
      }
    }

    // Wysłanie DM do ukaranego
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.mod_warn)
        .setTitle('⚠️ Otrzymałeś ostrzeżenie')
        .addFields(
          { name: '📝 Powód', value: powod, inline: false },
          { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: '🔢 Numer case', value: `#${newCase.caseNumber}`, inline: true },
          { name: '📊 Aktywne ostrzeżenia', value: `${activeWarns}/${warnAutoBanCount}`, inline: true }
        )
        .setFooter({ text: 'AURORA Greenville RP — Moderacja' })
        .setTimestamp();

      if (expiresAt) {
        dmEmbed.addFields({
          name: '⏱️ Wygasa',
          value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      if (autoAction) {
        dmEmbed.addFields({
          name: '🚨 Automatyczna akcja',
          value: `${autoAction.label} (Case #${autoAction.caseNumber})`,
          inline: false,
        });
      }

      await targetUser.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag} (warn)`);
    }

    // Embed logu do kanału moderacyjnego
    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.mod_warn)
      .setTitle(`⚠️ Ostrzeżenie | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📝 Powód', value: powod, inline: false },
        { name: '📊 Aktywne warny', value: `${activeWarns}/${warnAutoBanCount}`, inline: true }
      )
      .setFooter({ text: 'AURORA Greenville RP — System moderacji' })
      .setTimestamp();

    if (expiresAt) {
      logEmbed.addFields({
        name: '⏱️ Wygasa',
        value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    if (autoAction) {
      logEmbed.addFields({
        name: '🚨 Auto-akcja',
        value: `${autoAction.label} (Case #${autoAction.caseNumber})`,
        inline: false,
      });
    }

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', logEmbed);

    // Odpowiedź dla moderatora
    let replyMsg = `✅ Ostrzeżenie zostało wystawione dla <@${targetUser.id}> (Case #${newCase.caseNumber}).`;
    if (autoAction) replyMsg += `\n🚨 **Auto-akcja:** ${autoAction.label} (Case #${autoAction.caseNumber})`;

    await interaction.editReply({ content: replyMsg });
  },
};
