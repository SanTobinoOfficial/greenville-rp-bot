// sessionReminder.js — automatyczne przypomnienia o sesjach RP 30 minut przed startem
// Działa jako cron co minutę — odporne na restarty bota (w przeciwieństwie do setTimeout w sesja.js)

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

const prisma = new PrismaClient();

// In-memory guard — zapobiega podwójnemu pingowi w tej samej instancji bota
const reminded = new Set();

let reminderTask = null;

async function checkUpcomingSessions(client) {
  try {
    const now = new Date();
    // Okno: sesje startujące między 29:30 a 30:30 min od teraz (dokładnie 1 minuta)
    const windowStart = new Date(now.getTime() + 29.5 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 30.5 * 60 * 1000);

    const sessions = await prisma.session.findMany({
      where: {
        status: 'UPCOMING',
        date: { gte: windowStart, lte: windowEnd },
      },
      include: {
        signups: {
          include: { user: { select: { discordId: true } } },
        },
        host: { select: { discordId: true } },
      },
    });

    for (const session of sessions) {
      if (reminded.has(session.id)) continue;
      reminded.add(session.id);

      if (!session.channelId) {
        logger.warn(`Session reminder: sesja ${session.id} nie ma channelId — pomijam`);
        continue;
      }

      const guildId = process.env.DISCORD_GUILD_ID;
      if (!guildId) continue;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const channel = guild.channels.cache.get(session.channelId);
      if (!channel?.isTextBased()) {
        logger.warn(`Session reminder: kanał ${session.channelId} niedostępny dla sesji ${session.id}`);
        continue;
      }

      const signupCount = session.signups.length;
      const unixTs = Math.floor(session.date.getTime() / 1000);
      const hostMention = session.host?.discordId ? `<@${session.host.discordId}>` : 'Nieznany';

      const playerMentions = session.signups
        .filter(s => s.user?.discordId)
        .map(s => `<@${s.user.discordId}>`)
        .join(' ');

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle('⏰ Sesja RP rozpoczyna się za 30 minut!')
        .setDescription(`Sesja startuje <t:${unixTs}:R>. Zaloguj się do Roblox i bądź gotowy!`)
        .addFields(
          { name: '👤 Host',       value: hostMention,                      inline: true },
          { name: '👥 Zapisani',   value: `${signupCount}/${session.maxPlayers}`, inline: true },
          { name: '🕐 Godzina',    value: `<t:${unixTs}:t>`,               inline: true },
        )
        .setFooter({ text: `AURORA Greenville RP • ID sesji: ${session.id.slice(0, 8)}` })
        .setTimestamp();

      const content = playerMentions
        ? `🔔 **Przypomnienie o sesji!** ${playerMentions}`
        : '🔔 **Przypomnienie o sesji!**';

      await channel.send({ content, embeds: [embed] });

      logger.info(`Session reminder: wysłano ping 30-min dla sesji ${session.id} (${signupCount}/${session.maxPlayers} graczy)`);
    }
  } catch (error) {
    logger.error('Session reminder: błąd podczas sprawdzania sesji:', error.message);
  }
}

function startSessionReminder(client) {
  if (reminderTask) reminderTask.stop();

  // Uruchom co minutę
  reminderTask = cron.schedule('* * * * *', () => {
    checkUpcomingSessions(client);
  });

  logger.info('Uruchomiono system przypomnień o sesjach RP (co minutę, ping 30 min przed startem)');
}

module.exports = { startSessionReminder };
