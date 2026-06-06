// caseExpirer.js — automatyczne wygasanie przypadków moderacyjnych
// Uruchamiany co 10 minut przez cron — aktualizuje statusy wygasłych case'ów

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

const prisma = new PrismaClient();
let expirerTask = null;

function getBoloExpiryHours() {
  try {
    const cfg = require('../../server-config.json');
    const hours = cfg?.server?.features?.bolo_expiry_hours;
    return (typeof hours === 'number' && hours > 0) ? hours : 48;
  } catch {
    return 48;
  }
}

async function expireLicenseSuspensions(client) {
  try {
    const now = new Date();

    const expiredLicenses = await prisma.license.findMany({
      where: {
        status: 'SUSPENDED',
        suspendedUntil: { lte: now },
      },
      include: {
        user: { select: { discordId: true } },
      },
    });

    if (expiredLicenses.length === 0) return;

    logger.info(`License expirer: znaleziono ${expiredLicenses.length} wygasłych zawieszeń PJ`);

    for (const lic of expiredLicenses) {
      try {
        await prisma.license.update({
          where: { id: lic.id },
          data: {
            status:          'ACTIVE',
            suspendedAt:     null,
            suspendedUntil:  null,
            suspendedReason: null,
          },
        });

        // Przywróć rolę @Kat. [X] na każdym serwerze bota
        if (lic.user?.discordId) {
          const roleName = `Kat. ${lic.kategoria}`;
          for (const [, guild] of client.guilds.cache) {
            try {
              const member = await guild.members.fetch(lic.user.discordId).catch(() => null);
              if (!member) continue;
              const role = guild.roles.cache.find(r => r.name === roleName);
              if (role && !member.roles.cache.has(role.id)) {
                await member.roles.add(role, `Auto-przywrócenie PJ kat. ${lic.kategoria} po wygaśnięciu zawieszenia`);
                logger.info(`Auto-przywrócono rolę "${roleName}" graczowi ${lic.user.discordId}`);
              }
            } catch (err) {
              logger.warn(`Nie udało się przywrócić roli "${roleName}" na serwerze ${guild.id}:`, err.message);
            }
          }
        }

        logger.info(`Auto-przywrócono PJ kat. ${lic.kategoria} (licencja ${lic.id}) po wygaśnięciu zawieszenia`);
      } catch (err) {
        logger.error(`Błąd przy przywracaniu licencji ${lic.id}:`, err.message);
      }
    }

    logger.info(`License expirer: przywrócono ${expiredLicenses.length} licencji → ACTIVE`);
  } catch (error) {
    logger.error('Błąd license expirer:', error.message);
  }
}

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

async function expireOldBOLOs(client) {
  try {
    const expiryHours = getBoloExpiryHours();
    const cutoff = new Date(Date.now() - expiryHours * 60 * 60 * 1000);

    const staleBOLOs = await prisma.cadWarrant.findMany({
      where: {
        active: true,
        createdAt: { lte: cutoff },
      },
    });

    if (staleBOLOs.length === 0) return;

    logger.info(`BOLO expirer: znaleziono ${staleBOLOs.length} przeterminowanych BOLO (>${expiryHours}h)`);

    await prisma.cadWarrant.updateMany({
      where: {
        id: { in: staleBOLOs.map(b => b.id) },
      },
      data: { active: false },
    });

    logger.info(`BOLO expirer: zamknięto ${staleBOLOs.length} przeterminowanych BOLO`);

    // Powiadom kanał BOLO o automatycznym wygaśnięciu
    for (const [, guild] of client.guilds.cache) {
      const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const boloChannel = guild.channels.cache.find(
        c => c.isTextBased() && (
          norm(c.name).includes('lista-poszukiwanych') ||
          norm(c.name).includes('policja-czat')
        )
      );
      if (!boloChannel) continue;

      const lines = staleBOLOs.map(b => {
        const ts = `<t:${Math.floor(new Date(b.createdAt).getTime() / 1000)}:d>`;
        return `• \`${b.id.slice(-6).toUpperCase()}\` — **${b.targetName}** (wystawione: ${ts})`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle(`🕐 BOLO — automatyczne wygaśnięcie (${staleBOLOs.length})`)
        .setDescription(
          `Poniższe BOLO zostały automatycznie zamknięte po upływie **${expiryHours} godzin** od wystawienia.\n\n${lines}`
        )
        .setFooter({ text: 'AURORA Greenville RP — BOLO Expirer' })
        .setTimestamp();

      await boloChannel.send({ embeds: [embed] }).catch(err => {
        logger.warn(`BOLO expirer: nie udało się wysłać powiadomienia na ${guild.name}:`, err.message);
      });
      break; // wyślij tylko na pierwszy pasujący serwer
    }
  } catch (error) {
    logger.error('Błąd BOLO expirer:', error.message);
  }
}

function startCaseExpirer(client) {
  if (expirerTask) {
    expirerTask.stop();
  }

  // Pierwsza aktualizacja po 2 minutach (bot musi być gotowy)
  setTimeout(() => {
    expireCases(client);
    expireLicenseSuspensions(client);
    expireOldBOLOs(client);
  }, 2 * 60 * 1000);

  // Co 10 minut
  expirerTask = cron.schedule('*/10 * * * *', () => {
    expireCases(client);
    expireLicenseSuspensions(client);
    expireOldBOLOs(client);
  });
  logger.info('Uruchomiono automatyczne wygasanie przypadków, zawieszeń PJ i BOLO (co 10 minut)');
}

module.exports = { startCaseExpirer, expireCases, expireLicenseSuspensions, expireOldBOLOs };
