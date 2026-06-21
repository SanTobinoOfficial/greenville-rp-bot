// birthdayChecker.js — Codzienne sprawdzanie urodzin IC postaci
// Szuka Character.birthDate pasujących do dnia i miesiąca dzisiejszej daty.
// Uruchamiany o 10:00 czasu polskiego — po dailyBriefingu, zanim serwer się ożywi.

const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();
let birthdayTask = null;

const norm = s =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

async function postBirthdayWishes(client) {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const day   = now.getDate();

    // Surowe zapytanie — Prisma nie obsługuje nativnie EXTRACT w where
    const characters = await prisma.$queryRaw`
      SELECT c."firstName", c."lastName", c."birthDate", u."discordId"
      FROM "Character" c
      JOIN "User" u ON c."userId" = u."id"
      WHERE EXTRACT(MONTH FROM c."birthDate") = ${month}
        AND EXTRACT(DAY   FROM c."birthDate") = ${day}
    `;

    if (!characters || characters.length === 0) {
      logger.info(`Urodziny IC: brak solenizantów (${day}.${String(month).padStart(2, '0')})`);
      return;
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) { logger.warn('Urodziny IC: brak DISCORD_GUILD_ID'); return; }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) { logger.warn('Urodziny IC: serwer nie w cache'); return; }

    // Szukaj kanału ogólnego (nie-staffowego, nie-OOC)
    const targetChannel = guild.channels.cache.find(c =>
      c.isTextBased() && (
        (norm(c.name).includes('ogolne') && !norm(c.name).includes('staff') && !norm(c.name).includes('ooc')) ||
        norm(c.name).includes('urodziny') ||
        norm(c.name).includes('aktualnosci')
      )
    );

    if (!targetChannel) {
      logger.warn('Urodziny IC: nie znaleziono kanału ogólnego — pomiń');
      return;
    }

    for (const char of characters) {
      const birthYear = new Date(char.birthDate).getFullYear();
      const age = now.getFullYear() - birthYear;

      const embed = new EmbedBuilder()
        .setColor(0xFF73FA)
        .setTitle(`🎂 Urodziny IC — ${char.firstName} ${char.lastName}`)
        .setDescription(
          `Dzisiaj **${char.firstName} ${char.lastName}** świętuje swoje **${age}. urodziny**! 🥳\n\n` +
          `Złóż życzenia solenizantowi — <@${char.discordId}>!`
        )
        .setFooter({ text: 'AURORA Greenville RP — Urodziny IC' })
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] }).catch(() => null);
    }

    const names = characters.map(c => `${c.firstName} ${c.lastName}`).join(', ');
    logger.info(`Urodziny IC: ${characters.length} solenizant(ów) — ${names}`);
  } catch (error) {
    logger.error('Błąd sprawdzania urodzin IC:', error.message);
  }
}

function startBirthdayChecker(client) {
  if (birthdayTask) birthdayTask.stop();

  birthdayTask = cron.schedule('0 10 * * *', () => postBirthdayWishes(client), {
    timezone: 'Europe/Warsaw',
  });

  logger.info('Uruchomiono sprawdzanie urodzin IC (codziennie o 10:00 Warsaw)');
}

function stopBirthdayChecker() {
  if (birthdayTask) { birthdayTask.stop(); birthdayTask = null; }
}

module.exports = { startBirthdayChecker, stopBirthdayChecker, postBirthdayWishes };
