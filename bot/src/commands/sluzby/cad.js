// Komenda /cad — zarządzanie wezwaniami CAD (Computer-Aided Dispatch)
// Subkomendy: lista | przyjmij | zamknij
// lista    — wyświetla aktywne wezwania 911 czekające na obsługę
// przyjmij — akceptuje wezwanie (PENDING → ACTIVE) i zapisuje dysponowaną jednostkę
// zamknij  — zamyka wezwanie CAD po numerze z opcjonalną notatką
// Dostępna dla: Policja, EMS, Straż, DOT, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const PRIORITY_META = {
  LOW:      { emoji: '🟢', label: 'NISKI'   },
  MEDIUM:   { emoji: '🟡', label: 'ŚREDNI'  },
  HIGH:     { emoji: '🔴', label: 'WYSOKI'  },
  CRITICAL: { emoji: '🚨', label: 'KRYTYCZNY' },
};

const STATUS_META = {
  PENDING: { emoji: '⏳', label: 'OCZEKUJE'  },
  ACTIVE:  { emoji: '🔵', label: 'AKTYWNE'   },
  CLOSED:  { emoji: '✅', label: 'ZAMKNIĘTE' },
};

const MAX_CALLS_LISTED = 20;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cad')
    .setDescription('System CAD — zarządzaj wezwaniami 911 (lista / przyjmij / zamknij)')
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Wyświetl aktywne wezwania 911 oczekujące na obsługę')
        .addBooleanOption(opt =>
          opt.setName('wszystkie')
            .setDescription('Pokaż też zamknięte wezwania (domyślnie: tylko aktywne)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('przyjmij')
        .setDescription('Przyjmij wezwanie CAD — potwierdzasz dysponowanie Twojej jednostki')
        .addIntegerOption(opt =>
          opt.setName('numer')
            .setDescription('Numer CAD wezwania (np. 42) — widoczny na /cad lista')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(opt =>
          opt.setName('sygnatura')
            .setDescription('Sygnatura jednostki (np. "P-1", "EMS-3") — domyślnie Twój nick')
            .setRequired(false)
            .setMinLength(1)
            .setMaxLength(30)
        )
    )
    .addSubcommand(sub =>
      sub.setName('zamknij')
        .setDescription('Zamknij wezwanie CAD — sprawa rozwiązana')
        .addIntegerOption(opt =>
          opt.setName('numer')
            .setDescription('Numer CAD wezwania (np. 42) — widoczny na /cad lista')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(opt =>
          opt.setName('notatka')
            .setDescription('Notatka zamknięcia (np. "Patrol P-1 obsłużył, winny pouczony")')
            .setRequired(false)
            .setMaxLength(250)
        )
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
        content: '❌ Tylko funkcjonariusze służb lub Staff mogą korzystać z systemu CAD.',
      });
    }

    const sub = interaction.options.getSubcommand();

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      const showAll = interaction.options.getBoolean('wszystkie') ?? false;

      let calls;
      try {
        calls = await prisma.cadCall.findMany({
          where: showAll ? {} : { status: { in: ['PENDING', 'ACTIVE'] } },
          orderBy: [
            { status:    'asc' },
            { createdAt: 'desc' },
          ],
          take: MAX_CALLS_LISTED,
        });
      } catch (err) {
        logger.error('cad lista: błąd bazy danych:', err);
        return interaction.editReply({ content: '❌ Błąd podczas pobierania wezwań. Spróbuj ponownie.' });
      }

      if (calls.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('✅ Baza CAD — Brak aktywnych wezwań')
          .setDescription(showAll ? 'Baza CAD jest pusta.' : '✅ Brak oczekujących ani aktywnych wezwań 911.')
          .setFooter({ text: 'AURORA Greenville RP — Dyspozytornia CAD' })
          .setTimestamp();

        return interaction.editReply({ embeds: [emptyEmbed] });
      }

      const pendingCount = calls.filter(c => c.status === 'PENDING').length;
      const activeCount  = calls.filter(c => c.status === 'ACTIVE').length;

      const lines = calls.map(c => {
        const prio   = PRIORITY_META[c.priority] ?? PRIORITY_META.MEDIUM;
        const status = STATUS_META[c.status]      ?? STATUS_META.PENDING;
        const ts     = `<t:${Math.floor(new Date(c.createdAt).getTime() / 1000)}:T>`;
        const desc   = c.description && c.description.length > 60
          ? c.description.slice(0, 57) + '…'
          : (c.description ?? '—');

        return [
          `${prio.emoji} **CAD #${c.number}** — ${status.emoji} ${status.label} — ${c.nature}`,
          `> 📍 ${c.location}`,
          `> 📋 ${desc}`,
          `> 🕐 ${ts}`,
        ].join('\n');
      });

      const headerColor = pendingCount > 0 ? COLORS.warning : COLORS.success;

      const summaryParts = [
        `⏳ Oczekuje: **${pendingCount}**`,
        `🔵 Aktywne: **${activeCount}**`,
        showAll ? `📋 Wyświetlono: ${calls.length}` : '',
      ].filter(Boolean);

      const embed = new EmbedBuilder()
        .setColor(headerColor)
        .setTitle(`📡 Dyspozytornia CAD — ${showAll ? 'Wszystkie wezwania' : 'Aktywne wezwania'}`)
        .setDescription(summaryParts.join('  •  '))
        .setFooter({ text: 'AURORA Greenville RP — /cad przyjmij [numer] • /cad zamknij [numer]' })
        .setTimestamp();

      // Dziel na max 1024 znaków na pole
      const CHUNK = 5;
      for (let i = 0; i < lines.length; i += CHUNK) {
        let chunk = lines.slice(i, i + CHUNK).join('\n\n');
        if (chunk.length > 1020) chunk = chunk.slice(0, 1017) + '…';
        const label = lines.length > CHUNK
          ? `📋 Wezwania (${i / CHUNK + 1}/${Math.ceil(lines.length / CHUNK)})`
          : '📋 Wezwania';
        embed.addFields({ name: label, value: chunk, inline: false });
      }

      logger.info(`/cad lista — ${interaction.user.tag} — ${calls.length} wezwań`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── PRZYJMIJ ──────────────────────────────────────────────────────────────
    if (sub === 'przyjmij') {
      const numer     = interaction.options.getInteger('numer');
      const sygnatura = (interaction.options.getString('sygnatura') ?? interaction.member.displayName).trim();

      let call;
      try {
        call = await prisma.cadCall.findUnique({ where: { number: numer } });
      } catch (err) {
        logger.error('cad przyjmij: błąd bazy danych:', err);
        return interaction.editReply({ content: '❌ Błąd podczas pobierania wezwania. Spróbuj ponownie.' });
      }

      if (!call) {
        return interaction.editReply({
          content: `❌ Nie znaleziono wezwania CAD o numerze **#${numer}**.\nUżyj \`/cad lista\` aby zobaczyć aktywne wezwania.`,
        });
      }

      if (call.status === 'CLOSED') {
        return interaction.editReply({
          content: `⚠️ Wezwanie CAD **#${numer}** jest już zamknięte — nie można go przyjąć.`,
        });
      }

      const alreadyDispatched = call.dispatchedTo.includes(sygnatura);
      if (alreadyDispatched) {
        return interaction.editReply({
          content: `⚠️ Jednostka **${sygnatura}** jest już przypisana do CAD **#${numer}**.`,
        });
      }

      const wasAlreadyActive = call.status === 'ACTIVE';

      await prisma.cadCall.update({
        where: { number: numer },
        data: {
          status:       'ACTIVE',
          dispatchedTo: { set: [...call.dispatchedTo, sygnatura] },
          updatedAt:    new Date(),
        },
      });

      const prio = PRIORITY_META[call.priority] ?? PRIORITY_META.MEDIUM;

      logger.info(
        `CAD przyjęte: #${numer} (${call.nature}) przez ${interaction.user.tag} | jednostka: ${sygnatura}`
      );

      const confirmEmbed = new EmbedBuilder()
        .setColor(0x3B82F6)
        .setTitle(`🔵 CAD #${numer} — Przyjęte`)
        .setDescription(
          wasAlreadyActive
            ? `Dołączyłeś/aś do aktywnego wezwania jako **${sygnatura}**.`
            : `Wezwanie przekazane do **${sygnatura}** — status zmieniony na AKTYWNE.`
        )
        .addFields(
          { name: '📡 Rodzaj',                  value: call.nature,                                          inline: true  },
          { name: `${prio.emoji} Priorytet`,    value: prio.label,                                           inline: true  },
          { name: '📍 Lokalizacja',              value: call.location,                                        inline: false },
          { name: '🚨 Dysponowane jednostki',   value: [...call.dispatchedTo, sygnatura].join(', '),         inline: false },
          { name: '🕐 Przyjęto',                 value: `<t:${Math.floor(Date.now() / 1000)}:T>`,            inline: true  },
        )
        .setFooter({ text: 'AURORA Greenville RP — Dyspozytornia CAD | /cad zamknij po zakończeniu' })
        .setTimestamp();

      // Powiadom kanał dyspozytorni o przyjęciu wezwania
      const norm = s =>
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const dispatchChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && norm(c.name).includes('dyspozytorni')
      );

      if (dispatchChannel && dispatchChannel.id !== interaction.channelId) {
        const notifEmbed = new EmbedBuilder()
          .setColor(0x3B82F6)
          .setTitle(`🔵 CAD #${numer} PRZYJĘTE — ${sygnatura}`)
          .addFields(
            { name: '📡 Rodzaj',  value: call.nature,   inline: true },
            { name: '📍 Lok.',    value: call.location, inline: true },
            { name: '🚨 Jednostka', value: sygnatura,   inline: true },
          )
          .setFooter({ text: 'AURORA Greenville RP — Dyspozytornia CAD' })
          .setTimestamp();

        await dispatchChannel.send({ embeds: [notifEmbed] }).catch(() => {});
      }

      return interaction.editReply({ embeds: [confirmEmbed] });
    }

    // ── ZAMKNIJ ───────────────────────────────────────────────────────────────
    if (sub === 'zamknij') {
      const numer   = interaction.options.getInteger('numer');
      const notatka = interaction.options.getString('notatka') ?? null;

      let call;
      try {
        call = await prisma.cadCall.findUnique({ where: { number: numer } });
      } catch (err) {
        logger.error('cad zamknij: błąd bazy danych:', err);
        return interaction.editReply({ content: '❌ Błąd podczas pobierania wezwania. Spróbuj ponownie.' });
      }

      if (!call) {
        return interaction.editReply({
          content: `❌ Nie znaleziono wezwania CAD o numerze **#${numer}**.\nUżyj \`/cad lista\` aby zobaczyć aktywne wezwania.`,
        });
      }

      if (call.status === 'CLOSED') {
        return interaction.editReply({
          content: `⚠️ Wezwanie CAD **#${numer}** jest już zamknięte.`,
        });
      }

      await prisma.cadCall.update({
        where: { number: numer },
        data: {
          status:   'CLOSED',
          closedAt: new Date(),
        },
      });

      logger.info(
        `CAD zamknięte: #${numer} (${call.nature}) przez ${interaction.user.tag}` +
        (notatka ? ` — "${notatka}"` : '')
      );

      const prio   = PRIORITY_META[call.priority] ?? PRIORITY_META.MEDIUM;

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`✅ CAD #${numer} — Zamknięte`)
        .setDescription('Wezwanie zostało pomyślnie zamknięte.')
        .addFields(
          { name: '📡 Rodzaj',        value: call.nature,                                  inline: true },
          { name: `${prio.emoji} Priorytet`, value: prio.label,                            inline: true },
          { name: '📍 Lokalizacja',   value: call.location,                                inline: false },
          { name: '👮 Zamknął/a',     value: `<@${interaction.user.id}>`,                  inline: true },
          { name: '🕐 Zamknięto',     value: `<t:${Math.floor(Date.now() / 1000)}:T>`,    inline: true },
          { name: '📅 Zgłoszono',     value: `<t:${Math.floor(new Date(call.createdAt).getTime() / 1000)}:T>`, inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — Dyspozytornia CAD' })
        .setTimestamp();

      if (notatka) {
        embed.addFields({ name: '📝 Notatka zamknięcia', value: notatka, inline: false });
      }

      // Powiadom kanał dyspozytorni o zamknięciu wezwania
      const norm = s =>
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const dispatchChannel = interaction.guild.channels.cache.find(
        c => c.isTextBased() && norm(c.name).includes('dyspozytorni')
      );

      if (dispatchChannel && dispatchChannel.id !== interaction.channelId) {
        const notifEmbed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle(`✅ CAD #${numer} ZAMKNIĘTE`)
          .addFields(
            { name: '📡 Rodzaj',    value: call.nature,                    inline: true },
            { name: '📍 Lok.',      value: call.location,                  inline: true },
            { name: '👮 Zamknął/a', value: `<@${interaction.user.id}>`,    inline: true },
          )
          .setFooter({ text: 'AURORA Greenville RP — Dyspozytornia CAD' })
          .setTimestamp();

        if (notatka) {
          notifEmbed.addFields({ name: '📝 Notatka', value: notatka, inline: false });
        }

        await dispatchChannel.send({ embeds: [notifEmbed] }).catch(() => {});
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
