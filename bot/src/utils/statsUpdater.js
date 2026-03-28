// Aktualizator statystyk głosowych (kanały Mieszkańcy/Boty)
// Uruchamiany co 10 minut przez cron

const cron = require('node-cron');
const logger = require('./logger');

let statsTask = null;

/**
 * Aktualizuje nazwy kanałów statystyk
 * @param {import('discord.js').Client} client
 */
async function updateStats(client) {
  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    // Odświeżenie listy członków
    await guild.members.fetch();

    // Liczba zweryfikowanych (rola Mieszkaniec)
    const mieszkaniecRole = guild.roles.cache.find(r => r.name === 'Mieszkaniec');
    const mieszkancyCount = mieszkaniecRole ? mieszkaniecRole.members.size : 0;

    // Liczba botów
    const botCount = guild.members.cache.filter(m => m.user.bot).size;

    // Znajdź kanały głosowe statystyk
    const mieszkancyChannel = guild.channels.cache.find(
      c => c.name.startsWith('👥│Mieszkańcy') && c.type === 2 // ChannelType.GuildVoice
    );
    const botyChannel = guild.channels.cache.find(
      c => c.name.startsWith('🤖│Boty') && c.type === 2
    );

    if (mieszkancyChannel) {
      await mieszkancyChannel.setName(`👥│Mieszkańcy: ${mieszkancyCount}`);
    }
    if (botyChannel) {
      await botyChannel.setName(`🤖│Boty: ${botCount}`);
    }

    logger.debug(`Statystyki zaktualizowane: Mieszkańcy=${mieszkancyCount}, Boty=${botCount}`);
  } catch (error) {
    logger.error('Błąd aktualizacji statystyk:', error.message);
  }
}

/**
 * Uruchamia harmonogram aktualizacji statystyk (co 10 minut)
 */
function startStatsUpdater(client) {
  if (statsTask) {
    statsTask.stop();
  }

  // Pierwsza aktualizacja po 30 sekundach (dajemy botowi czas na załadowanie)
  setTimeout(() => updateStats(client), 30_000);

  // Co 10 minut
  statsTask = cron.schedule('*/10 * * * *', () => updateStats(client));
  logger.info('Uruchomiono aktualizator statystyk (co 10 minut)');
}

function stopStatsUpdater() {
  if (statsTask) {
    statsTask.stop();
    statsTask = null;
  }
}

module.exports = { startStatsUpdater, stopStatsUpdater, updateStats };
