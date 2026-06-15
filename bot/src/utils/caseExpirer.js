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
    const cfg = require('../../../server-config.json');
    const hours = cfg?.server?.features?.bolo_expiry_hours;
    return (typeof hours === 'number' && hours > 0) ? hours : 48;
  } catch {
    return 48;
  }
}

function getMaxDutyHours() {
  try {
    const cfg = require('../../../server-config.json');
    const hours = cfg?.server?.features?.max_duty_hours;
    return (typeof hours === 'number' && hours > 0) ? hours : 8;
  } catch {
    return 8;
  }
}

const DUTY_ON_ROLE = {
  POLICJA:       'Policja On-Duty',
  EMS:           'EMS On-Duty',
  STRAZ:         'Straż On-Duty',
  DOT:           'DOT On-Duty',
  STRAZ_MIEJSKA: 'Straż Miejska On-Duty',
  TAKSOWKARZ:    'Taksówkarz On-Duty',
  NPS:           'NPS On-Duty',
};

const DUTY_LABEL = {
  POLICJA:       'Policja',
  EMS:           'EMS',
  STRAZ:         'Straż Pożarna',
  DOT:           'DOT',
  STRAZ_MIEJSKA: 'Straż Miejska',
  TAKSOWKARZ:    'Taksówkarz',
  NPS:           'National Park Service',
};

const DUTY_EMOJI = {
  POLICJA:       '🚔',
  EMS:           '🚑',
  STRAZ:         '🚒',
  DOT:           '🚧',
  STRAZ_MIEJSKA: '🛡️',
  TAKSOWKARZ:    '🚕',
  NPS:           '🌲',
};

async function autoOffStaleDuty(client) {
  try {
    const maxHours = getMaxDutyHours();
    const cutoff = new Date(Date.now() - maxHours * 60 * 60 * 1000);

    const staleOnDutyLogs = await prisma.dutyLog.findMany({
      where: {
        action: 'ON_DUTY',
        createdAt: { lte: cutoff },
      },
      include: { user: { select: { discordId: true } } },
      orderBy: { createdAt: 'asc' },
    });

    if (staleOnDutyLogs.length === 0) return;

    // Dla każdej pary (userId, service) zachowaj tylko najnowszy ON_DUTY
    const latestOnDuty = new Map();
    for (const log of staleOnDutyLogs) {
      latestOnDuty.set(`${log.userId}:${log.service}`, log);
    }

    let autoOffCount = 0;

    for (const [, onLog] of latestOnDuty) {
      const closingLog = await prisma.dutyLog.findFirst({
        where: {
          userId:    onLog.userId,
          service:   onLog.service,
          action:    'OFF_DUTY',
          createdAt: { gt: onLog.createdAt },
        },
      });

      if (closingLog) continue;

      await prisma.dutyLog.create({
        data: { userId: onLog.userId, service: onLog.service, action: 'OFF_DUTY' },
      });

      autoOffCount++;

      const onDutyRoleName = DUTY_ON_ROLE[onLog.service];
      if (!onDutyRoleName || !onLog.user?.discordId) continue;

      for (const [, guild] of client.guilds.cache) {
        const member = await guild.members.fetch(onLog.user.discordId).catch(() => null);
        if (!member) continue;

        const role = guild.roles.cache.find(r => r.name === onDutyRoleName);
        if (role && member.roles.cache.has(role.id)) {
          await member.roles.remove(role, `Auto-off: służba >=${maxHours}h`).catch(err => {
            logger.warn(`Auto-duty-timeout: nie usunięto roli "${onDutyRoleName}" dla ${onLog.user.discordId}: ${err.message}`);
          });
        }

        const dmEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`${DUTY_EMOJI[onLog.service] ?? '⏰'} Automatyczne zakończenie służby`)
          .setDescription(
            `Twoja służba **${DUTY_LABEL[onLog.service] ?? onLog.service}** została automatycznie zakończona, ponieważ trwała dłużej niż **${maxHours} godzin**.\n\nJeśli to błąd, wróć na służbę komendą \`/duty\`.`
          )
          .setTimestamp()
          .setFooter({ text: 'AURORA Greenville RP — System Służb' });

        const discordUser = await client.users.fetch(onLog.user.discordId).catch(() => null);
        if (discordUser) await discordUser.send({ embeds: [dmEmbed] }).catch(() => {});

        break;
      }

      logger.info(`Auto-duty-timeout: zakończono służbę ${onLog.service} dla gracza ${onLog.user.discordId} (trwała >${maxHours}h)`);
    }

    if (autoOffCount > 0) {
      logger.info(`Auto-duty-timeout: automatycznie zakończono ${autoOffCount} zapomnian${autoOffCount === 1 ? 'ą' : 'ych'} służb po >${maxHours}h`);
    }
  } catch (error) {
    logger.error('Błąd auto-duty-timeout:', error.message);
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
    autoOffStaleDuty(client);
  }, 2 * 60 * 1000);

  // Co 10 minut
  expirerTask = cron.schedule('*/10 * * * *', () => {
    expireCases(client);
    expireLicenseSuspensions(client);
    expireOldBOLOs(client);
    autoOffStaleDuty(client);
  });
  logger.info('Uruchomiono automatyczne wygasanie przypadków, zawieszeń PJ, BOLO i dyżurów (co 10 minut)');
}

module.exports = { startCaseExpirer, expireCases, expireLicenseSuspensions, expireOldBOLOs, autoOffStaleDuty };
