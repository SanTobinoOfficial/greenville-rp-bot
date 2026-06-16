// dailyBriefing.js — automatyczny dzienny briefing RP
// Wysyła o 09:00 (czas polski) poranne podsumowanie serwera do kanału Staff
// Uruchamiany raz dziennie przez cron — odporne na restarty dzięki node-cron

const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();
let briefingTask = null;

const POLISH_DAYS = [
  'Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota',
];
const POLISH_MONTHS = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

function polishDate(d) {
  return `${POLISH_DAYS[d.getDay()]}, ${d.getDate()} ${POLISH_MONTHS[d.getMonth()]} ${d.getFullYear()} r.`;
}

const norm = s =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

async function postDailyBriefing(client) {
  try {
    const now        = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [activeBOLOs, openTickets, newVerified, todaySessions] = await Promise.all([
      prisma.cadWarrant.count({ where: { active: true } }),
      prisma.ticket.count({ where: { status: { in: ['OPEN', 'CLAIMED'] } } }),
      prisma.user.count({ where: { verifiedAt: { gte: startOfDay } } }),
      prisma.session.findMany({
        where: {
          date:   { gte: startOfDay, lte: endOfDay },
          status: { in: ['UPCOMING', 'ONGOING'] },
        },
        orderBy: { date: 'asc' },
        select:  { id: true, date: true, maxPlayers: true, status: true, description: true },
      }),
    ]);

    // Policz zapisy na sesje dzisiaj
    const sessionsWithCounts = await Promise.all(
      todaySessions.map(async (s) => ({
        ...s,
        signupsCount: await prisma.sessionSignup.count({ where: { sessionId: s.id } }),
      }))
    );

    // Linia statusu dla każdej sesji
    let sessionValue;
    if (sessionsWithCounts.length === 0) {
      sessionValue = '*Brak zaplanowanych sesji na dzisiaj.*';
    } else {
      sessionValue = sessionsWithCounts.map(s => {
        const ts   = Math.floor(s.date.getTime() / 1000);
        const mark = s.status === 'ONGOING' ? '🔴 TRWA' : '🟡';
        const desc = s.description ? ` — ${s.description.slice(0, 40)}${s.description.length > 40 ? '…' : ''}` : '';
        return `${mark} <t:${ts}:t>${desc}\n└ ${s.signupsCount}/${s.maxPlayers} zapisanych`;
      }).join('\n');
    }

    // Kolor embeda: czerwony jeśli są aktywne BOLO lub dużo ticketów, zielony jeśli spokojnie
    const embedColor = activeBOLOs > 0 || openTickets > 3 ? 0xED4245 : 0x57F287;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🌅 Dzienny Briefing — ${polishDate(now)}`)
      .setDescription('Poranne podsumowanie serwera AURORA Greenville RP. Miłego dnia! ☀️')
      .addFields(
        { name: '🚨 Aktywne BOLO',       value: String(activeBOLOs), inline: true },
        { name: '🎫 Otwarte tickety',     value: String(openTickets), inline: true },
        { name: '✅ Nowi zweryfikowani',  value: String(newVerified), inline: true },
        {
          name:  `📅 Sesje dzisiaj (${sessionsWithCounts.length})`,
          value: sessionValue,
          inline: false,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — Automatyczny Briefing Poranny' })
      .setTimestamp();

    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      logger.warn('Dzienny briefing: brak DISCORD_GUILD_ID');
      return;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn('Dzienny briefing: serwer nie znaleziony w cache');
      return;
    }

    // Szukaj kanału staff (po kilku znanych nazwach)
    const targetChannel = guild.channels.cache.find(c =>
      c.isTextBased() && (
        norm(c.name).includes('staff-czat')   ||
        norm(c.name).includes('czat-staffu')  ||
        norm(c.name).includes('ogolne-staff') ||
        norm(c.name).includes('logi-bota')    ||
        norm(c.name).includes('bot-logi')     ||
        norm(c.name).includes('briefing')
      )
    );

    if (!targetChannel) {
      logger.warn('Dzienny briefing: nie znaleziono kanału Staff — pomiń');
      return;
    }

    await targetChannel.send({ embeds: [embed] });
    logger.info(`Dzienny briefing wysłany → #${targetChannel.name} (BOLO: ${activeBOLOs}, tickety: ${openTickets}, sesje: ${sessionsWithCounts.length})`);
  } catch (error) {
    logger.error('Błąd dziennego briefingu:', error.message);
  }
}

function startDailyBriefing(client) {
  if (briefingTask) briefingTask.stop();

  // Codziennie o 09:00 czasu polskiego (Europe/Warsaw) — node-cron v3 obsługuje timezone
  briefingTask = cron.schedule('0 9 * * *', () => postDailyBriefing(client), {
    timezone: 'Europe/Warsaw',
  });

  logger.info('Uruchomiono dzienny briefing (codziennie o 09:00 czasu polskiego)');
}

function stopDailyBriefing() {
  if (briefingTask) {
    briefingTask.stop();
    briefingTask = null;
  }
}

module.exports = { startDailyBriefing, stopDailyBriefing, postDailyBriefing };
