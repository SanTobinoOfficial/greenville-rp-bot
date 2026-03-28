// Event ready — uruchamiany gdy bot zaloguje się do Discorda

const { ActivityType } = require('discord.js');
const { startStatsUpdater } = require('../utils/statsUpdater');
const { startRadio } = require('../music/radioManager');
const logger = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client) {
    logger.info(`Bot zalogowany jako: ${client.user.tag}`);
    logger.info(`Obsługuje ${client.guilds.cache.size} serwerów`);

    // Ustaw status bota
    client.user.setPresence({
      activities: [{
        name: 'Greenville RP 🏙️',
        type: ActivityType.Watching,
      }],
      status: 'online',
    });

    // Uruchom aktualizator statystyk
    startStatsUpdater(client);

    // Uruchom radio 24/7
    try {
      const guildId = process.env.DISCORD_GUILD_ID;
      if (guildId) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          await startRadio(client, guild);
        }
      }
    } catch (err) {
      logger.warn('Nie można uruchomić radia:', err.message);
    }

    logger.info('Bot Greenville RP jest gotowy! ✅');
  },
};
