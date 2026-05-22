// Event messageCreate — auto-moderacja: anti-spam, linki, kłótnie
// Wykrywa i usuwa spam/flood/nieodpowiednie linki, wysyła ostrzeżenia

const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

// In-memory spam tracker: userId → [timestamps]
const spamTracker = new Map();
const SPAM_THRESHOLD  = 5;   // 5 wiadomości
const SPAM_WINDOW_MS  = 5000; // w ciągu 5 sekund
const SPAM_TIMEOUT_MS = 60000; // timeout 60 sekund za spam

// Domenowe blacklisty linków
const LINK_BLACKLIST = [
  'discord.gg', 'discord.com/invite',
  'grabify.link', 'iplogger', 'ip-logger',
];

// Kanały, które WYŁĄCZAMY z auto-mod (staff, logi, boty)
const EXEMPT_FRAGMENTS = ['staff', 'logi', 'bot-komendy', 'mod-chat'];

module.exports = {
  name: 'messageCreate',
  once: false,

  async execute(message, client, prisma) {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.member) return;

      // Pomiń kanały wyłączone z auto-mod
      if (EXEMPT_FRAGMENTS.some(f => message.channel.name.toLowerCase().includes(f))) return;

      // Staff jest wyłączony z auto-mod (Helper+)
      const STAFF_ROLES = ['Helper', 'HR', 'Host', 'Moderator', 'Administrator', 'Co-Owner', 'Owner'];
      if (message.member.roles.cache.some(r => STAFF_ROLES.includes(r.name))) return;

      const userId = message.author.id;
      const now = Date.now();

      // ── Anti-Spam / Flood ─────────────────────────────────────────────────────
      const userTimestamps = spamTracker.get(userId) ?? [];
      const recent = userTimestamps.filter(ts => now - ts < SPAM_WINDOW_MS);
      recent.push(now);
      spamTracker.set(userId, recent);

      // Wyczyść stary tracker co jakiś czas
      if (recent.length > 20) spamTracker.delete(userId);

      if (recent.length >= SPAM_THRESHOLD) {
        spamTracker.delete(userId);

        // Usuń ostatnie wiadomości (bulk delete)
        const msgs = await message.channel.messages.fetch({ limit: 10 }).catch(() => null);
        if (msgs) {
          const toDelete = msgs.filter(m =>
            m.author.id === userId &&
            Date.now() - m.createdTimestamp < 14 * 24 * 3600 * 1000 // 14-day limit
          );
          await message.channel.bulkDelete(toDelete).catch(() => {});
        }

        // Timeout 60 sekund
        await message.member.timeout(SPAM_TIMEOUT_MS, 'Auto-mod: spam/flood').catch(() => {});

        // Ostrzeżenie na kanale
        const warn = await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle('⚠️ Auto-Moderacja: Spam')
              .setDescription(
                `<@${userId}> — wykryto flood wiadomości!\n` +
                `Użytkownik otrzymał **timeout 60 sekund**.\n\n` +
                `Przestrzegaj regulaminu serwera, aby uniknąć dalszych kar.`
              )
              .setTimestamp()
          ]
        }).catch(() => null);

        // Usuń ostrzeżenie po 10s
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 10_000);

        // Log moderacyjny
        const logCh = message.guild.channels.cache.find(
          c => c.isTextBased() && c.name.toLowerCase().includes('logi-mod')
        );
        if (logCh) {
          await logCh.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('🤖 Auto-mod: Spam wykryty')
                .addFields(
                  { name: 'Użytkownik', value: `${message.author.tag} (<@${userId}>)`, inline: true },
                  { name: 'Kanał', value: `<#${message.channelId}>`, inline: true },
                  { name: 'Akcja', value: 'Timeout 60s + usunięcie wiadomości', inline: false },
                )
                .setTimestamp()
            ]
          }).catch(() => {});
        }

        logger.info(`Auto-mod spam: ${message.author.tag} w #${message.channel.name}`);
        return;
      }

      // ── Wykrywanie linków z blacklisty ──────────────────────────────────────
      const content = message.content.toLowerCase();
      const hasBlacklistedLink = LINK_BLACKLIST.some(domain => content.includes(domain));

      if (hasBlacklistedLink) {
        await message.delete().catch(() => {});

        const warn = await message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle('🚫 Link zablokowany')
              .setDescription(
                `<@${userId}> — link który próbowałeś/aś wysłać jest niedozwolony.\n` +
                `Zaproszenia do innych serwerów Discord są zabronione regulaminem.`
              )
              .setTimestamp()
          ]
        }).catch(() => null);

        if (warn) setTimeout(() => warn.delete().catch(() => {}), 8_000);

        logger.info(`Auto-mod link: ${message.author.tag} — zablokowany link w #${message.channel.name}`);

        // Log moderacyjny
        const logCh = message.guild.channels.cache.find(
          c => c.isTextBased() && c.name.toLowerCase().includes('logi-mod')
        );
        if (logCh) {
          await logCh.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('🤖 Auto-mod: Zablokowany link')
                .addFields(
                  { name: 'Użytkownik', value: `${message.author.tag} (<@${userId}>)`, inline: true },
                  { name: 'Kanał',     value: `<#${message.channelId}>`, inline: true },
                  { name: 'Treść',     value: content.slice(0, 300), inline: false },
                )
                .setTimestamp()
            ]
          }).catch(() => {});
        }
      }

    } catch (error) {
      logger.error('Błąd w messageCreate (auto-mod):', error);
    }
  },
};
