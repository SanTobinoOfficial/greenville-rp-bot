// Komenda /czas-sluzby — statystyki czasu służby z tabeli DutyLog
// Moje: własne statystyki | gracza (Staff): czas służby innego gracza
// sluzby (Staff): podsumowanie aktywności danej służby (top 10)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_META = {
  POLICJA:       { label: 'Policja',              emoji: '🚔', color: 0x003087 },
  EMS:           { label: 'EMS',                  emoji: '🚑', color: 0xED4245 },
  STRAZ:         { label: 'Straż Pożarna',        emoji: '🚒', color: 0xFEE75C },
  DOT:           { label: 'DOT',                  emoji: '🚧', color: 0xFF7F00 },
  STRAZ_MIEJSKA: { label: 'Straż Miejska',        emoji: '🛡️', color: 0x2ECC71 },
  TAKSOWKARZ:    { label: 'Taksówkarz',           emoji: '🚕', color: 0xF1C40F },
  NPS:           { label: 'National Park Service', emoji: '🌲', color: 0x16A34A },
};

// Oblicza łączny czas służby (w minutach) z listy wpisów DutyLog dla jednego serwisu
// Paruje kolejne ON_DUTY → OFF_DUTY; jeśli ostatni jest ON_DUTY — liczy czas do teraz
function calculateDutyMinutes(logs) {
  let total = 0;
  let onDutyAt = null;

  for (const log of logs) {
    if (log.action === 'ON_DUTY') {
      onDutyAt = log.createdAt;
    } else if (log.action === 'OFF_DUTY' && onDutyAt) {
      total += (log.createdAt - onDutyAt) / 60000;
      onDutyAt = null;
    }
  }
  // Jeśli nadal jest na służbie — dodaj czas do teraz
  if (onDutyAt) {
    total += (Date.now() - onDutyAt) / 60000;
  }
  return Math.round(total);
}

function formatMinutes(minutes) {
  if (minutes < 1) return '< 1 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h ${m}m`;
}

// Grupuje logi po serwisie i zwraca obiekt { POLICJA: minutes, ... }
function groupByService(logs) {
  const grouped = {};
  for (const service of Object.keys(SERVICE_META)) {
    const serviceLogs = logs.filter(l => l.service === service);
    if (serviceLogs.length > 0) {
      grouped[service] = calculateDutyMinutes(serviceLogs);
    }
  }
  return grouped;
}

