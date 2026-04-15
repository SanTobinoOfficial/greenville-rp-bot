// Centralny system logowania bota AURORA Greenville RP
// Loguje zdarzenia do konsoli i opcjonalnie do bazy danych

const { PrismaClient } = require('@prisma/client');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function formatMessage(level, message, ...args) {
  const ts = timestamp();
  const extra = args.length ? ' ' + args.map(a =>
    typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
  ).join(' ') : '';
  return `[${ts}] [${level}] ${message}${extra}`;
}

const logger = {
  info(message, ...args) {
    console.log(
      `${COLORS.green}${formatMessage('INFO', message, ...args)}${COLORS.reset}`
    );
  },

  warn(message, ...args) {
    console.warn(
      `${COLORS.yellow}${formatMessage('WARN', message, ...args)}${COLORS.reset}`
    );
  },

  error(message, ...args) {
    console.error(
      `${COLORS.red}${formatMessage('ERROR', message, ...args)}${COLORS.reset}`
    );
  },

  debug(message, ...args) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `${COLORS.gray}${formatMessage('DEBUG', message, ...args)}${COLORS.reset}`
      );
    }
  },

  // Logowanie do bazy danych + kanału Discord
  async botLog(prisma, client, guildId, channelName, embed) {
    try {
      if (!client || !guildId) return;
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return;

      const channel = guild.channels.cache.find(
        c => c.name === channelName && c.isTextBased()
      );
      if (channel) {
        await channel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.error('Błąd zapisu loga do Discorda:', err.message);
    }
  },
};

module.exports = logger;
