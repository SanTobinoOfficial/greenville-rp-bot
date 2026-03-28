// Komenda /mute — wyciszenie gracza przy użyciu Discord Timeout
// Parsuje stringi czasu: 30m, 1h, 1d, 7d itp.
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

// Parsowanie stringów czasu → milisekundy
// Obsługuje: 30m, 1h, 2h, 1d, 7d
function parseTime(timeStr) {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d+)(m|h|d|w)$/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return value * multipliers[unit];
}

// Formatowanie milisekund do czytelnego tekstu
function formatDuration(ms) {
  if (!ms) return 'Nieznany';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86_400);
  const hours = Math.floor((totalSec % 86_400) / 3_600);
  const mins = Math.floor((totalSec % 3_600) / 60);
  const parts = [];
  if (days) parts.push(`${days} ${days === 1 ? 'dzień' : 'dni'}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? 'godzina' : 'godzin'}`);
  if (mins) parts.push(`${mins} ${mins === 1 ? 'minuta' : 'minut'}`);
  return parts.join(' ') || '< 1 minuta';
}

// Maksymalny czas Discord Timeout — 28 dni
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Wycisz gracza na podany czas (Staff+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do wyciszenia')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('czas')
        .setDescription('Czas wyciszenia: 30m, 1h, 2h, 1d, 7d (max 28d)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód wyciszenia')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Tylko Staff (Helper+) może wyciszać
    if (!isStaff(member)) {
      return interaction.editReply(noPermissionReply('Staff (Helper+)'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const czasStr = interaction.options.getString('czas');
    const powod = interaction.options.getString('powod');

    // Walidacja
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz wyciszyć samego siebie.' });
    }

    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można wyciszać botów.' });
    }

    // Parsowanie czasu
    const durationMs = parseTime(czasStr);
    if (!durationMs) {
      return interaction.editReply({
        content: '❌ Nieprawidłowy format czasu. Użyj: `30m`, `1h`, `2h`, `1d`, `7d`',
      });
    }

    // Sprawdzenie limitu Discord (28 dni)
    if (durationMs > MAX_TIMEOUT_MS) {
      return interaction.editReply({
        content: `❌ Maksymalny czas wyciszenia to 28 dni. Discord nie obsługuje dłuższego timeout.`,
      });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.editReply({ content: `❌ Nie znaleziono gracza ${targetUser} na serwerze.` });
    }

    if (!targetMember.moderatable) {
      return interaction.editReply({ content: '❌ Nie mogę wyciszyć tego gracza (brak uprawnień bota lub za wysoka rola).' });
    }

    if (isStaff(targetMember) && member.roles.highest.position <= targetMember.roles.highest.position) {
      return interaction.editReply({ content: '❌ Nie możesz wyciszyć osoby z równą lub wyższą rolą.' });
    }

    const durationLabel = formatDuration(durationMs);
    const expiresAt = new Date(Date.now() + durationMs);

    // Wysłanie DM przed wyciszeniem
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.mod_mute)
        .setTitle('🔇 Zostałeś wyciszony')
        .addFields(
          { name: '📝 Powód', value: powod, inline: false },
          { name: '⏱️ Czas trwania', value: durationLabel, inline: true },
          { name: '🔊 Wyciszenie wygasa', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
          { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true }
        )
        .setFooter({ text: 'Greenville RP — Moderacja' })
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Nie udało się wysłać DM przed wyciszeniem do ${targetUser.tag}`);
    }

    // Wykonanie Discord Timeout
    try {
      await targetMember.timeout(durationMs, `${powod} — przez ${interaction.user.tag}`);
    } catch (err) {
      logger.error(`Błąd podczas wyciszania ${targetUser.tag}:`, err.message);
      return interaction.editReply({ content: `❌ Nie udało się wyciszyć gracza: ${err.message}` });
    }

    logger.info(`Mute: ${targetUser.tag} przez ${interaction.user.tag} — ${durationLabel}`);

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
        type: 'MUTE',
        targetId: targetDbUser.id,
        moderatorId: issuerDbUser.id,
        reason: powod,
        duration: Math.floor(durationMs / 1000),
        expiresAt,
        status: 'ACTIVE',
      },
    });

    // Log embed do kanału moderacyjnego
    const logEmbed = new EmbedBuilder()
      .setColor(COLORS.mod_mute)
      .setTitle(`🔇 Wyciszenie | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '🛡️ Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: '⏱️ Czas', value: durationLabel, inline: true },
        { name: '📝 Powód', value: powod, inline: false },
        {
          name: '🔊 Wygasa',
          value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`,
          inline: false,
        }
      )
      .setFooter({ text: 'Greenville RP — System moderacji' })
      .setTimestamp();

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', logEmbed);

    await interaction.editReply({
      content: `✅ Gracz <@${targetUser.id}> został wyciszony na **${durationLabel}**.\n📋 **Case:** #${newCase.caseNumber}`,
    });
  },
};
