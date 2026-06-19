// Komenda /nieaktywni — lista oficerów służby bez dyżuru w ciągu ostatnich X dni
// Przeznaczona dla Staff/HR do przeglądów aktywności i usuwania nieaktywnych
// Krzyżuje role Discord z tabelą DutyLog — bez zmian schematu bazy

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_CONFIG = {
  policja:       { role: 'Policja',       emoji: '🚔', key: 'POLICJA'       },
  ems:           { role: 'EMS',           emoji: '🚑', key: 'EMS'           },
  straz:         { role: 'Straż Pożarna', emoji: '🚒', key: 'STRAZ'         },
  dot:           { role: 'DOT',           emoji: '🚧', key: 'DOT'           },
  straz_miejska: { role: 'Straż Miejska', emoji: '🛡️', key: 'STRAZ_MIEJSKA' },
  taksowkarz:    { role: 'Taksówkarz',    emoji: '🚕', key: 'TAKSOWKARZ'    },
  nps:           { role: 'NPS',           emoji: '🌲', key: 'NPS'           },
};

const MAX_PER_FIELD = 10;
const MAX_FIELDS    = 2; // max 20 wpisów wyświetlanych

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nieaktywni')
    .setDescription('Lista oficerów służby bez dyżuru w ostatnich X dniach (Staff+)')
    .addStringOption(opt =>
      opt.setName('sluzba')
        .setDescription('Służba do sprawdzenia')
        .setRequired(true)
        .addChoices(
          { name: '🚔 Policja',       value: 'policja'       },
          { name: '🚑 EMS',           value: 'ems'           },
          { name: '🚒 Straż Pożarna', value: 'straz'         },
          { name: '🚧 DOT',           value: 'dot'           },
          { name: '🛡️ Straż Miejska', value: 'straz_miejska' },
          { name: '🚕 Taksówkarz',    value: 'taksowkarz'    },
          { name: '🌲 NPS',           value: 'nps'           },
        )
    )
    .addIntegerOption(opt =>
      opt.setName('dni')
        .setDescription('Próg nieaktywności w dniach (domyślnie: 14)')
        .setMinValue(1)
        .setMaxValue(90)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Staff może sprawdzać nieaktywnych oficerów.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const serviceKey = interaction.options.getString('sluzba');
    const dni        = interaction.options.getInteger('dni') ?? 14;
    const cfg        = SERVICE_CONFIG[serviceKey];
    const since      = new Date(Date.now() - dni * 86_400_000);

    // Odśwież cache członków serwera — bez tego role.members może być niepełny
    try {
      await interaction.guild.members.fetch();
    } catch {
      // Kontynuuj z istniejącym cache — tylko ostrzeżenie w logach
      logger.warn(`/nieaktywni: nie udało się odświeżyć cache członków serwera`);
    }

    // Znajdź rolę służby
    const serviceRole = interaction.guild.roles.cache.find(r => r.name === cfg.role);
    if (!serviceRole) {
      return interaction.editReply({
        content: `❌ Rola **${cfg.role}** nie istnieje na serwerze. Użyj /setup aby ją utworzyć.`,
      });
    }

    const serviceMembers = serviceRole.members;
    if (serviceMembers.size === 0) {
      return interaction.editReply({
        content: `ℹ️ Brak członków z rolą **${cfg.role}**.`,
      });
    }

    const discordIds = [...serviceMembers.values()].map(m => m.user.id);

    // Krok 1: Znajdź rekordów użytkowników w bazie danych
    const dbUsers = await prisma.user.findMany({
      where:  { discordId: { in: discordIds } },
      select: { id: true, discordId: true },
    });
    const discordIdToDbId = Object.fromEntries(dbUsers.map(u => [u.discordId, u.id]));
    const dbUserIds       = dbUsers.map(u => u.id);

    // Krok 2: Wyznacz aktywnych — mają co najmniej jeden wpis ON_DUTY w ciągu `dni` dni
    let activeDbIds = new Set();
    if (dbUserIds.length > 0) {
      const activeLogs = await prisma.dutyLog.findMany({
        where: {
          userId:    { in: dbUserIds },
          service:   cfg.key,
          action:    'ON_DUTY',
          createdAt: { gte: since },
        },
        distinct: ['userId'],
        select:   { userId: true },
      });
      activeDbIds = new Set(activeLogs.map(l => l.userId));
    }

    // Krok 3: Pobierz datę ostatniego dyżuru dla nieaktywnych (żeby ją wyświetlić)
    const inactiveDbIds = dbUserIds.filter(id => !activeDbIds.has(id));
    let lastLogMap = {};
    if (inactiveDbIds.length > 0) {
      const lastLogs = await prisma.dutyLog.findMany({
        where: {
          userId:  { in: inactiveDbIds },
          service: cfg.key,
          action:  'ON_DUTY',
        },
        orderBy:  { createdAt: 'desc' },
        distinct: ['userId'],
        select:   { userId: true, createdAt: true },
      });
      lastLogMap = Object.fromEntries(lastLogs.map(l => [l.userId, l.createdAt]));
    }

    // Krok 4: Zbuduj listę nieaktywnych członków serwera
    const inactive = [];
    for (const member of serviceMembers.values()) {
      const dbId = discordIdToDbId[member.user.id];

      if (!dbId) {
        // Nie ma w bazie → nigdy nie użył /duty
        inactive.push({ member, lastDuty: null });
        continue;
      }
      if (!activeDbIds.has(dbId)) {
        // W bazie, ale bez dyżuru w ciągu `dni` dni
        inactive.push({ member, lastDuty: lastLogMap[dbId] ?? null });
      }
    }

    // Sortuj: najpierw nigdy nieaktywni, potem od najdłużej nieaktywnych
    inactive.sort((a, b) => {
      if (!a.lastDuty && !b.lastDuty) return 0;
      if (!a.lastDuty) return -1;
      if (!b.lastDuty) return 1;
      return a.lastDuty.getTime() - b.lastDuty.getTime();
    });

    // Krok 5: Wynik
    if (inactive.length === 0) {
      logger.info(`/nieaktywni | ${interaction.user.tag} | ${cfg.role} | próg: ${dni}d | wszyscy aktywni (${serviceMembers.size})`);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`${cfg.emoji} ${cfg.role} — Wszyscy aktywni!`)
            .setDescription(
              `Wszyscy **${serviceMembers.size}** oficerów **${cfg.role}** ` +
              `pełniło dyżur w ciągu ostatnich **${dni} dni**. 👍`
            )
            .setFooter({ text: `AURORA Greenville RP · sprawdził: ${interaction.user.tag}` })
            .setTimestamp(),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`${cfg.emoji} Nieaktywni oficerowie — ${cfg.role}`)
      .setDescription(
        `Oficerowie **bez dyżuru** w ciągu ostatnich **${dni} dni**.\n` +
        `Nieaktywnych: **${inactive.length}** z ${serviceMembers.size} członków.`
      );

    // Dodaj pola po MAX_PER_FIELD wpisów (limit 1024 znaków na pole)
    const chunks       = [];
    for (let i = 0; i < inactive.length; i += MAX_PER_FIELD) {
      chunks.push(inactive.slice(i, i + MAX_PER_FIELD));
    }
    const displayed    = chunks.slice(0, MAX_FIELDS);
    const hiddenCount  = inactive.length - displayed.flat().length;

    for (let ci = 0; ci < displayed.length; ci++) {
      const lines = displayed[ci].map((entry, li) => {
        const idx  = ci * MAX_PER_FIELD + li + 1;
        const last = entry.lastDuty
          ? `<t:${Math.floor(entry.lastDuty.getTime() / 1000)}:R>`
          : '**Nigdy**';
        return `${idx}. <@${entry.member.user.id}> — ${last}`;
      });
      embed.addFields({
        name:   ci === 0 ? '⚠️ Lista nieaktywnych' : '⚠️ Ciąg dalszy',
        value:  lines.join('\n'),
        inline: false,
      });
    }

    if (hiddenCount > 0) {
      embed.addFields({
        name:   'ℹ️ Lista skrócona',
        value:  `+${hiddenCount} kolejnych nieaktywnych. Użyj \`/czas-sluzby sluzby\` z krótkim zakresem, aby zobaczyć pełne statystyki.`,
        inline: false,
      });
    }

    embed
      .setFooter({ text: `AURORA Greenville RP · sprawdził: ${interaction.user.tag}` })
      .setTimestamp();

    logger.info(
      `/nieaktywni | ${interaction.user.tag} | ${cfg.role} | próg: ${dni}d | nieaktywnych: ${inactive.length}/${serviceMembers.size}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
