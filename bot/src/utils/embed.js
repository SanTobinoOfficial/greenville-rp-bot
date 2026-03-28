// Pomocnicze funkcje do tworzenia embedów Discord
// Jednolita kolorystyka i styl dla całego bota

const { EmbedBuilder } = require('discord.js');

// Kolory używane w całym bocie
const COLORS = {
  primary: 0x5865F2,    // Discord Blurple — akcent
  success: 0x57F287,    // Zielony — sukces
  error: 0xED4245,      // Czerwony — błąd
  warning: 0xFEE75C,    // Żółty — ostrzeżenie
  info: 0x5865F2,       // Niebieski — informacja
  neutral: 0x2B2D31,    // Szary — neutralny
  gold: 0xFFD700,       // Złoty — specjalny
  regulamin: 0xE74C3C,  // Czerwony regulaminowy
  rp: 0x3498DB,         // Niebieski RP
  mod_ban: 0xED4245,
  mod_warn: 0xFEE75C,
  mod_mute: 0xF4900C,
  mod_kick: 0xEB459E,
  mod_unban: 0x57F287,
};

const FOOTER_TEXT = 'Greenville RP Bot';
const FOOTER_ICON = 'https://i.imgur.com/greenville_logo.png';

/**
 * Tworzy bazowy embed z footerем i timestampem
 */
function base(color = COLORS.primary) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp();
}

/**
 * Embed sukcesu (zielony)
 */
function success(title, description) {
  return base(COLORS.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

/**
 * Embed błędu (czerwony)
 */
function error(title, description) {
  return base(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

/**
 * Embed ostrzeżenia (żółty)
 */
function warning(title, description) {
  return base(COLORS.warning)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}

/**
 * Embed informacyjny (niebieski)
 */
function info(title, description) {
  return base(COLORS.info)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description);
}

/**
 * Embed moderacyjny — różny kolor zależnie od typu
 */
function moderation(type, target, moderator, reason, duration, caseNumber) {
  const configs = {
    WARN:   { color: COLORS.mod_warn,  emoji: '⚠️', label: 'Ostrzeżenie' },
    BAN:    { color: COLORS.mod_ban,   emoji: '🔨', label: 'Ban' },
    KICK:   { color: COLORS.mod_kick,  emoji: '👢', label: 'Kick' },
    MUTE:   { color: COLORS.mod_mute,  emoji: '🔇', label: 'Wyciszenie' },
    UNBAN:  { color: COLORS.mod_unban, emoji: '✅', label: 'Unban' },
    UNMUTE: { color: COLORS.mod_unban, emoji: '🔊', label: 'Odciszenie' },
  };
  const cfg = configs[type] || configs.WARN;

  const embed = base(cfg.color)
    .setTitle(`${cfg.emoji} ${cfg.label} | Case #${caseNumber}`)
    .addFields(
      { name: '👤 Gracz', value: `${target}`, inline: true },
      { name: '🛡️ Moderator', value: `${moderator}`, inline: true },
      { name: '📝 Powód', value: reason || 'Brak podanego powodu', inline: false }
    );

  if (duration) {
    embed.addFields({ name: '⏱️ Czas trwania', value: duration, inline: true });
  }

  return embed;
}

/**
 * Embed dla logu kanału tekstowego
 */
function logEmbed(title, description, color = COLORS.neutral) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

module.exports = { COLORS, base, success, error, warning, info, moderation, logEmbed };
