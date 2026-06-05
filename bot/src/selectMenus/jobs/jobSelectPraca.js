// Handler: job_select_praca — po wyborze pracy pokazuje embed z regulaminem + przycisk
// PUBLIC jobs → przycisk "Zacznij test" (quiz 10 pytań, 80%, cooldown 24h)
// SERVICE jobs → przycisk "Aplikuj" (modal + rozpatrzenie przez Staff)
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
  const configPath = path.resolve(__dirname, '../../../../server-config.json');
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

    // Economy removed

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
        { name: '📋 Typ podania', value: TYPE_LABELS[job.typ] ?? job.typ, inline: true },
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

    // Opis procesu zależny od typu pracy
    if (job.typ === 'PUBLIC' || job.typ === 'CRIMINAL') {
      embed.addFields({
        name: '📋 Jak zdobyć tę pracę?',
        value: [
          '> 1️⃣ Przeczytaj mini-regulamin powyżej',
          '> 2️⃣ Kliknij **"Zacznij test"** poniżej',
          '> 3️⃣ Odpowiedz na **10 pytań** — wymagane min. **8/10 (80%)**',
          '> 4️⃣ Przy zdaniu: rola pracownika przydzielona automatycznie!',
          '> ⏳ Oblany test = cooldown **24 godziny**',
        ].join('\n'),
        inline: false,
      });
    } else {
      embed.addFields({
        name: '⚠️ Ważne',
        value: 'Podanie trafi do Staffu i zostanie rozpatrzone w ciągu 48–72 godzin.\nKliknij przycisk poniżej, aby złożyć podanie.',
        inline: false,
      });
    }

    embed
      .setFooter({ text: 'AURORA Greenville RP • System Zatrudnienia' })
      .setTimestamp();

    // Przycisk zależny od typu pracy
    const applyBtn = (job.typ === 'PUBLIC' || job.typ === 'CRIMINAL')
      ? new ButtonBuilder()
          .setCustomId(`job_quiz_start_${jobId}`)
          .setLabel('📋 Zacznij test rekrutacyjny')
          .setStyle(ButtonStyle.Success)
      : new ButtonBuilder()
          .setCustomId(`job_apply_${jobId}`)
          .setLabel('📝 Złóż podanie')
          .setStyle(ButtonStyle.Primary);

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
