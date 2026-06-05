// Komenda /slownik — interaktywny słownik terminologii RP
// Źródło: server-config.json → slownik_rp.terms
// Dostępna dla: wszystkich

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const { COLORS } = require('../../utils/embed');

// Mapowanie emoji koloru → etykieta kategorii
const KOLOR_LABEL = {
  '🔴': 'Zakazy RP',
  '🟡': 'Ważne zasady',
  '🟢': 'Podstawy',
};

// Mapowanie emoji koloru → kolor embeda
const KOLOR_HEX = {
  '🔴': 0xED4245,
  '🟡': 0xFEE75C,
  '🟢': 0x57F287,
};

function loadTerms() {
  try {
    const cfgPath = path.join(__dirname, '../../../../server-config.json');
    const cfg = JSON.parse(require('fs').readFileSync(cfgPath, 'utf8'));
    return cfg.slownik_rp?.terms ?? [];
  } catch {
    return [];
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slownik')
    .setDescription('Słownik terminologii RP — przeglądaj lub wyszukaj termin')
    .addStringOption(opt =>
      opt
        .setName('szukaj')
        .setDescription('Wpisz termin do wyszukania (np. FRP, BOLO, Void...)')
        .setRequired(false)
        .setMinLength(2)
        .setMaxLength(50)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const terms = loadTerms();

    if (terms.length === 0) {
      return interaction.editReply({
        content: '❌ Nie udało się wczytać słownika. Skontaktuj się z administracją.',
      });
    }

    const query = interaction.options.getString('szukaj');

    // ── TRYB WYSZUKIWANIA ────────────────────────────────────────
    if (query) {
      const q = query.toLowerCase().trim();
      const matches = terms.filter(t =>
        t.term.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q)
      );

      if (matches.length === 0) {
        return interaction.editReply({
          content: `❌ Nie znaleziono terminu pasującego do: **${query}**\n\nUżyj \`/slownik\` bez argumentu, aby zobaczyć pełną listę.`,
        });
      }

      // Pokaż do 5 trafień
      const shown = matches.slice(0, 5);
      const embed = new EmbedBuilder()
        .setColor(KOLOR_HEX[shown[0].color] ?? COLORS.primary)
        .setTitle(`🔍 Wyniki dla: „${query}"`)
        .setDescription(`Znaleziono **${matches.length}** termin(ów).${matches.length > 5 ? ' Pokazuję pierwsze 5.' : ''}`)
        .setFooter({ text: 'AURORA Greenville RP — Słownik RP' })
        .setTimestamp();

      for (const t of shown) {
        embed.addFields({
          name: `${t.color} ${t.term}`,
          value: t.desc,
          inline: false,
        });
      }

      return interaction.editReply({ embeds: [embed] });
    }

    // ── TRYB PEŁNA LISTA ─────────────────────────────────────────
    // Grupuj po kolorze
    const grouped = {};
    for (const t of terms) {
      const kat = t.color;
      if (!grouped[kat]) grouped[kat] = [];
      grouped[kat].push(t);
    }

    const embeds = [];

    const headerEmbed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('📖 Słownik Terminologii RP — AURORA Greenville RP')
      .setDescription(
        'Kompendium terminów używanych podczas sesji RP na serwerze.\n\n' +
        '🔴 **Zakazy RP** — naruszenia skutkujące karą\n' +
        '🟡 **Ważne zasady** — mechaniki, które musisz znać\n' +
        '🟢 **Podstawy** — fundamenty dobrego RP\n\n' +
        `💡 Użyj \`/slownik szukaj:<termin>\` aby szybko wyszukać konkretne pojęcie.\n` +
        `Łącznie **${terms.length}** terminów.`
      )
      .setFooter({ text: 'AURORA Greenville RP — Słownik RP' })
      .setTimestamp();

    embeds.push(headerEmbed);

    // Jeden embed na kategorię
    const COLOR_ORDER = ['🔴', '🟡', '🟢'];
    for (const kolor of COLOR_ORDER) {
      const list = grouped[kolor];
      if (!list || list.length === 0) continue;

      const catEmbed = new EmbedBuilder()
        .setColor(KOLOR_HEX[kolor] ?? COLORS.primary)
        .setTitle(`${kolor} ${KOLOR_LABEL[kolor] ?? kolor}`)
        .setFooter({ text: 'AURORA Greenville RP — Słownik RP' });

      for (const t of list) {
        catEmbed.addFields({
          name: t.term,
          value: t.desc.length > 200 ? t.desc.slice(0, 197) + '…' : t.desc,
          inline: false,
        });
      }

      embeds.push(catEmbed);
    }

    await interaction.editReply({ embeds });
  },
};
