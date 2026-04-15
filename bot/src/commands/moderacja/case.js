// Komenda /case — szczegóły konkretnego case'a moderacyjnego
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

// Konfiguracja typów case'ów — kolory i etykiety
const CASE_CONFIG = {
  WARN:   { emoji: '⚠️', label: 'Ostrzeżenie', color: COLORS.mod_warn },
  BAN:    { emoji: '🔨', label: 'Ban',          color: COLORS.mod_ban },
  KICK:   { emoji: '👢', label: 'Kick',         color: COLORS.mod_kick },
  MUTE:   { emoji: '🔇', label: 'Wyciszenie',   color: COLORS.mod_mute },
  UNBAN:  { emoji: '✅', label: 'Unban',        color: COLORS.mod_unban },
  UNMUTE: { emoji: '🔊', label: 'Odciszenie',   color: COLORS.mod_unban },
};

// Etykiety statusów
const STATUS_LABELS = {
  ACTIVE:   '🟢 Aktywny',
  EXPIRED:  '⏱️ Wygasły',
  REMOVED:  '🗑️ Usunięty',
  APPEALED: '⚖️ Odwołany',
};

// Formatowanie czasu w sekundach
function formatDurationSec(seconds) {
  if (!seconds) return null;
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const parts = [];
  if (d) parts.push(`${d} ${d === 1 ? 'dzień' : 'dni'}`);
  if (h) parts.push(`${h} ${h === 1 ? 'godzina' : 'godzin'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'minuta' : 'minut'}`);
  return parts.join(' ') || '< 1 minuta';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Sprawdź szczegóły case\'a moderacyjnego (Staff+)')
    .addIntegerOption(opt =>
      opt.setName('numer')
        .setDescription('Numer case\'a')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Tylko Staff (Helper+)
    if (!isStaff(member)) {
      return interaction.editReply(noPermissionReply('Staff (Helper+)'));
    }

    const caseNumber = interaction.options.getInteger('numer');

    // Pobranie case'a z bazy z powiązanymi danymi
    const caseData = await prisma.case.findUnique({
      where: { caseNumber },
      include: {
        target: true,
        moderator: true,
      },
    });

    if (!caseData) {
      return interaction.editReply({
        content: `❌ Nie znaleziono case'a o numerze **#${caseNumber}**.`,
      });
    }

    const cfg = CASE_CONFIG[caseData.type] || { emoji: '📋', label: caseData.type, color: COLORS.neutral };
    const statusLabel = STATUS_LABELS[caseData.status] || caseData.status;

    // Pobranie discordowych obiektów użytkowników (mogą nie być na serwerze)
    const targetDiscord = await client.users.fetch(caseData.target.discordId).catch(() => null);
    const modDiscord = await client.users.fetch(caseData.moderator.discordId).catch(() => null);

    const targetDisplay = targetDiscord
      ? `<@${targetDiscord.id}> (${targetDiscord.tag})`
      : `ID: ${caseData.target.discordId}`;

    const modDisplay = modDiscord
      ? `<@${modDiscord.id}> (${modDiscord.tag})`
      : `ID: ${caseData.moderator.discordId}`;

    // Budowanie embeda
    const embed = new EmbedBuilder()
      .setColor(cfg.color)
      .setTitle(`${cfg.emoji} Case #${caseData.caseNumber} — ${cfg.label}`)
      .addFields(
        { name: '👤 Gracz', value: targetDisplay, inline: true },
        { name: '🛡️ Moderator', value: modDisplay, inline: true },
        { name: '📊 Status', value: statusLabel, inline: true },
        { name: '📝 Powód', value: caseData.reason, inline: false },
        {
          name: '📅 Data wystawienia',
          value: `<t:${Math.floor(new Date(caseData.createdAt).getTime() / 1000)}:F>`,
          inline: true,
        }
      )
      .setFooter({ text: `AURORA Greenville RP — Moderacja • Case #${caseData.caseNumber}` })
      .setTimestamp();

    // Opcjonalne pola — czas trwania
    if (caseData.duration) {
      embed.addFields({
        name: '⏱️ Czas trwania',
        value: formatDurationSec(caseData.duration),
        inline: true,
      });
    }

    // Opcjonalne pola — data wygaśnięcia
    if (caseData.expiresAt) {
      const isExpired = new Date(caseData.expiresAt) < new Date();
      embed.addFields({
        name: isExpired ? '⏱️ Wygasł' : '🔓 Wygasa',
        value: `<t:${Math.floor(new Date(caseData.expiresAt).getTime() / 1000)}:R> (<t:${Math.floor(new Date(caseData.expiresAt).getTime() / 1000)}:d>)`,
        inline: true,
      });
    }

    // Avatar ukaranego jako thumbnail
    if (targetDiscord) {
      embed.setThumbnail(targetDiscord.displayAvatarURL({ dynamic: true }));
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