// Liczba sesji (par ON→OFF) dla danej listy logów jednego serwisu
function countSessions(logs) {
  return logs.filter(l => l.action === 'OFF_DUTY').length;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('czas-sluzby')
    .setDescription('Sprawdź statystyki czasu służby')
    .addSubcommand(sub =>
      sub.setName('moje')
        .setDescription('Twój czas służby (ostatnie 30 dni)')
        .addIntegerOption(opt =>
          opt.setName('dni')
            .setDescription('Zakres w dniach (domyślnie: 30)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('gracza')
        .setDescription('Czas służby innego gracza (Staff+)')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz do sprawdzenia')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('dni')
            .setDescription('Zakres w dniach (domyślnie: 30)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('sluzby')
        .setDescription('Ranking aktywności służby — top 10 oficerów (Staff+)')
        .addStringOption(opt =>
          opt.setName('sluzba')
            .setDescription('Wybierz służbę')
            .setRequired(true)
            .addChoices(
              { name: '🚔 Policja',              value: 'POLICJA' },
              { name: '🚑 EMS',                  value: 'EMS' },
              { name: '🚒 Straż Pożarna',        value: 'STRAZ' },
              { name: '🚧 DOT',                  value: 'DOT' },
              { name: '🛡️ Straż Miejska',        value: 'STRAZ_MIEJSKA' },
              { name: '🚕 Taksówkarz',           value: 'TAKSOWKARZ' },
              { name: '🌲 National Park Service', value: 'NPS' },
            )
        )
        .addIntegerOption(opt =>
          opt.setName('dni')
            .setDescription('Zakres w dniach (domyślnie: 30)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ── MOJE ─────────────────────────────────────────────────────────────────
    if (sub === 'moje') {
      const dni = interaction.options.getInteger('dni') ?? 30;
      const since = new Date(Date.now() - dni * 86_400_000);

      const userDb = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        select: { id: true },
      });
      if (!userDb) {
        return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany/a w systemie.' });
      }

      const logs = await prisma.dutyLog.findMany({
        where: { userId: userDb.id, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
      });

      if (logs.length === 0) {
        return interaction.editReply({
          content: `📋 Brak wpisów służby w ciągu ostatnich **${dni} dni**.`,
        });
      }

      const byService = groupByService(logs);
      const totalMinutes = Object.values(byService).reduce((a, b) => a + b, 0);
      const totalSessions = countSessions(logs);
      const isCurrentlyOnDuty = logs[logs.length - 1]?.action === 'ON_DUTY';

      const serviceLines = Object.entries(byService)
        .sort((a, b) => b[1] - a[1])
        .map(([svc, mins]) => {
          const meta = SERVICE_META[svc];
          const sessions = countSessions(logs.filter(l => l.service === svc));
          return `${meta.emoji} **${meta.label}**: ${formatMinutes(mins)} (${sessions} sesji)`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`⏱️ Czas Służby — ${interaction.user.displayName}`)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          {
            name: `📅 Zakres (ostatnie ${dni} dni)`,
            value: `<t:${Math.floor(since.getTime() / 1000)}:D> — Dziś`,
            inline: false,
          },
          {
            name: '📊 Podsumowanie',
            value: [
              `⏱️ Łączny czas: **${formatMinutes(totalMinutes)}**`,
              `🔄 Łączne sesje: **${totalSessions}**`,
              `🟢 Status: ${isCurrentlyOnDuty ? '**ON DUTY**' : 'Off Duty'}`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '🏢 Rozkład po służbach',
            value: serviceLines || '—',
            inline: false,
          },
        )
        .setFooter({ text: 'AURORA Greenville RP — Czas Służby' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── GRACZA ───────────────────────────────────────────────────────────────
    if (sub === 'gracza') {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: '❌ Tylko Staff może sprawdzać czas służby innych graczy.' });
      }

      const targetUser = interaction.options.getUser('gracz');
      const dni = interaction.options.getInteger('dni') ?? 30;
      const since = new Date(Date.now() - dni * 86_400_000);

      const userDb = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
        select: { id: true },
      });
      if (!userDb) {
        return interaction.editReply({ content: `❌ Gracz ${targetUser.tag} nie jest zarejestrowany/a w systemie.` });
      }

      const logs = await prisma.dutyLog.findMany({
        where: { userId: userDb.id, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
      });

      if (logs.length === 0) {
        return interaction.editReply({
          content: `📋 Brak wpisów służby dla **${targetUser.tag}** w ciągu ostatnich **${dni} dni**.`,
        });
      }

      const byService = groupByService(logs);
      const totalMinutes = Object.values(byService).reduce((a, b) => a + b, 0);
      const totalSessions = countSessions(logs);
      const isCurrentlyOnDuty = logs[logs.length - 1]?.action === 'ON_DUTY';

      const serviceLines = Object.entries(byService)
        .sort((a, b) => b[1] - a[1])
        .map(([svc, mins]) => {
          const meta = SERVICE_META[svc];
          const sessions = countSessions(logs.filter(l => l.service === svc));
          return `${meta.emoji} **${meta.label}**: ${formatMinutes(mins)} (${sessions} sesji)`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`⏱️ Czas Służby — ${targetUser.displayName}`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          {
            name: `📅 Zakres (ostatnie ${dni} dni)`,
            value: `<t:${Math.floor(since.getTime() / 1000)}:D> — Dziś`,
            inline: false,
          },
          {
            name: '📊 Podsumowanie',
            value: [
              `⏱️ Łączny czas: **${formatMinutes(totalMinutes)}**`,
              `🔄 Łączne sesje: **${totalSessions}**`,
              `🟢 Status: ${isCurrentlyOnDuty ? '**ON DUTY**' : 'Off Duty'}`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '🏢 Rozkład po służbach',
            value: serviceLines || '—',
            inline: false,
          },
        )
        .setFooter({ text: `AURORA Greenville RP — sprawdził: ${interaction.user.tag}` })
        .setTimestamp();

      logger.info(`/czas-sluzby gracza: ${interaction.user.tag} sprawdził ${targetUser.tag}`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── SŁUŻBY ───────────────────────────────────────────────────────────────
    if (sub === 'sluzby') {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({ content: '❌ Tylko Staff może sprawdzać ranking aktywności służb.' });
      }

      const serviceKey = interaction.options.getString('sluzba');
      const dni = interaction.options.getInteger('dni') ?? 30;
      const since = new Date(Date.now() - dni * 86_400_000);
      const meta = SERVICE_META[serviceKey];

      // Pobierz wszystkie logi dla tej służby z zakresu, z userId
      const logs = await prisma.dutyLog.findMany({
        where: { service: serviceKey, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { discordId: true, discordUsername: true } } },
      });

      if (logs.length === 0) {
        return interaction.editReply({
          content: `📋 Brak wpisów służby **${meta.label}** w ciągu ostatnich **${dni} dni**.`,
        });
      }

      // Pogrupuj po userId
      const perUser = {};
      for (const log of logs) {
        if (!perUser[log.userId]) {
          perUser[log.userId] = {
            discordId: log.user.discordId,
            username: log.user.discordUsername,
            logs: [],
          };
        }
        perUser[log.userId].logs.push(log);
      }

      // Oblicz czas dla każdego i posortuj malejąco
      const ranked = Object.values(perUser)
        .map(u => ({
          discordId: u.discordId,
          username: u.username,
          minutes: calculateDutyMinutes(u.logs),
          sessions: countSessions(u.logs),
          currentlyOnDuty: u.logs[u.logs.length - 1]?.action === 'ON_DUTY',
        }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 10);

      const totalServiceMinutes = ranked.reduce((a, b) => a + b.minutes, 0);
      const onDutyCount = ranked.filter(u => u.currentlyOnDuty).length;

      const rankLines = ranked.map((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        const onDutyTag = u.currentlyOnDuty ? ' 🟢' : '';
        return `${medal} <@${u.discordId}> — **${formatMinutes(u.minutes)}** (${u.sessions} sesji)${onDutyTag}`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(meta.color)
        .setTitle(`${meta.emoji} Aktywność Służby — ${meta.label}`)
        .addFields(
          {
            name: `📅 Zakres (ostatnie ${dni} dni)`,
            value: `<t:${Math.floor(since.getTime() / 1000)}:D> — Dziś`,
            inline: false,
          },
          {
            name: '📊 Służba łącznie',
            value: [
              `⏱️ Łączny czas: **${formatMinutes(totalServiceMinutes)}**`,
              `👮 Aktywnych oficerów: **${ranked.length}**`,
              `🟢 Teraz na służbie: **${onDutyCount}**`,
            ].join('\n'),
            inline: false,
          },
          {
            name: '🏆 Top 10 — Aktywność (czas służby)',
            value: rankLines || '—',
            inline: false,
          },
        )
        .setFooter({ text: `AURORA Greenville RP — raport wygenerował: ${interaction.user.tag}` })
        .setTimestamp();

      logger.info(`/czas-sluzby sluzby: ${interaction.user.tag} sprawdził ${serviceKey}`);
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
