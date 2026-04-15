// Handler: job_select_kategoria — po wyborze kategorii pokazuje listę prac
const {
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

module.exports = {
  async execute(interaction, client, prisma) {
    const selectedKategoria = interaction.values[0].replace('kategoria_', '');
    const jobs = getJobs().filter(j => j.kategoria === selectedKategoria);

    const embed = new EmbedBuilder()
      .setColor(COLORS.info ?? 0x5865F2)
      .setTitle(`💼 Kategoria: ${selectedKategoria}`)
      .setDescription(`Dostępne prace w kategorii **${selectedKategoria}** (${jobs.length}):\n\nWybierz pracę z listy poniżej.`)
      .setFooter({ text: 'AURORA Greenville RP • System Pracy' });

    const options = jobs.slice(0, 25).map(job =>
      new StringSelectMenuOptionBuilder()
        .setLabel(job.name)
        .setValue(`job_${job.id}`)
        .setDescription(`${job.wynagrodzenie_min}–${job.wynagrodzenie_max}$ | Typ: ${job.typ === 'SERVICE' ? 'Służby (wymaga podania)' : job.typ === 'CRIMINAL' ? 'Kryminalne' : 'Cywilna'}`)
        .setEmoji(job.emoji ?? '💼')
    );

    if (options.length === 0) {
      return interaction.update({
        content: '❌ Brak prac w tej kategorii.',
        embeds: [],
        components: [],
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('job_select_praca')
      .setPlaceholder('Wybierz pracę...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  },
};
