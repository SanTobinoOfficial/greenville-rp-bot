// Komenda /statystyki-cad — panel statystyk systemu CAD
// Pokazuje bieżące obciążenie służb: aktywne wezwania, jednostki, BOLO, zatrzymania
// oraz podsumowanie aktywności z ostatnich 7 dni.
// Dostępna dla: Policja, EMS, Straż, DOT, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Progi koloryzacji embed na podstawie liczby aktywnych wezwań
function pickColor(activeCalls) {
  if (activeCalls >= 5) return COLORS.error;
  if (activeCalls >= 2) return COLORS.warning;
  return COLORS.success;
}

// Formatowanie czasu trwania (ms → "Xh Ymin")
function formatDuration(ms) {
  if (ms <= 0) return '0 min';
  const h   = Math.floor(ms / 3_600_000);
  const min = Math.floor((ms % 3_600_000) / 60_000);
  return [h > 0 && `${h}h`, min > 0 && `${min}min`].filter(Boolean).join(' ') || '< 1 min';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki-cad')
    .setDescription('Panel statystyk CAD — aktywność służb i wezwania (Służby/Staff)'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member    = interaction.member;
    const isSluzba  = member.roles.cache.some(r =>
      [
        ROLES.POLICJA, ROLES.EMS, ROLES.STRAZ, ROLES.DOT, ROLES.STRAZ_MIEJSKA,
        'Policja On-Duty', 'EMS On-Duty', 'Straż On-Duty', 'DOT On-Duty',
        'Straż Miejska On-Duty',
      ].includes(r.name)
    );

    if (!isSluzba && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Statystyki CAD dostępne tylko dla funkcjonariuszy służb lub Staffu.',
      });
    }

    const now     = new Date();
    const week    = new Date(now.getTime() - 7 * 86_400_000);

    // ── Równoległe zapytania do bazy ──────────────────────────────────────────
    const [
      pendingCalls,
      activeCalls,
      closedWeek,
      allCallsWeek,
      activeUnits,
      activeBolo,
      activeArrests,
    ] = await Promise.all([
      prisma.cadCall.count({ where: { status: 'PENDING' } }),
      prisma.cadCall.count({ where: { status: 'ACTIVE' } }),
      prisma.cadCall.count({ where: { status: 'CLOSED', closedAt: { gte: week } } }),
      prisma.cadCall.findMany({
        where:   { createdAt: { gte: week } },
        select:  { nature: true, priority: true, status: true, createdAt: true, closedAt: true },
      }),
      prisma.cadUnit.count({ where: { status: { not: 'OFF_DUTY' } } }),
      prisma.cadWarrant.count({ where: { active: true } }),
      prisma.cadArrest.count({ where: { active: true } }),
    ]);

    const openCalls = pendingCalls + activeCalls;

    // ── Statystyki z ostatnich 7 dni ─────────────────────────────────────────
    const weekTotal = allCallsWeek.length;

    // Podział wg priorytetu
    const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const c of allCallsWeek) {
      if (byPriority[c.priority] !== undefined) byPriority[c.priority]++;
    }

    // Top 3 najczęstsze rodzaje zdarzeń (nature)
    const natureCounts = {};
    for (const c of allCallsWeek) {
      if (!c.nature) continue;
      const key = c.nature.slice(0, 40);
      natureCounts[key] = (natureCounts[key] ?? 0) + 1;
    }
    const topNatures = Object.entries(natureCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Średni czas obsługi zamkniętych wezwań (z tego tygodnia)
    const closedWithTimes = allCallsWeek.filter(c => c.status === 'CLOSED' && c.closedAt);
    let avgResponseMs = 0;
    if (closedWithTimes.length > 0) {
      const totalMs = closedWithTimes.reduce(
        (sum, c) => sum + (new Date(c.closedAt) - new Date(c.createdAt)),
        0
      );
      avgResponseMs = totalMs / closedWithTimes.length;
    }

    // ── Buduj embed ───────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(pickColor(openCalls))
      .setTitle('📡 Statystyki CAD — AURORA Greenville RP')
      .setDescription(
        `> Wygenerowano <t:${Math.floor(now.getTime() / 1000)}:T> · dane na żywo z bazy`
      )
      .addFields(
        // Sekcja bieżącego stanu
        {
          name: '🔴 Aktywne wezwania',
          value: [
            `⏳ Oczekujące:  **${pendingCalls}**`,
            `🔵 Obsługiwane: **${activeCalls}**`,
            `📋 Łącznie otwarte: **${openCalls}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '👮 Służby i zatrzymania',
          value: [
            `🟢 Jednostki on-duty: **${activeUnits}**`,
            `🚔 Aktywne zatrzymania: **${activeArrests}**`,
            `🔎 Aktywne BOLO: **${activeBolo}**`,
          ].join('\n'),
          inline: true,
        },
        { name: '​', value: '​', inline: false }, // separator
        // Sekcja 7-dniowa
        {
          name: '📊 Ostatnie 7 dni',
          value: weekTotal > 0
            ? [
                `📞 Łączna liczba wezwań: **${weekTotal}**`,
                `✅ Zamkniętych:          **${closedWeek}**`,
                `⏱️ Śr. czas obsługi:    **${avgResponseMs > 0 ? formatDuration(avgResponseMs) : 'brak danych'}**`,
              ].join('\n')
            : '_Brak wezwań w tym okresie._',
          inline: true,
        },
        {
          name: '🚨 Wezwania wg priorytetu (7 dni)',
          value: weekTotal > 0
            ? [
                `🟢 Niski:      **${byPriority.LOW}**`,
                `🟡 Średni:     **${byPriority.MEDIUM}**`,
                `🔴 Wysoki:     **${byPriority.HIGH}**`,
                `🚨 Krytyczny:  **${byPriority.CRITICAL}**`,
              ].join('\n')
            : '_Brak danych._',
          inline: true,
        },
      );

    // Top 3 rodzajów zdarzeń (opcjonalnie)
    if (topNatures.length > 0) {
      embed.addFields({
        name: '📋 Najczęstsze zdarzenia (7 dni)',
        value: topNatures
          .map(([nature, count], i) => `${i + 1}. **${nature}** — ${count}×`)
          .join('\n'),
        inline: false,
      });
    }

    embed
      .setFooter({ text: 'AURORA Greenville RP — System CAD · /cad lista | /bolo | /lista-bolo' })
      .setTimestamp();

    logger.info(`/statystyki-cad | ${interaction.user.tag} | ${openCalls} otwartych wezwań`);

    await interaction.editReply({ embeds: [embed] });
  },
};
