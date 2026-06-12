// Komenda /raport-zmiany — osobisty raport aktywności z ostatniej zmiany
// Pokazuje: czas służby, wystawione mandaty/grzywny, zatrzymania, wystawione BOLO
// dla ostatnio zakończonej lub aktualnie trwającej zmiany oficera.
// Dostępna dla: wszystkich funkcjonariuszy służb + Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_META = {
  POLICJA:       { label: 'Policja',       emoji: '🚔', color: 0x003087 },
  EMS:           { label: 'EMS',           emoji: '🚑', color: 0xED4245 },
  STRAZ:         { label: 'Straż Pożarna', emoji: '🚒', color: 0xFEE75C },
  DOT:           { label: 'DOT',           emoji: '🚧', color: 0xFF7F00 },
  STRAZ_MIEJSKA: { label: 'Straż Miejska', emoji: '🛡️', color: 0x2ECC71 },
  TAKSOWKARZ:    { label: 'Taksówkarz',    emoji: '🚕', color: 0xF1C40F },
};

const SERVICE_ROLES = [
  ROLES.POLICJA, ROLES.EMS, ROLES.STRAZ, ROLES.DOT, ROLES.STRAZ_MIEJSKA,
  ROLES.TAKSOWKARZ,
  'Policja On-Duty', 'EMS On-Duty', 'Straż On-Duty', 'DOT On-Duty',
  'Straż Miejska On-Duty', 'Taksówkarz On-Duty',
];

function isSluzba(member) {
  return member.roles.cache.some(r => SERVICE_ROLES.includes(r.name));
}

function formatMinutes(minutes) {
  if (minutes < 1) return '< 1 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// Znajduje ostatnią zmianę (ON_DUTY→OFF_DUTY) lub aktualnie trwającą (ON_DUTY bez OFF_DUTY).
// Zwraca { service, shiftStart, shiftEnd|null, minutes, isActive }
function resolveLastShift(logs) {
  // Najnowsze wpisy na początku
  const sorted = [...logs].sort((a, b) => b.createdAt - a.createdAt);

  // Szukaj ostatnio zamkniętej lub aktywnej zmiany
  const openByService = {};
  for (const log of sorted) {
    if (log.action === 'OFF_DUTY') {
      if (!openByService[log.service]) {
        openByService[log.service] = { offAt: log.createdAt };
      }
    } else if (log.action === 'ON_DUTY') {
      if (openByService[log.service]?.offAt) {
        // Zamknięta zmiana
        const offAt = openByService[log.service].offAt;
        const minutes = Math.round((offAt - log.createdAt) / 60_000);
        return {
          service:    log.service,
          shiftStart: log.createdAt,
          shiftEnd:   offAt,
          minutes:    Math.max(0, minutes),
          isActive:   false,
        };
      }
      if (!openByService[log.service]) {
        // Aktywna zmiana bez OFF_DUTY
        const minutes = Math.round((Date.now() - log.createdAt) / 60_000);
        return {
          service:    log.service,
          shiftStart: log.createdAt,
          shiftEnd:   null,
          minutes:    Math.max(0, minutes),
          isActive:   true,
        };
      }
    }
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raport-zmiany')
    .setDescription('Twój osobisty raport aktywności z ostatniej zmiany służby'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isSluzba(interaction.member) && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Komenda dostępna tylko dla funkcjonariuszy służb mundurowych.',
      });
    }

    // Pobierz użytkownika z bazy
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      return interaction.editReply({
        content: '❌ Nie znaleziono konta w systemie. Zweryfikuj się najpierw.',
      });
    }

    // Pobierz ostatnie 100 wpisów DutyLog dla tego użytkownika
    const dutyLogs = await prisma.dutyLog.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    100,
    });

    if (dutyLogs.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📋 Brak danych o zmianach')
            .setDescription('Nie masz jeszcze żadnych zarejestrowanych zmian służby.\nUżyj `/duty on`, aby rozpocząć swoją pierwszą zmianę.')
            .setFooter({ text: 'AURORA Greenville RP — Raport Zmiany' })
            .setTimestamp(),
        ],
      });
    }

    const shift = resolveLastShift(dutyLogs);

    if (!shift) {
      return interaction.editReply({
        content: '❌ Nie udało się ustalić ostatniej zmiany. Upewnij się, że korzystasz z `/duty`.',
      });
    }

    const windowStart = shift.shiftStart;
    const windowEnd   = shift.shiftEnd ?? new Date();

    // Równoległe zapytania dla aktywności w oknie zmiany
    const [mandaty, grzywny, areszty, bolo] = await Promise.all([
      prisma.fine.count({
        where: {
          issuerId:  user.id,
          type:      'MANDAT',
          createdAt: { gte: windowStart, lte: windowEnd },
        },
      }),
      prisma.fine.count({
        where: {
          issuerId:  user.id,
          type:      { in: ['GRZYWNA', 'ARESZT'] },
          createdAt: { gte: windowStart, lte: windowEnd },
        },
      }),
      prisma.arrest.count({
        where: {
          officerId: user.id,
          createdAt: { gte: windowStart, lte: windowEnd },
        },
      }),
      prisma.cadWarrant.count({
        where: {
          issuedBy:  interaction.user.id,
          createdAt: { gte: windowStart, lte: windowEnd },
        },
      }),
    ]);

    const meta    = SERVICE_META[shift.service] ?? { label: shift.service, emoji: '🔷', color: 0x5865F2 };
    const startTs = Math.floor(windowStart.getTime() / 1000);
    const endTs   = shift.shiftEnd ? Math.floor(shift.shiftEnd.getTime() / 1000) : null;

    const titlePrefix = shift.isActive ? '🟢 Aktywna zmiana' : '📋 Raport zmiany';

    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(`${titlePrefix} — ${meta.emoji} ${meta.label}`)
      .setDescription(
        shift.isActive
          ? `Zmiana trwa od <t:${startTs}:T> (<t:${startTs}:R>)`
          : `Zmiana: <t:${startTs}:T> → <t:${endTs}:T> (<t:${startTs}:D>)`
      )
      .addFields(
        {
          name:   '⏱️ Czas służby',
          value:  `**${formatMinutes(shift.minutes)}**`,
          inline: true,
        },
        {
          name:   '📋 Mandaty',
          value:  `**${mandaty}**`,
          inline: true,
        },
        {
          name:   '⚖️ Grzywny / Areszty (typ)',
          value:  `**${grzywny}**`,
          inline: true,
        },
        {
          name:   '🔒 Zatrzymania',
          value:  `**${areszty}**`,
          inline: true,
        },
        {
          name:   '📡 Wystawione BOLO',
          value:  `**${bolo}**`,
          inline: true,
        },
        {
          name:   '📊 Łącznie interwencji',
          value:  `**${mandaty + grzywny + areszty + bolo}**`,
          inline: true,
        },
      )
      .setFooter({
        text:    `AURORA Greenville RP — Raport Zmiany`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/raport-zmiany | ${interaction.user.tag} | ${meta.label} | ` +
      `${formatMinutes(shift.minutes)} | mandaty=${mandaty} grzywny=${grzywny} ` +
      `areszty=${areszty} bolo=${bolo} | active=${shift.isActive}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
