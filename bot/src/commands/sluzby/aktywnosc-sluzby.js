// Komenda /aktywnosc-sluzby — raport aktywności oficerów służby (HR/Staff+)
// Pokazuje aktywnych vs nieaktywnych oficerów z czasem służby, liczbą sesji
// i datą ostatniego dyżuru w wybranym oknie czasowym.
// Dostępna dla: Staff+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_META = {
  POLICJA:       { label: 'Policja',       emoji: '🚔', color: 0x003087, roleName: ROLES.POLICJA },
  EMS:           { label: 'EMS',           emoji: '🚑', color: 0xED4245, roleName: ROLES.EMS },
  STRAZ:         { label: 'Straż Pożarna', emoji: '🚒', color: 0xFEE75C, roleName: ROLES.STRAZ },
  DOT:           { label: 'DOT',           emoji: '🚧', color: 0xFF7F00, roleName: ROLES.DOT },
  STRAZ_MIEJSKA: { label: 'Straż Miejska', emoji: '🛡️', color: 0x2ECC71, roleName: ROLES.STRAZ_MIEJSKA },
  TAKSOWKARZ:    { label: 'Taksówkarz',    emoji: '🚕', color: 0xF1C40F, roleName: ROLES.TAKSOWKARZ },
};

// Oblicza łączny czas służby (minuty) z par ON→OFF; aktywna służba liczy się do teraz
function calculateDutyMinutes(logs) {
  let total = 0;
  let onDutyAt = null;
  for (const log of logs) {
    if (log.action === 'ON_DUTY') {
      onDutyAt = log.createdAt;
    } else if (log.action === 'OFF_DUTY' && onDutyAt) {
      total += (log.createdAt - onDutyAt) / 60_000;
      onDutyAt = null;
    }
  }
  if (onDutyAt) total += (Date.now() - onDutyAt) / 60_000;
  return Math.round(total);
}

