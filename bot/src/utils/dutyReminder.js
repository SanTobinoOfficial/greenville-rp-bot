// dutyReminder.js — automatyczne przypomnienia dla zapomnianych dyżurów służb
// Uruchamiany co 30 minut — wykrywa osoby na służbie dłużej niż THRESHOLD i wysyła DM

const { EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

const DUTY_REMINDER_HOURS = 3;
const CHECK_INTERVAL_MS   = 30 * 60 * 1000;
const LOOKBACK_DAYS       = 2;
const REMIND_COOLDOWN_MS  = 4 * 60 * 60 * 1000;

const SERVICE_LABELS = {
  POLICJA:       { name: 'Policja',       emoji: '🚔' },
  EMS:           { name: 'EMS',           emoji: '🚑' },
  STRAZ:         { name: 'Straż Pożarna', emoji: '🚒' },
  DOT:           { name: 'DOT',           emoji: '🚧' },
  STRAZ_MIEJSKA: { name: 'Straż Miejska', emoji: '🛡️' },
  TAKSOWKARZ:    { name: 'Taksówkarz',    emoji: '🚕' },
  NPS:           { name: 'NPS',           emoji: '🌲' },
};

// remindedAt[key] = timestamp ostatniego przypomnienia (zapobiega spamowi)
const remindedAt = new Map();

let reminderInterval = null;

async function checkForgottenDuty(client) {
  try {
    const threshold = new Date(Date.now() - DUTY_REMINDER_HOURS * 60 * 60 * 1000);
    const lookback  = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const oldOnDutyLogs = await prisma.dutyLog.findMany({
      where: {
        action:    'ON_DUTY',
        createdAt: { gte: lookback, lte: threshold },
      },
      include: { user: { select: { discordId: true } } },
      orderBy:  { createdAt: 'asc' },
    });

    let reminded = 0;

    for (const log of oldOnDutyLogs) {
      const remindKey  = `${log.userId}_${log.service}`;
      const lastRemind = remindedAt.get(remindKey) ?? 0;

      if (Date.now() - lastRemind < REMIND_COOLDOWN_MS) continue;

      // Jeśli po tym ON_DUTY pojawił się jakikolwiek nowszy wpis — pomiń
      const newerEntry = await prisma.dutyLog.findFirst({
        where: {
          userId:    log.userId,
          service:   log.service,
          createdAt: { gt: log.createdAt },
        },
      });
      if (newerEntry) continue;

      const svcInfo = SERVICE_LABELS[log.service] ?? { name: log.service, emoji: '🔵' };
      const ageMin  = Math.round((Date.now() - log.createdAt.getTime()) / 60000);
      const ageH    = Math.floor(ageMin / 60);
      const ageM    = ageMin % 60;
      const ageStr  = ageH > 0 ? `${ageH}h ${ageM}min` : `${ageM}min`;

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${svcInfo.emoji} Zapomniałeś/aś wyjść ze służby!`)
        .setDescription(
          `Twój dyżur **${svcInfo.name}** trwa już **${ageStr}** bez wylogowania.\n\n` +
          `Jeśli zakończyłeś/aś służbę, użyj \`/duty\` aby poprawnie wylogować się i zapisać czas dyżuru w statystykach.`
        )
        .setFooter({ text: 'AURORA Greenville RP — System Służb' })
        .setTimestamp();

      try {
        const discordUser = await client.users.fetch(log.user.discordId).catch(() => null);
        if (discordUser) {
          await discordUser.send({ embeds: [embed] }).catch(() => {});
          remindedAt.set(remindKey, Date.now());
          reminded++;
          logger.info(`Duty reminder: DM → ${log.user.discordId} (${svcInfo.name}, ${ageStr})`);
        }
      } catch {
        // DM zablokowane przez gracza — cicho pomiń
      }
    }

    if (reminded > 0) {
      logger.info(`Duty reminder: wysłano ${reminded} przypomnień o zapomnianym dyżurze`);
    }
  } catch (error) {
    logger.error('Duty reminder: błąd sprawdzania dyżurów:', error.message);
  }
}

function startDutyReminder(client) {
  if (reminderInterval) clearInterval(reminderInterval);

  // Pierwsze sprawdzenie po 5 minutach — bot może się jeszcze inicjalizować
  setTimeout(() => checkForgottenDuty(client), 5 * 60 * 1000);

  reminderInterval = setInterval(() => checkForgottenDuty(client), CHECK_INTERVAL_MS);

  logger.info(`Uruchomiono system przypomnień o dyżurze (co 30 minut, próg: ${DUTY_REMINDER_HOURS}h)`);
}

function stopDutyReminder() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}

module.exports = { startDutyReminder, stopDutyReminder };
