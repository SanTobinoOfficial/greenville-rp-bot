// Komenda /raport-dzienny — dzienny raport aktywności serwera
// Zbiera aktywność ze wszystkich systemów za wybrany dzień:
// duty per służba, BOLO, areszty CAD, mandaty, sesje RP
// Dostępna dla: Policja, EMS, Straż, DOT, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_META = {
  POLICJA:       { label: 'Policja',       emoji: '🚔' },
  EMS:           { label: 'EMS',           emoji: '🚑' },
  STRAZ:         { label: 'Straż Pożarna', emoji: '🚒' },
  DOT:           { label: 'DOT',           emoji: '🚧' },
  STRAZ_MIEJSKA: { label: 'Straż Miejska', emoji: '🛡️' },
  TAKSOWKARZ:    { label: 'Taksówkarz',    emoji: '🚕' },
};

function parseDate(str) {
  const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const date = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return isNaN(date.getTime()) ? null : date;
}

function formatMinutes(minutes) {
  if (minutes < 1) return '< 1 min';
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return h === 0 ? `${min} min` : `${h}h ${min}m`;
}

// Pairs ON_DUTY → OFF_DUTY entries and sums elapsed minutes.
// An unclosed ON_DUTY at window end is counted up to dayEnd (or now, whichever is earlier).
function calcDutyMinutes(logs, dayEnd) {
  let total = 0;
  let onAt = null;
  const ceiling = dayEnd < new Date() ? dayEnd : new Date();

  for (const log of logs) {
    if (log.action === 'ON_DUTY') {
      onAt = new Date(log.createdAt);
    } else if (log.action === 'OFF_DUTY' && onAt) {
      total += (new Date(log.createdAt) - onAt) / 60000;
      onAt = null;
    }
  }
  if (onAt) total += (ceiling - onAt) / 60000;
  return Math.round(total);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raport-dzienny')
    .setDescription('Dzienny raport aktywności — służby, BOLO, areszty, mandaty, sesje (Służby/Staff)')
    .addStringOption(opt =>
      opt.setName('data')
        .setDescription('Data raportu w formacie DD.MM.YYYY (domyślnie: dzisiaj)')
        .setRequired(false)
        .setMaxLength(10)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const isSluzba = member.roles.cache.some(r =>
      [
        ROLES.POLICJA, ROLES.EMS, ROLES.STRAZ, ROLES.DOT, ROLES.STRAZ_MIEJSKA,
        'Policja On-Duty', 'EMS On-Duty', 'Straż On-Duty', 'DOT On-Duty',
        'Straż Miejska On-Duty',
      ].includes(r.name)
    );

    if (!isSluzba && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Raport dzienny dostępny tylko dla funkcjonariuszy służb lub Staffu.',
      });
    }

    // Determine the day window (UTC boundaries)
    const dateStr = interaction.options.getString('data');
    let dayStart, dayEnd, displayDate;

    if (dateStr) {
      const parsed = parseDate(dateStr);
      if (!parsed) {
        return interaction.editReply({
          content: '❌ Nieprawidłowy format daty. Użyj DD.MM.YYYY, np. `15.06.2025`.',
        });
      }
      dayStart = parsed;
      dayEnd   = new Date(parsed.getTime() + 86_400_000);
      displayDate = dateStr;
    } else {
      const now = new Date();
      dayStart    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      dayEnd      = new Date(dayStart.getTime() + 86_400_000);
      displayDate = [
        String(now.getUTCDate()).padStart(2, '0'),
        String(now.getUTCMonth() + 1).padStart(2, '0'),
        now.getUTCFullYear(),
      ].join('.');
    }

    // All queries run in parallel — no joins, all existing tables
    const [dutyLogs, bolosCount, arrestsCount, finesCount, sessionsToday, cadCallsCount] =
      await Promise.all([
        prisma.dutyLog.findMany({
          where:   { createdAt: { gte: dayStart, lt: dayEnd } },
          orderBy: { createdAt: 'asc' },
          select:  { userId: true, service: true, action: true, createdAt: true },
        }),
        prisma.cadWarrant.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.cadArrest.count({  where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.fine.count({       where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.session.findMany({
          where:   { startedAt: { gte: dayStart, lt: dayEnd } },
          orderBy: { startedAt: 'asc' },
          select:  {
            maxPlayers: true,
            peacetime:  true,
            startedAt:  true,
            endedAt:    true,
            signups:    { select: { id: true } },
          },
        }),
        prisma.cadCall.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      ]);

    // ── Per-service duty stats ────────────────────────────────────────────────
    const serviceStats = [];
    let totalDutyMinutes = 0;
    const allOfficerIds = new Set(dutyLogs.map(l => l.userId));

    for (const [svc, meta] of Object.entries(SERVICE_META)) {
      const svcLogs = dutyLogs.filter(l => l.service === svc);
      if (svcLogs.length === 0) continue;

      const mins     = calcDutyMinutes(svcLogs, dayEnd);
      const officers = new Set(svcLogs.map(l => l.userId)).size;
      const shifts   = svcLogs.filter(l => l.action === 'OFF_DUTY').length;

      totalDutyMinutes += mins;
      serviceStats.push({ meta, mins, officers, shifts });
    }

    serviceStats.sort((a, b) => b.mins - a.mins);

    const serviceLines = serviceStats.map(s =>
      `${s.meta.emoji} **${s.meta.label}**: ${formatMinutes(s.mins)} · ${s.officers} os. · ${s.shifts} zmian`
    );

    // ── Session lines ────────────────────────────────────────────────────────
    const sessionLines = sessionsToday.map(s => {
      const pt    = s.peacetime > 0 ? ` *(PT${s.peacetime}°)*` : '';
      const start = `<t:${Math.floor(new Date(s.startedAt).getTime() / 1000)}:t>`;
      const dur   = s.endedAt
        ? formatMinutes(Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 60000))
        : 'trwa';
      return `• ${start}${pt} — ${s.signups.length}/${s.maxPlayers} graczy — ${dur}`;
    });

    const hasActivity =
      allOfficerIds.size > 0 || bolosCount > 0 || arrestsCount > 0 ||
      finesCount > 0 || sessionsToday.length > 0 || cadCallsCount > 0;

    const color = !hasActivity
      ? COLORS.neutral
      : (sessionsToday.length > 0 || allOfficerIds.size >= 3) ? COLORS.success
      : COLORS.info;

    // ── Build embed ──────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📋 Raport Dzienny — ${displayDate}`)
      .setDescription(
        hasActivity
          ? `> Podsumowanie aktywności serwera za dzień **${displayDate}**`
          : `> Brak zarejestrowanej aktywności za dzień **${displayDate}**`
      )
      .addFields(
        {
          name: `👮 Aktywność Służb${allOfficerIds.size > 0 ? ` — ${allOfficerIds.size} os.` : ''}`,
          value: serviceLines.length > 0 ? serviceLines.join('\n') : '_Brak wpisów duty w tym dniu._',
          inline: false,
        },
        {
          name: '🚔 Zdarzenia RP',
          value: [
            `🔎 Wystawione BOLO: **${bolosCount}**`,
            `🔒 Areszty (CAD):   **${arrestsCount}**`,
            `💳 Mandaty:         **${finesCount}**`,
            `📡 Wezwania CAD:    **${cadCallsCount}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: `🎮 Sesje RP (${sessionsToday.length})`,
          value: sessionLines.length > 0 ? sessionLines.join('\n') : '_Brak sesji w tym dniu._',
          inline: false,
        },
      );

    // Summary line only when there's something to show
    const summaryParts = [
      totalDutyMinutes > 0 && `⏱️ Łączny duty: **${formatMinutes(totalDutyMinutes)}**`,
      bolosCount > 0        && `🔎 BOLO: **${bolosCount}**`,
      arrestsCount > 0      && `🔒 Areszty: **${arrestsCount}**`,
      finesCount > 0        && `💳 Mandaty: **${finesCount}**`,
    ].filter(Boolean);

    if (summaryParts.length > 0) {
      embed.addFields({
        name: '📊 Podsumowanie dnia',
        value: summaryParts.join('  •  '),
        inline: false,
      });
    }

    embed
      .setFooter({ text: `AURORA Greenville RP — wygenerował: ${interaction.user.tag}` })
      .setTimestamp();

    logger.info(`/raport-dzienny | ${interaction.user.tag} | data: ${displayDate}`);

    await interaction.editReply({ embeds: [embed] });
  },
};
