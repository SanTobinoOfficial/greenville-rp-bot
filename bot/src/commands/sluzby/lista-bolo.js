// Komenda /lista-bolo — podgląd aktywnych BOLO i nakazów poszukiwania
// Wyświetla wpisy z tabeli CadWarrant, opcjonalnie z filtrem nazwy
// Dostępna dla: Policja, Straż Miejska, Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MAX_RESULTS  = 20;   // ile wpisów pobrać z bazy
const CHUNK_SIZE   = 10;   // ile wpisów w jednym polu embeda

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-bolo')
    .setDescription('Wyświetl listę aktywnych BOLO — poszukiwane osoby i pojazdy')
    .addStringOption(opt =>
      opt.setName('szukaj')
        .setDescription('Filtruj po nazwisku, imieniu lub nicku Roblox')
        .setRequired(false)
        .setMaxLength(50)
    )
    .addBooleanOption(opt =>
      opt.setName('wszystkie')
        .setDescription('Pokaż też nieaktywne BOLO (domyślnie: tylko aktywne)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    // ── Uprawnienia ───────────────────────────────────────────────
    const member = interaction.member;
    const isPolicja = member.roles.cache.some(r =>
      r.name === ROLES.POLICJA || r.name === 'Policja On-Duty'
    );
    const isSM = member.roles.cache.some(r => r.name === ROLES.STRAZ_MIEJSKA);

    if (!isPolicja && !isSM && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Tylko Policja, Straż Miejska lub Staff może przeglądać bazę BOLO.',
      });
    }

    const query    = interaction.options.getString('szukaj')?.trim() ?? null;
    const showAll  = interaction.options.getBoolean('wszystkie') ?? false;

    // ── Warunki zapytania ─────────────────────────────────────────
    const whereClause = {};
    if (!showAll) {
      whereClause.active = true;
    }
    if (query) {
      whereClause.OR = [
        { targetName: { contains: query, mode: 'insensitive' } },
        { robloxName: { contains: query, mode: 'insensitive' } },
        { reason:     { contains: query, mode: 'insensitive' } },
      ];
    }

    // ── Pobieranie danych ─────────────────────────────────────────
    let warrants;
    try {
      warrants = await prisma.cadWarrant.findMany({
        where:   whereClause,
        orderBy: [
          { active:    'desc' },   // aktywne na górze
          { createdAt: 'desc' },   // potem najnowsze
        ],
        take: MAX_RESULTS,
      });
    } catch (err) {
      logger.error('lista-bolo: błąd bazy danych:', err);
      return interaction.editReply({
        content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.',
      });
    }

    const activeCount = warrants.filter(w => w.active).length;
    const totalShown  = warrants.length;

    // ── Pusty wynik ───────────────────────────────────────────────
    if (totalShown === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ Baza BOLO — Brak wyników')
        .setDescription(
          query
            ? `Nie znaleziono BOLO pasującego do: **${query}**`
            : showAll
              ? 'Baza BOLO jest pusta — brak jakichkolwiek wpisów.'
              : '✅ Brak aktywnych BOLO. Wszystko czyste!'
        )
        .setFooter({ text: 'AURORA Greenville RP — System Policyjny' })
        .setTimestamp();

      return interaction.editReply({ embeds: [emptyEmbed] });
    }

    // ── Formatowanie wpisów ───────────────────────────────────────
    const lines = warrants.map((w, i) => {
      const ts     = `<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:d>`;
      const status = w.active ? '🔴 **AKTYWNE**' : '⬛ Nieaktywne';
      const roblox = w.robloxName ? ` *(Roblox: ${w.robloxName})*` : '';
      const issuer = w.issuedByName || w.issuedBy || 'Nieznany';
      const reason = w.reason.length > 80 ? w.reason.slice(0, 77) + '…' : w.reason;

      return [
        `**${i + 1}. ${w.targetName}**${roblox} — ${status}`,
        `> 📋 ${reason}`,
        `> 👮 Wystawił: ${issuer} | 📅 ${ts}`,
      ].join('\n');
    });

    // ── Podziel na chunki (max 1024 znaków na pole embed) ─────────
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      let chunk = lines.slice(i, i + CHUNK_SIZE).join('\n\n');
      if (chunk.length > 1020) chunk = chunk.slice(0, 1017) + '…';
      chunks.push(chunk);
    }

    // ── Buduj embed ───────────────────────────────────────────────
    const headerColor = activeCount > 0 ? COLORS.error : COLORS.success;

    const summaryParts = [
      `🔴 Aktywne: **${activeCount}**`,
      showAll ? `📋 Wyświetlono: ${totalShown}/${MAX_RESULTS}` : '',
      query   ? `🔍 Filtr: \`${query}\`` : '',
    ].filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(headerColor)
      .setTitle(`🚨 Baza BOLO — ${showAll ? 'Wszystkie wpisy' : 'Aktywne poszukiwania'}`)
      .setDescription(summaryParts.join('  •  '))
      .setFooter({ text: 'AURORA Greenville RP — System Policyjny  |  /bolo — wystaw nowe BOLO' })
      .setTimestamp();

    chunks.forEach((chunk, ci) => {
      const fieldName = chunks.length > 1
        ? `📋 Lista BOLO (${ci + 1}/${chunks.length})`
        : '📋 Lista BOLO';
      embed.addFields({ name: fieldName, value: chunk, inline: false });
    });

    await interaction.editReply({ embeds: [embed] });
    logger.info(`/lista-bolo — ${interaction.user.tag} — wyświetlono ${totalShown} wpisów${query ? ` (szukaj: ${query})` : ''}`);
  },
};
