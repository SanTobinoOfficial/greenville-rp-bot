// Komenda /szukaj-cad — przeszukaj historię wezwań CAD
// Filtrowanie po frazie (lokalizacja / opis / rodzaj), statusie, priorytecie i zakresie czasu.
// Uzupełnienie /cad lista, które obsługuje tylko aktywne wezwania i nie ma filtrów tekstowych.
// Dostępna dla: Policja, EMS, Straż, DOT, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, isService } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const PRIORITY_META = {
  LOW:      { emoji: '🟢', label: 'NISKI'     },
  MEDIUM:   { emoji: '🟡', label: 'ŚREDNI'    },
  HIGH:     { emoji: '🔴', label: 'WYSOKI'    },
  CRITICAL: { emoji: '🚨', label: 'KRYTYCZNY' },
};

const STATUS_META = {
  PENDING: { emoji: '⏳', label: 'OCZEKUJE'  },
  ACTIVE:  { emoji: '🔵', label: 'AKTYWNE'   },
  CLOSED:  { emoji: '✅', label: 'ZAMKNIĘTE' },
};

const MAX_RESULTS = 10;
const CHUNK_SIZE  = 4;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('szukaj-cad')
    .setDescription('Przeszukaj historię wezwań CAD po lokalizacji lub opisie (służby / Staff)')
    .addStringOption(opt =>
      opt.setName('fraza')
        .setDescription('Fraza do wyszukania w lokalizacji, opisie lub rodzaju zdarzenia')
        .setRequired(false)
        .setMinLength(2)
        .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('Filtruj po statusie wezwania (domyślnie: wszystkie)')
        .setRequired(false)
        .addChoices(
          { name: '⏳ Oczekuje',   value: 'PENDING' },
          { name: '🔵 Aktywne',    value: 'ACTIVE'  },
          { name: '✅ Zamknięte',  value: 'CLOSED'  },
        )
    )
    .addStringOption(opt =>
      opt.setName('priorytet')
        .setDescription('Filtruj po priorytecie wezwania (domyślnie: wszystkie)')
        .setRequired(false)
        .addChoices(
          { name: '🟢 Niski',      value: 'LOW'      },
          { name: '🟡 Średni',     value: 'MEDIUM'   },
          { name: '🔴 Wysoki',     value: 'HIGH'     },
          { name: '🚨 Krytyczny',  value: 'CRITICAL' },
        )
    )
    .addIntegerOption(opt =>
      opt.setName('dni')
        .setDescription('Zakres w dniach wstecz (domyślnie: 7, max: 90)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(90)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isService(interaction.member) && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko funkcjonariusze służb lub Staff mogą przeszukiwać bazę CAD.',
      });
    }

    const fraza     = interaction.options.getString('fraza')?.trim() ?? null;
    const status    = interaction.options.getString('status')    ?? null;
    const priorytet = interaction.options.getString('priorytet') ?? null;
    const dni       = interaction.options.getInteger('dni')      ?? 7;
    const since     = new Date(Date.now() - dni * 86_400_000);

    // Buduj warunki filtrowania
    const where = { createdAt: { gte: since } };
    if (status)    where.status   = status;
    if (priorytet) where.priority = priorytet;
    if (fraza) {
      where.OR = [
        { location:    { contains: fraza, mode: 'insensitive' } },
        { description: { contains: fraza, mode: 'insensitive' } },
        { nature:      { contains: fraza, mode: 'insensitive' } },
      ];
    }

    let calls;
    try {
      calls = await prisma.cadCall.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: MAX_RESULTS,
      });
    } catch (err) {
      logger.error('szukaj-cad: błąd bazy danych:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas przeszukiwania bazy CAD. Spróbuj ponownie.' });
    }

    // Linia podsumowania filtrów
    const filters = [];
    if (fraza)     filters.push(`fraza: \`${fraza}\``);
    if (status)    filters.push(`status: ${STATUS_META[status]?.label ?? status}`);
    if (priorytet) filters.push(`priorytet: ${PRIORITY_META[priorytet]?.label ?? priorytet}`);
    filters.push(`ostatnie ${dni} ${dni === 1 ? 'dzień' : 'dni'}`);
    const filterLine = filters.join(' • ');

    if (calls.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('🔍 Szukaj CAD — Brak wyników')
            .setDescription(`Nie znaleziono wezwań pasujących do podanych filtrów.\n> ${filterLine}`)
            .setFooter({ text: 'AURORA Greenville RP — Szukaj CAD' })
            .setTimestamp(),
        ],
      });
    }

    // Formatuj każde wezwanie jako blok tekstu
    const lines = calls.map(c => {
      const prio = PRIORITY_META[c.priority] ?? PRIORITY_META.MEDIUM;
      const stat = STATUS_META[c.status]      ?? STATUS_META.PENDING;
      const dateTs = `<t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:D>`;
      const timeTs = `<t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:T>`;
      const descShort = c.description
        ? (c.description.length > 70 ? c.description.slice(0, 67) + '…' : c.description)
        : null;
      const closedLine = c.closedAt
        ? `> ✅ Zamknięto: <t:${Math.floor(new Date(c.closedAt).getTime() / 1000)}:T>`
        : null;

      return [
        `${prio.emoji} **CAD #${c.number}** — ${stat.emoji} ${stat.label} — ${c.nature}`,
        `> 📍 ${c.location}  •  ${dateTs} ${timeTs}`,
        descShort ? `> 📋 ${descShort}` : null,
        closedLine,
      ].filter(Boolean).join('\n');
    });

    const countLabel = calls.length === 1
      ? '1 wynik'
      : calls.length < 5 ? `${calls.length} wyniki` : `${calls.length} wyników`;

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`🔍 Szukaj CAD — ${countLabel}`)
      .setDescription(`Filtry: ${filterLine}`)
      .setFooter({
        text: `AURORA Greenville RP — max ${MAX_RESULTS} wyników | /cad zamknij [numer]`,
      })
      .setTimestamp();

    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      let chunk = lines.slice(i, i + CHUNK_SIZE).join('\n\n');
      if (chunk.length > 1020) chunk = chunk.slice(0, 1017) + '…';
      const fieldLabel = lines.length > CHUNK_SIZE
        ? `📋 Wezwania (${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(lines.length / CHUNK_SIZE)})`
        : '📋 Wezwania';
      embed.addFields({ name: fieldLabel, value: chunk, inline: false });
    }

    logger.info(
      `/szukaj-cad | ${interaction.user.tag} | ` +
      `fraza="${fraza ?? '—'}" status=${status ?? 'ALL'} prio=${priorytet ?? 'ALL'} dni=${dni} | ` +
      `wyniki=${calls.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
