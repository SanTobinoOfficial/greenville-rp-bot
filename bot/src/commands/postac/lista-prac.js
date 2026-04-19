// Komenda /lista-prac — przeglądaj dostępne prace w Greenville RP
// Dostępna dla: wszystkich

const {
  SlashCommandBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} = require('discord.js');
const { COLORS } = require('../../utils/embed');
const path = require('path');
const fs = require('fs');

function getJobs() {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.jobs ?? [];
}

function groupByKategoria(jobs) {
  const groups = {};
  for (const job of jobs) {
    if (!groups[job.kategoria]) groups[job.kategoria] = [];
    groups[job.kategoria].push(job);
  }
  return groups;
}

const CATEGORY_EMOJIS = {
  'Policja': '🚔', 'Dyspozytornia': '📡', 'Straż': '🚒', 'EMS': '🚑', 'DOT': '🚧',
  'Gastronomia': '🍔', 'Kawiarnia': '☕', 'Handel': '🛒', 'Handel/IT': '💻',
  'Handel/Elektryka': '⚡', 'Motoryzacja': '🚗', 'Motoryzacja/Stacja': '⛽',
  'Motoryzacja/Myjnia': '🚿', 'Finanse': '💰', 'Administracja': '🏛️',
  'Przestępczość': '💀', 'Transport': '📦', 'Rozrywka': '🎡',
  'Edukacja': '📚', 'Zdrowie': '🏥', 'Przemysł': '🏭', 'Rolnictwo': '🌾',
  'Usługi': '🔐', 'Inne': '😴',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-prac')
    .setDescription('Przeglądaj dostępne prace w Greenville RP')
    .addStringOption(opt =>
      opt.setName('kategoria')
        .setDescription('Filtruj po kategorii')
        .setRequired(false)
        .addChoices(
          { name: '🚔 Służby', value: 'sluzby' },
          { name: '🍔 Gastronomia', value: 'gastronomia' },
          { name: '🛒 Handel', value: 'handel' },
          { name: '🚗 Motoryzacja', value: 'motoryzacja' },
          { name: '💰 Finanse', value: 'finanse' },
          { name: '📚 Edukacja', value: 'edukacja' },
          { name: '🏥 Zdrowie', value: 'zdrowie' },
          { name: '📦 Transport', value: 'transport' },
          { name: '🎡 Rozrywka & Inne', value: 'inne' },
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const filterArg = interaction.options.getString('kategoria');

    const allJobs = getJobs();
    const groups = groupByKategoria(allJobs);
    const kategorie = Object.keys(groups).sort();

    // Filtrowanie wstępne po argumencie
    let filteredKategorie = kategorie;
    if (filterArg) {
      const filterMap = {
        'sluzby':      ['Policja', 'Dyspozytornia', 'Straż', 'EMS', 'DOT'],
        'gastronomia': ['Gastronomia', 'Kawiarnia'],
        'handel':      ['Handel', 'Handel/IT', 'Handel/Elektryka'],
        'motoryzacja': ['Motoryzacja', 'Motoryzacja/Stacja', 'Motoryzacja/Myjnia'],
        'finanse':     ['Finanse'],
        'edukacja':    ['Edukacja'],
        'zdrowie':     ['Zdrowie'],
        'transport':   ['Transport'],
        'inne':        ['Rozrywka', 'Administracja', 'Przestępczość', 'Przemysł', 'Rolnictwo', 'Usługi', 'Inne'],
      };
      const allowed = filterMap[filterArg] ?? [];
      filteredKategorie = kategorie.filter(k => allowed.includes(k));
    }

    // Pokaż listę kategorii ze statystykami
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle('💼 Lista Dostępnych Prac — AURORA Greenville RP')
      .setDescription(
        `**Łącznie ${allJobs.length} prac** dostępnych w Greenville RP.\n\n` +
        (filterArg ? `Pokazuję filtrowane kategorie.\n\n` : 'Wybierz kategorię, aby zobaczyć szczegóły prac.\n\n') +
        filteredKategorie.map(k => {
          const emoji = CATEGORY_EMOJIS[k] ?? '💼';
          const jobs = groups[k];
          const hasService = jobs.some(j => j.typ === 'SERVICE');
          const badge = hasService ? ' *(wymaga podania)*' : '';
          return `${emoji} **${k}** — ${jobs.length} prac${badge}`;
        }).join('\n')
      )
      .addFields({
        name: '📋 Typy prac',
        value: '✅ **Cywilna** — natychmiastowa\n🏛️ **Służbowa** — wymaga rozpatrzenia przez Staff\n💀 **Kryminalna** — natychmiastowa',
        inline: false,
      })
      .setFooter({ text: 'AURORA Greenville RP • Użyj /wybierz-prace, żeby aplikować' })
      .setTimestamp();

    // Select menu kategorii (max 25)
    const options = filteredKategorie.slice(0, 25).map(k =>
      new StringSelectMenuOptionBuilder()
        .setLabel(k)
        .setValue(`listprac_${k}`)
        .setDescription(`${groups[k].length} dostępnych prac`)
        .setEmoji(CATEGORY_EMOJIS[k] ?? '💼')
    );

    const menu = new StringSelectMenuBuilder()
      .setCustomId('listprac_select_kategoria')
      .setPlaceholder('Wybierz kategorię, żeby zobaczyć prace...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
