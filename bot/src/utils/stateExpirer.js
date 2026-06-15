// stateExpirer.js — automatyczne wygasanie nieaktywnych stanów RP postaci
// Uruchamiany co 30 minut — czyści stare wpisy z in-memory statusMap
// Gracze otrzymują powiadomienie DM gdy ich stan wygasa

const { EmbedBuilder } = require('discord.js');
const { statusMap } = require('./characterStateStore');
const logger = require('./logger');

let expirerInterval = null;

const DEFAULT_EXPIRY_HOURS = 4;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_DELAY_MS = 5 * 60 * 1000;

function getExpiryMs() {
  try {
    delete require.cache[require.resolve('../../../server-config.json')];
    const cfg = require('../../../server-config.json');
    const hours = cfg?.server?.features?.character_state_expiry_hours;
    return (typeof hours === 'number' && hours > 0) ? hours * 60 * 60 * 1000 : DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000;
  } catch {
    return DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000;
  }
}

async function expireStaleStates(client) {
  try {
    if (statusMap.size === 0) return;

    const expiryMs = getExpiryMs();
    const now = Date.now();
    const expired = [];

    for (const [discordId, entry] of statusMap) {
      if (now - entry.updatedAt >= expiryMs) {
        expired.push([discordId, entry]);
      }
    }

    if (expired.length === 0) return;

    const expiryHours = Math.round(expiryMs / 3600000);

    for (const [discordId, entry] of expired) {
      statusMap.delete(discordId);

      const ageMin = Math.round((now - entry.updatedAt) / 60000);
      logger.info(
        `Stan RP wygasł: ${entry.icName} (${discordId}) | ` +
        `był: ${entry.stanData.label} | wiek: ${ageMin} min`
      );

      // DM powiadomienie — po cichu ignoruj błędy (prywatne wiadomości mogą być wyłączone)
      try {
        const user = await client.users.fetch(discordId).catch(() => null);
        if (!user) continue;

        const embed = new EmbedBuilder()
          .setColor(0x808080)
          .setTitle('⏰ Stan RP wygasł automatycznie')
          .setDescription(
            `Twój stan RP postaci **${entry.icName}** ` +
            `(${entry.stanData.emoji} ${entry.stanData.label}) ` +
            `został automatycznie usunięty po **${expiryHours} godzinach** braku aktualizacji.\n\n` +
            `Jeśli nadal jesteś aktywny/a, użyj \`/stan-postaci ustaw\` aby ustawić nowy stan.`
          )
          .setFooter({ text: 'AURORA Greenville RP — Stany RP' })
          .setTimestamp();

        await user.send({ embeds: [embed] }).catch(() => {});
      } catch {
        // Cicho pomiń — DM może być zablokowany przez gracza
      }
    }

    logger.info(`Stan RP expirer: wygasło ${expired.length} stan${expired.length === 1 ? '' : 'ów'} IC (próg: ${expiryHours}h)`);
  } catch (error) {
    logger.error('Błąd stateExpirer:', error.message);
  }
}

function startStateExpirer(client) {
  if (expirerInterval) {
    clearInterval(expirerInterval);
  }

  setTimeout(() => expireStaleStates(client), INITIAL_DELAY_MS);

  expirerInterval = setInterval(() => expireStaleStates(client), CHECK_INTERVAL_MS);

  const defaultHours = getExpiryMs() / 3600000;
  logger.info(`Uruchomiono automatyczne wygasanie stanów RP (co 30 minut, próg: ${defaultHours}h)`);
}

function stopStateExpirer() {
  if (expirerInterval) {
    clearInterval(expirerInterval);
    expirerInterval = null;
  }
}

module.exports = { startStateExpirer, stopStateExpirer, expireStaleStates };
