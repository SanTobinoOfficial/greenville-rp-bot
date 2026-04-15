// Komenda /wybierz-prace — wybór pracy z listy 76 prac
// Flow: select menu (kategoria) → select menu (praca) → embed z regulaminem → przycisk → modal z formularzem → zapis

const {
  SlashCommandBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const path = require('path');
const fs = require('fs');

// Wczytaj listę prac z server-config.json
function getJobs() {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.jobs ?? [];
}

// Grupuj prace po kategorii
function groupByKategoria(jobs) {
  const groups = {};
  for (const job of jobs) {
    if (!groups[job.kategoria]) groups[job.kategoria] = [];
    groups[job.kategoria].push(job);
  }
  return groups;
}

const COOLDOWN_HOURS = 2;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wybierz-prace')
    .setDescription('Wybierz swoją pracę w Greenville RP'),

  async execute(interaction, client, prisma) {
    // Sprawdź weryfikację
    if (!await isVerified(interaction, prisma)) {
      return interaction.reply({
        content: '❌ Musisz być zweryfikowanym mieszkańcem, żeby wybrać pracę.',
        ephemeral: true,
      });
    }

    // Pobierz użytkownika z bazy
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      return interaction.reply({ content: '❌ Nie znaleziono Twojego konta.', ephemeral: true });
    }

    // Sprawdź cooldown
    if (user.jobCooldownEnd && new Date() < user.jobCooldownEnd) {
      const remaining = Math.ceil((user.jobCooldownEnd.getTime() - Date.now()) / 1000 / 60);
      const hours = Math.floor(remaining / 60);
      const mins = remaining % 60;
      return interaction.reply({
        content: `⏳ Musisz poczekać jeszcze **${hours > 0 ? `${hours}h ` : ''}${mins}min** przed zmianą pracy.`,
        ephemeral: true,
      });
    }

    const jobs = getJobs();
    const groups = groupByKategoria(jobs);
    const kategorie = Object.keys(groups);

    // Embed powitalny
    const embed = new EmbedBuilder()
      .setColor(COLORS.info ?? 0x5865F2)
      .setTitle('💼 Wybór Pracy — AURORA Greenville RP')
      .setDescription(
        user.currentJob
          ? `**Twoja obecna praca:** ${user.currentJob}\n\nWybierz kategorię, aby zobaczyć dostępne prace.`
          : 'Wybierz kategorię, aby zobaczyć dostępne prace.\n\n> ℹ️ Po wybraniu pracy obowiązuje **2-godzinny cooldown** przed kolejną zmianą.'
      )
      .addFields(
        { name: '📊 Dostępne kategorie', value: kategorie.map(k => `• ${k} (${groups[k].length})`).join('\n'), inline: false }
      )
      .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
      .setTimestamp();

    // Select menu z kategoriami (max 25)
    const kategorieOptions = kategorie.slice(0, 25).map(k =>
      new StringSelectMenuOptionBuilder()
        .setLabel(k)
        .setValue(`kategoria_${k}`)
        .setDescription(`${groups[k].length} prac w tej kategorii`)
        .setEmoji(getCategoryEmoji(k))
    );

    const kategoriaMenu = new StringSelectMenuBuilder()
      .setCustomId('job_select_kategoria')
      .setPlaceholder('Wybierz kategorię pracy...')
      .addOptions(kategorieOptions);

    const row = new ActionRowBuilder().addComponents(kategoriaMenu);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};

function getCategoryEmoji(kategoria) {
  const map = {
    'Policja': '🚔', 'Dyspozytornia': '📡', 'Straż': '🚒', 'EMS': '🚑', 'DOT': '🚧',
    'Gastronomia': '🍔', 'Kawiarnia': '☕', 'Handel': '🛒', 'Handel/IT': '💻',
    'Handel/Elektryka': '⚡', 'Motoryzacja': '🚗', 'Motoryzacja/Stacja': '⛽',
    'Motoryzacja/Myjnia': '🚿', 'Finanse': '💰', 'Administracja': '🏛️',
    'Przestępczość': '💀', 'Transport': '📦', 'Rozrywka': '🎡',
    'Edukacja': '📚', 'Zdrowie': '🏥', 'Przemysł': '🏭', 'Rolnictwo': '🌾',
    'Usługi': '🔐', 'Inne': '😴',
  };
  return map[kategoria] ?? '💼';
}
