// caseExpirer.js — automatyczne wygasanie przypadków moderacyjnych
// Uruchamiany co 10 minut przez cron — aktualizuje statusy wygasłych case'ów

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();
let expirerTask = null;

async function expireCases(client) {
  try {
    const now = new Date();

    // Znajdź wszystkie aktywne case'y z datą wygaśnięcia w przeszłości
    const expiredCases = await prisma.case.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now },
      },
      include: {
        target: { select: { discordId: true } },
      },
    });

    if (expiredCases.length === 0) return;

    logger.info(`Case expirer: znaleziono ${expiredCases.length} wygasłych przypadków`);

    for (const c of expiredCases) {
      try {
        // Zaktualizuj status
        await prisma.case.update({
          where: { id: c.id },
          data: { status: 'EXPIRED' },
        });

        // Dla banów — automatyczny unban
        if (c.type === 'BAN' && c.target?.discordId) {
          for (const [, guild] of client.guilds.cache) {
            await guild.members.unban(c.target.discordId, `Auto-unban: case #${c.caseNumber} wygasł`)
              .catch(() => {}); // może nie być zbanowany na tym serwerze
          }
          logger.info(`Auto-unban po wygaśnięciu case #${c.caseNumber} (${c.target.discordId})`);
        }

        // Dla mute'ów — usunięcie timeout (Discord obsługuje to automatycznie, ale logujemy)
        if (c.type === 'MUTE') {
          logger.debug(`Case #${c.caseNumber} (MUTE) wygasł automatycznie`);
        }

      } catch (err) {
        logger.error(`Błąd przy wygasaniu case #${c.caseNumber}:`, err.message);
      }
    }

    logger.info(`Case expirer: zaktualizowano ${expiredCases.length} przypadków → EXPIRED`);
  } catch (error) {
    logger.error('Błąd case expirer:', error.message);
  }
}

function startCaseExpirer(client) {
  if (expirerTask) {
    expirerTask.stop();
  }

  // Pierwsza aktualizacja po 2 minutach (bot musi być gotowy)
  setTimeout(() => expireCases(client), 2 * 60 * 1000);

  // Co 10 minut
  expirerTask = cron.schedule('*/10 * * * *', () => expireCases(client));
  logger.info('Uruchomiono automatyczne wygasanie przypadków (co 10 minut)');
}

module.exports = { startCaseExpirer, expireCases };
