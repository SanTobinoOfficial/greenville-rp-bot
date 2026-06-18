// Komenda /szukaj-regulamin — wyszukiwarka przepisów w regulaminie serwera
// Dostępna dla wszystkich użytkowników; zwraca ephemeralne wyniki.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../../server-config.json');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const MAX_RESULTS = 10;
const REG_COLOR = config.regulamin?.color
  ? parseInt(config.regulamin.color.replace('#', ''), 16)
  : COLORS.regulamin;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('szukaj-regulamin')
    .setDescription('Wyszukaj przepis w regulaminie serwera po słowie kluczowym lub numerze paragrafu')
    .addStringOption(opt =>
      opt
        .setName('fraza')
        .setDescription('Szukana fraza, np. "VDA", "§3", "pojazd", "combat"')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(60)
    ),

  async execute(interaction) {
    const fraza = interaction.options.getString('fraza').trim();
    const query = fraza.toLowerCase();
    const sections = config.regulamin?.sections ?? [];

    // Collect matching rules (flat list, capped at MAX_RESULTS)
    const hits = [];
    outer: for (const section of sections) {
      for (const field of (section.fields ?? [])) {
        const fieldMatch = field.name.toLowerCase().includes(query);
        for (let i = 0; i < field.rules.length; i++) {
          if (fieldMatch || field.rules[i].toLowerCase().includes(query)) {
            hits.push({ fieldName: field.name, ruleNum: i + 1, text: field.rules[i] });
            if (hits.length >= MAX_RESULTS) break outer;
          }
        }
      }
    }

    if (hits.length === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('📜 Brak wyników')
            .setDescription(
              `Nie znaleziono przepisów pasujących do: **\`${fraza}\`**\n\n` +
              `Spróbuj innego słowa kluczowego lub numeru paragrafu, np. \`§3\`, \`VDA\`, \`pojazd\`.`
            )
            .setFooter({ text: 'AURORA Greenville RP — Regulamin' })
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }

    const limited = hits.length >= MAX_RESULTS;

    const pluralForm =
      hits.length === 1 ? 'y przepis' : hits.length < 5 ? 'e przepisy' : 'ych przepisów';

    const embed = new EmbedBuilder()
      .setColor(REG_COLOR)
      .setTitle(`📜 Regulamin — wyniki dla: \`${fraza}\``)
      .setDescription(
        `Znaleziono **${hits.length}** pasując${pluralForm}` +
        (limited ? ` (pierwsze ${MAX_RESULTS})` : '') +
        '.'
      )
      .setFooter({ text: 'AURORA Greenville RP — Regulamin v6.0 • tylko dla Ciebie' })
      .setTimestamp();

    // Group by field name for cleaner display
    const byField = new Map();
    for (const hit of hits) {
      if (!byField.has(hit.fieldName)) byField.set(hit.fieldName, []);
      byField.get(hit.fieldName).push(hit);
    }

    for (const [fieldName, fieldHits] of byField) {
      const value = fieldHits
        .map(h => `> **${h.ruleNum}.** ${h.text.length > 200 ? h.text.slice(0, 197) + '…' : h.text}`)
        .join('\n');
      embed.addFields({
        name: fieldName,
        value: value.slice(0, 1024),
        inline: false,
      });
    }

    logger.info(`/szukaj-regulamin | ${interaction.user.tag} | "${fraza}" | ${hits.length} wyników`);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
