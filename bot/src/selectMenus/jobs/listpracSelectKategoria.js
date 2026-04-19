// Handler: listprac_select_kategoria — po wyborze kategorii w /lista-prac pokazuje listę prac (READ ONLY)
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const path = require('path');
const fs = require('fs');

function getJobs() {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.jobs ?? [];
}

const TYPE_LABELS = {
  SERVICE: '🏛️ Wymaga podania (Staff)',
  PUBLIC:  '✅ Natychmiastowa',
  CRIMINAL:'💀 Kryminalna (natychmiastowa)',
};

module.exports = {
  async execute(interaction, client, prisma) {
    const selectedKategoria = interaction.values[0].replace('listprac_', '');
    const jobs = getJobs().filter(j => j.kategoria === selectedKategoria);

    if (jobs.length === 0) {
      return interaction.update({ content: '❌ Brak prac w tej kategorii.', embeds: [], components: [] });
    }

    // Podziel prace na grupy (ograniczenie pola embeda = 1024 znaków)
    const lines = jobs.map(job => {
      const wynagrodzenie = job.wynagrodzenie_max === 0
        ? 'Brak'
        : `${job.wynagrodzenie_min}–${job.wynagrodzenie_max}$/h`;
      return `${job.emoji} **${job.name}** — ${wynagrodzenie} | ${TYPE_LABELS[job.typ] ?? job.typ}`;
    });

    // Podziel na chunki po max 15 (żeby embed nie był za długi)
    const chunks = [];
    for (let i = 0; i < lines.length; i += 15) {
      chunks.push(lines.slice(i, i + 15).join('\n'));
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`💼 ${selectedKategoria} — ${jobs.length} prac`)
      .setFooter({ text: 'AURORA Greenville RP • Użyj /wybierz-prace, żeby aplikować' })
      .setTimestamp();

    if (chunks.length === 1) {
      embed.setDescription(chunks[0]);
    } else {
      chunks.forEach((chunk, i) => {
        embed.addFields({ name: i === 0 ? 'Prace' : '​', value: chunk, inline: false });
      });
    }

    // Wymagania ogólne dla tej kategorii (pierwsza praca jako przykład)
    const sampleJob = jobs[0];
    if (sampleJob?.wymagania?.length > 0 && jobs.every(j => JSON.stringify(j.wymagania) === JSON.stringify(sampleJob.wymagania))) {
      embed.addFields({
        name: '✅ Wymagania (wszystkie w tej kategorii)',
        value: sampleJob.wymagania.map(w => `• ${w}`).join('\n'),
        inline: false,
      });
    }

    await interaction.update({ embeds: [embed], components: [] });
  },
};
