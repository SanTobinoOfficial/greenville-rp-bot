// Handler: job_select_praca — po wyborze pracy pokazuje embed z regulaminem + przycisk
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
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

const TYPE_LABELS = {
  SERVICE: '🏛️ Służbowa — wymaga rozpatrzenia przez Staff',
  PUBLIC: '✅ Cywilna — natychmiastowa',
  CRIMINAL: '💀 Kryminalna — natychmiastowa',
};

module.exports = {
  async execute(interaction, client, prisma) {
    const jobId = interaction.values[0].replace('job_', '');
    const job = getJobs().find(j => j.id === jobId);

    if (!job) {
      return interaction.update({ content: '❌ Nie znaleziono pracy.', embeds: [], components: [] });
    }

    const wynagrodzenie = job.wynagrodzenie_max === 0
      ? 'Brak wynagrodzenia'
      : `${job.wynagrodzenie_min}$ – ${job.wynagrodzenie_max}$/h`;

    const regulaminLines = typeof job.mini_regulamin === 'string'
      ? job.mini_regulamin.split('\n').filter(Boolean)
      : Array.isArray(job.mini_regulamin)
        ? job.mini_regulamin
        : [];

    const embed = new EmbedBuilder()
      .setColor(
        job.typ === 'SERVICE' ? 0x1d4ed8
        : job.typ === 'CRIMINAL' ? 0xef4444
        : 0x22c55e
      )
      .setTitle(`${job.emoji} ${job.name}`)
      .setDescription(job.opis)
      .addFields(
        { name: '📁 Kategoria', value: job.kategoria, inline: true },
        { name: '💰 Wynagrodzenie', value: wynagrodzenie, inline: true },
        { name: '📋 Typ podania', value: TYPE_LABELS[job.typ] ?? job.typ, inline: false },
      );

    if (job.wymagania && job.wymagania.length > 0) {
      embed.addFields({
        name: '✅ Wymagania',
        value: job.wymagania.map(w => `• ${w}`).join('\n'),
        inline: false,
      });
    }

    if (regulaminLines.length > 0) {
      embed.addFields({
        name: '📜 Mini-regulamin tej pracy',
        value: regulaminLines.map(l => `> ${l}`).join('\n').slice(0, 1024),
        inline: false,
      });
    }

    embed
      .addFields({
        name: '⚠️ Ważne',
        value: 'Po wybraniu pracy obowiązuje **2-godzinny cooldown** przed kolejną zmianą.\nKliknij przycisk poniżej, aby zaakceptować regulamin i złożyć podanie.',
        inline: false,
      })
      .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
      .setTimestamp();

    const applyBtn = new ButtonBuilder()
      .setCustomId(`job_apply_${jobId}`)
      .setLabel('✅ Akceptuję regulamin i aplikuję')
      .setStyle(ButtonStyle.Success);

    const cancelBtn = new ButtonBuilder()
      .setCustomId('job_cancel')
      .setLabel('↩️ Wróć')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(applyBtn, cancelBtn);

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  },
};
