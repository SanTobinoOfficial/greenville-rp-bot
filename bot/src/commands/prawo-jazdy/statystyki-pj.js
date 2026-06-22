// Komenda /statystyki-pj — statystyki systemu prawa jazdy (Moderator+)
// Rozkład licencji według kategorii i statusu, aktywność, najczęstsze powody zawieszeń

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod } = require('../../utils/permissions');

const KATEGORIA_LABEL = {
  AM: 'AM — Motorower',
  A1: 'A1 — Motocykl 125 cm³',
  A2: 'A2 — Motocykl 35 kW',
  A:  'A  — Motocykl',
  B:  'B  — Samochód osobowy',
  C:  'C  — Pojazd ciężarowy',
  D:  'D  — Autobus',
  T:  'T  — Ciągnik rolniczy',
};

const STATUS_EMOJI = {
  ACTIVE:    '✅',
  SUSPENDED: '⏸️',
  REVOKED:   '❌',
};

function formatDays(ms) {
  if (ms <= 0) return 'wygasło';
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki-pj')
    .setDescription('Statystyki systemu praw jazdy (Moderator+)')
    .addStringOption(opt =>
      opt.setName('okres')
        .setDescription('Zakres aktywności (domyślnie: 30 dni)')
        .setRequired(false)
        .addChoices(
          { name: '📅 Dzisiaj',          value: 'dzisiaj'  },
          { name: '📆 Ostatnie 7 dni',   value: 'tydzien'  },
          { name: '🗓️ Ostatnie 30 dni',  value: 'miesiac'  },
          { name: '📚 Cały czas',        value: 'wszystko' },
        )
    ),

  async execute(interaction, client, prisma) {
    if (!isMod(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Moderatorzy mogą przeglądać statystyki praw jazdy.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const periodKey = interaction.options.getString('okres') ?? 'miesiac';
    let since = null;
    if (periodKey === 'dzisiaj') {
      since = new Date();
      since.setHours(0, 0, 0, 0);
    } else if (periodKey === 'tydzien') {
      since = new Date(Date.now() - 7 * 86_400_000);
    } else if (periodKey === 'miesiac') {
      since = new Date(Date.now() - 30 * 86_400_000);
    }

    const whereRecent = since ? { issuedAt: { gte: since } } : {};
    const whereSuspRecent = since ? { suspendedAt: { gte: since } } : {};
    const now = new Date();

    const [
      byStatus,
      byKategoria,
      recentIssued,
      recentSuspended,
      recentRevoked,
      activeSuspensions,
      totalAll,
    ] = await Promise.all([
      // Rozkład wg statusu (globalny)
      prisma.license.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Rozkład wg kategorii i statusu (globalny)
      prisma.license.groupBy({
        by: ['kategoria', 'status'],
        _count: { id: true },
        orderBy: [{ kategoria: 'asc' }],
      }),

      // Wydane w wybranym okresie
      prisma.license.count({ where: whereRecent }),

      // Zawieszone w wybranym okresie
      prisma.license.count({ where: { ...whereSuspRecent, status: 'SUSPENDED' } }),

      // Unieważnione w wybranym okresie
      prisma.license.count({
        where: since
          ? { status: 'REVOKED', suspendedAt: { gte: since } }
          : { status: 'REVOKED' },
      }),

      // Aktywne zawieszenia z datą wygaśnięcia
      prisma.license.findMany({
        where: { status: 'SUSPENDED' },
        select: {
          kategoria:       true,
          suspendedUntil:  true,
          suspendedReason: true,
          user: { select: { discordId: true } },
        },
        orderBy: { suspendedUntil: 'asc' },
        take: 8,
      }),

      // Łącznie wszystkich
      prisma.license.count(),
    ]);

    // ── Statusy globalne ────────────────────────────────────────────────────
    const statusMap = Object.fromEntries(byStatus.map(r => [r.status, r._count.id]));
    const activeCount    = statusMap['ACTIVE']    ?? 0;
    const suspendedCount = statusMap['SUSPENDED'] ?? 0;
    const revokedCount   = statusMap['REVOKED']   ?? 0;

    const overviewValue = [
      `${STATUS_EMOJI.ACTIVE}    Aktywne:     **${activeCount}**`,
      `${STATUS_EMOJI.SUSPENDED} Zawieszone:  **${suspendedCount}**`,
      `${STATUS_EMOJI.REVOKED}   Unieważnione: **${revokedCount}**`,
      `📋 Łącznie: **${totalAll}**`,
    ].join('\n');

    // ── Rozkład wg kategorii ────────────────────────────────────────────────
    const katMap = {};
    for (const row of byKategoria) {
      if (!katMap[row.kategoria]) katMap[row.kategoria] = {};
      katMap[row.kategoria][row.status] = row._count.id;
    }

    const katLines = Object.entries(katMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kat, counts]) => {
        const a = counts['ACTIVE']    ?? 0;
        const s = counts['SUSPENDED'] ?? 0;
        const r = counts['REVOKED']   ?? 0;
        const total = a + s + r;
        const label = KATEGORIA_LABEL[kat] ?? `Kat. ${kat}`;
        return `**${label}** — ${total} (✅${a} ⏸️${s} ❌${r})`;
      })
      .join('\n') || '_Brak danych_';

    // ── Aktywność w okresie ─────────────────────────────────────────────────
    const PERIOD_LABEL = {
      dzisiaj:  'Dzisiaj',
      tydzien:  '7 dni',
      miesiac:  '30 dni',
      wszystko: 'Cały czas',
    };
    const activityValue = [
      `🆕 Wydanych:       **${recentIssued}**`,
      `⏸️ Zawieszonych:  **${recentSuspended}**`,
      `❌ Unieważnionych: **${recentRevoked}**`,
    ].join('\n');

    // ── Aktywne zawieszenia (lista) ─────────────────────────────────────────
    let suspensionLines = '_Brak aktywnych zawieszeń_';
    if (activeSuspensions.length > 0) {
      suspensionLines = activeSuspensions.map(lic => {
        const mention = lic.user?.discordId ? `<@${lic.user.discordId}>` : '_nieznany_';
        const remaining = lic.suspendedUntil
          ? formatDays(new Date(lic.suspendedUntil) - now)
          : 'bezterminowo';
        const reason = (lic.suspendedReason ?? '—').slice(0, 40);
        return `⏸️ **Kat. ${lic.kategoria}** ${mention} — pozostało: ${remaining}\n   └ ${reason}`;
      }).join('\n');
      if (activeSuspensions.length === 8) {
        suspensionLines += `\n_…i więcej. Łącznie: **${suspendedCount}** zawieszeń._`;
      }
    }

    // ── Embed ───────────────────────────────────────────────────────────────
    const periodLabel = PERIOD_LABEL[periodKey] ?? '30 dni';

    const embed = new EmbedBuilder()
      .setColor(0x3498DB)
      .setTitle('🪪 Statystyki Praw Jazdy — AURORA Greenville RP')
      .addFields(
        { name: '📊 Stan globalny',                      value: overviewValue,    inline: false },
        { name: '📋 Rozkład według kategorii',           value: katLines,         inline: false },
        { name: `📅 Aktywność (${periodLabel})`,         value: activityValue,    inline: false },
        { name: `⏸️ Aktywne zawieszenia (top 8)`,        value: suspensionLines,  inline: false },
      )
      .setFooter({ text: `AURORA Greenville RP · sprawdził: ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