function formatMinutes(minutes) {
  if (minutes < 1) return '< 1 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aktywnosc-sluzby')
    .setDescription('Raport aktywności oficerów danej służby — aktywni vs nieaktywni (Staff+)')
    .addStringOption(opt =>
      opt
        .setName('sluzba')
        .setDescription('Służba do sprawdzenia')
        .setRequired(true)
        .addChoices(
          { name: '🚔 Policja',       value: 'POLICJA' },
          { name: '🚑 EMS',           value: 'EMS' },
          { name: '🚒 Straż Pożarna', value: 'STRAZ' },
          { name: '🚧 DOT',           value: 'DOT' },
          { name: '🛡️ Straż Miejska', value: 'STRAZ_MIEJSKA' },
          { name: '🚕 Taksówkarz',    value: 'TAKSOWKARZ' },
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName('dni')
        .setDescription('Zakres analizy w dniach (domyślnie: 14)')
        .setMinValue(1)
        .setMaxValue(90)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Staff/HR może sprawdzać aktywność służb.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const serviceKey = interaction.options.getString('sluzba');
    const dni        = interaction.options.getInteger('dni') ?? 14;
    const meta       = SERVICE_META[serviceKey];
    const since      = new Date(Date.now() - dni * 86_400_000);

    // Odśwież cache członków (role.members może być niekompletne bez fetcha)
    try {
      await interaction.guild.members.fetch();
    } catch (err) {
      logger.warn(`aktywnosc-sluzby: nie udało się odświeżyć members: ${err.message}`);
    }

    // Znajdź rolę tej służby na serwerze
    const serviceRole = interaction.guild.roles.cache.find(r => r.name === meta.roleName);
    if (!serviceRole) {
      return interaction.editReply({
        content: `❌ Nie znaleziono roli **${meta.roleName}** na serwerze.`,
      });
    }

    const serviceMembers = [...serviceRole.members.values()].filter(m => !m.user.bot);
    if (serviceMembers.length === 0) {
      return interaction.editReply({
        content: `ℹ️ Brak użytkowników z rolą **${meta.roleName}**.`,
      });
    }

    // Pobierz rekordy User + DutyLog dla wszystkich oficerów w jednym zapytaniu
    const discordIds = serviceMembers.map(m => m.id);

    const users = await prisma.user.findMany({
      where: { discordId: { in: discordIds } },
      select: {
        discordId: true,
        dutyLogs: {
          where: {
            service: serviceKey,
            createdAt: { gte: since },
          },
          orderBy: { createdAt: 'asc' },
          select: { action: true, createdAt: true },
        },
      },
    });

    const userMap = new Map(users.map(u => [u.discordId, u]));

    const active   = [];
    const inactive = [];

    for (const member of serviceMembers) {
      const userData = userMap.get(member.id);
      if (!userData || userData.dutyLogs.length === 0) {
        inactive.push({ discordId: member.id, displayName: member.displayName });
        continue;
      }

      const logs     = userData.dutyLogs;
      const minutes  = calculateDutyMinutes(logs);
      const sessions = logs.filter(l => l.action === 'OFF_DUTY').length;
      const lastLog  = logs[logs.length - 1];

      active.push({
        discordId:        member.id,
        minutes,
        sessions,
        lastDutyTs:       Math.floor(lastLog.createdAt.getTime() / 1000),
        isCurrentlyOnDuty: lastLog.action === 'ON_DUTY',
      });
    }

    active.sort((a, b) => b.minutes - a.minutes);

    // Formatuj listy (Discord: max ~4096 znaków na opis pola; obcinamy do 15)
    const MAX_SHOW = 15;

    const activeLines = active.slice(0, MAX_SHOW).map((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      const onDutyTag = u.isCurrentlyOnDuty ? ' 🟢' : '';
      return (
        `${medal} <@${u.discordId}> — **${formatMinutes(u.minutes)}** (${u.sessions} sesji)` +
        ` · <t:${u.lastDutyTs}:d>${onDutyTag}`
      );
    });
    if (active.length > MAX_SHOW) activeLines.push(`*+${active.length - MAX_SHOW} więcej*`);

    const inactiveLines = inactive.slice(0, MAX_SHOW).map(u => `• <@${u.discordId}>`);
    if (inactive.length > MAX_SHOW) inactiveLines.push(`*+${inactive.length - MAX_SHOW} więcej*`);

    // Statystyki podsumowania
    const totalMinutes  = active.reduce((s, u) => s + u.minutes, 0);
    const totalSessions = active.reduce((s, u) => s + u.sessions, 0);
    const onDutyNow     = active.filter(u => u.isCurrentlyOnDuty).length;

    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(`${meta.emoji} Aktywność — ${meta.label}`)
      .setDescription(`Zakres: ostatnie **${dni} dni** (<t:${Math.floor(since.getTime() / 1000)}:D> — dziś)`)
      .addFields({
        name: '📊 Podsumowanie',
        value: [
          `👥 Oficerów z rolą: **${serviceMembers.length}**`,
          `✅ Aktywnych: **${active.length}** | ❌ Nieaktywnych: **${inactive.length}**`,
          `⏱️ Łączny czas służby: **${formatMinutes(totalMinutes)}**`,
          `🔄 Łączne sesje: **${totalSessions}**`,
          `🟢 Aktualnie na służbie: **${onDutyNow}**`,
        ].join('\n'),
        inline: false,
      });

    if (active.length > 0) {
      embed.addFields({
        name: `✅ Aktywni oficerowie (${active.length})`,
        value: activeLines.join('\n'),
        inline: false,
      });
    }

    if (inactive.length > 0) {
      embed.addFields({
        name: `❌ Brak aktywności w tym okresie (${inactive.length})`,
        value: inactiveLines.join('\n'),
        inline: false,
      });
    }

    embed
      .setFooter({ text: `AURORA Greenville RP — raport wygenerował: ${interaction.user.tag}` })
      .setTimestamp();

    logger.info(
      `/aktywnosc-sluzby | ${interaction.user.tag} | ${meta.label} | ` +
      `${dni} dni | aktywni: ${active.length}, nieaktywni: ${inactive.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
