// Event ready — uruchamiany gdy bot zaloguje się do Discorda

const { ActivityType } = require('discord.js');
const { startStatsUpdater } = require('../utils/statsUpdater');
const { startRadio } = require('../music/radioManager');
const { startCaseExpirer } = require('../utils/caseExpirer');
const { startSessionReminder } = require('../utils/sessionReminder');
const { startStateExpirer } = require('../utils/stateExpirer');
const { startDailyBriefing } = require('../utils/dailyBriefing');
const { startDutyReminder } = require('../utils/dutyReminder');
const { startBirthdayChecker } = require('../utils/birthdayChecker');
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
        name: 'AURORA Greenville RP 🏙️',
        type: ActivityType.Watching,
      }],
      status: 'online',
    });

    // Uruchom aktualizator statystyk
    startStatsUpdater(client);

    // Uruchom automatyczne wygasanie przypadków moderacyjnych
    startCaseExpirer(client);

    // Uruchom system przypomnień o sesjach RP
    startSessionReminder(client);

    // Uruchom automatyczne wygasanie nieaktywnych stanów RP
    startStateExpirer(client);

    // Uruchom dzienny briefing poranny (09:00 czasu polskiego)
    startDailyBriefing(client);

    // Uruchom system przypomnień o zapomnianym dyżurze służby
    startDutyReminder(client);

    // Uruchom codzienne sprawdzanie urodzin IC postaci (10:00)
    startBirthdayChecker(client);

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

    logger.info('Bot AURORA Greenville RP jest gotowy! ✅');
  },
};
