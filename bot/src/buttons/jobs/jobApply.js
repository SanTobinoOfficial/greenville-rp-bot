// Handler: job_apply / job_apply_[jobId] / job_cancel / job_quiz_start_[jobId]
// job_apply (bare)         → otwiera menu wyboru kategorii (jak /wybierz-prace)
// job_quiz_start_[jobId]   → deleguje do jobQuizStart
// job_apply_[jobId]        → otwiera modal (SERVICE) lub deleguje do quizu (PUBLIC)
// job_cancel               → anuluj
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const path = require('path');
const fs   = require('fs');
const { isVerified } = require('../../utils/permissions');
const jobQuizStart = require('./jobQuizStart');

function getConfig() {
  const configPath = path.resolve(__dirname, '../../../../server-config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}
function getJobs() { return getConfig().jobs ?? []; }

function groupByKategoria(jobs) {
  return jobs.reduce((acc, j) => {
    if (!acc[j.kategoria]) acc[j.kategoria] = [];
    acc[j.kategoria].push(j);
    return acc;
  }, {});
}

const CATEGORY_EMOJI = {
  'Policja': '🚔', 'Dyspozytornia': '📡', 'Straż': '🚒', 'EMS': '🚑', 'DOT': '🚧',
  'Gastronomia': '🍔', 'Kawiarnia': '☕', 'Handel': '🛒', 'Handel/IT': '💻',
  'Motoryzacja': '🚗', 'Finanse': '💰', 'Przestępczość': '💀',
  'Edukacja': '📚', 'Usługi': '🔐', 'Inne': '😴',
};

module.exports = {
  async execute(interaction, client, prisma) {
    // ── Bare job_apply — otwiera menu kategorii (jak /wybierz-prace) ──────────
    if (interaction.customId === 'job_apply') {
      if (!isVerified(interaction.member)) {
        return interaction.reply({
          content: '❌ Musisz być zweryfikowanym Mieszkańcem, żeby wybrać pracę.',
          ephemeral: true,
        });
      }

      const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      if (!user) {
        return interaction.reply({ content: '❌ Nie znaleziono Twojego konta.', ephemeral: true });
      }

      // Sprawdź cooldown zmiany pracy
      if (user.jobCooldownEnd && new Date() < user.jobCooldownEnd) {
        const rem   = Math.ceil((user.jobCooldownEnd.getTime() - Date.now()) / 60000);
        const hours = Math.floor(rem / 60);
        const mins  = rem % 60;
        return interaction.reply({
          content: `⏳ Musisz poczekać jeszcze **${hours > 0 ? `${hours}h ` : ''}${mins}min** przed zmianą pracy.`,
          ephemeral: true,
        });
      }

      // Sprawdź cooldown quizu
      if (user.jobQuizCooldown && new Date() < user.jobQuizCooldown) {
        const rem   = Math.ceil((user.jobQuizCooldown.getTime() - Date.now()) / 60000);
        const hours = Math.floor(rem / 60);
        const mins  = rem % 60;
        return interaction.reply({
          content: `⏳ Oblałeś ostatni test. Następna próba za **${hours > 0 ? `${hours}h ` : ''}${mins}min**.`,
          ephemeral: true,
        });
      }

      const jobs   = getJobs();
      const groups = groupByKategoria(jobs);
      const kategorie = Object.keys(groups);

      const embed = new EmbedBuilder()
        .setColor(0x22C55E)
        .setTitle('💼 Wybór Pracy — AURORA Greenville RP')
        .setDescription(
          (user.currentJob
            ? `**Twoja obecna praca:** ${user.currentJob}\n\n`
            : '') +
          'Wybierz kategorię pracy, a następnie konkretne stanowisko.\n' +
          '> Zapoznasz się z mini-regulaminem i wypełnisz **test wiedzy** (min. 80%).\n' +
          '> Po nieudanym teście obowiązuje cooldown **24 godzin**.'
        )
        .addFields({
          name: '📊 Dostępne kategorie',
          value: kategorie.map(k => `• ${CATEGORY_EMOJI[k] ?? '💼'} ${k} (${groups[k].length})`).join('\n'),
          inline: false,
        })
        .setFooter({ text: 'AURORA Greenville RP • System Zatrudnienia' })
        .setTimestamp();

      const options = kategorie.slice(0, 25).map(k =>
        new StringSelectMenuOptionBuilder()
          .setLabel(k)
          .setValue(`kategoria_${k}`)
          .setDescription(`${groups[k].length} prac w tej kategorii`)
          .setEmoji(CATEGORY_EMOJI[k] ?? '💼')
      );

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('job_select_kategoria')
          .setPlaceholder('Wybierz kategorię pracy...')
          .addOptions(options)
      );

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // ── Obsługa przycisku "Wróć / Anuluj" ────────────────────────────────────
    if (interaction.customId === 'job_cancel') {
      return interaction.update({
        content: '↩️ Anulowano wybór pracy. Kliknij przycisk w kanale lub użyj `/wybierz-prace`.',
        embeds: [],
        components: [],
      });
    }

    // ── Deleguj: job_quiz_start_[jobId] → jobQuizStart ───────────────────────
    if (interaction.customId.startsWith('job_quiz_start_')) {
      return jobQuizStart.execute(interaction, client, prisma);
    }

    const jobId = interaction.customId.replace('job_apply_', '');
    const job = getJobs().find(j => j.id === jobId);

    if (!job) {
      return interaction.reply({ content: '❌ Nie znaleziono pracy.', ephemeral: true });
    }

    const formularz = job.formularz ?? [];

    // Jeśli brak formularza — zapisz od razu (dla Unemployed, Student itp.)
    if (formularz.length === 0) {
      const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      if (!user) return interaction.reply({ content: '❌ Nie znaleziono konta.', ephemeral: true });

      const cooldownEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentJob: job.name,
          jobCategory: job.kategoria,
          jobAssignedAt: new Date(),
          jobCooldownEnd: cooldownEnd,
        },
      });

      return interaction.update({
        content: `✅ **Praca ustawiona:** ${job.emoji} ${job.name}`,
        embeds: [],
        components: [],
      });
    }

    // Otwórz modal z pytaniami (max 5 pól w Discord modal)
    const modal = new ModalBuilder()
      .setCustomId(`job_modal_${jobId}`)
      .setTitle(`Podanie: ${job.name}`.slice(0, 45));

    const fields = formularz.slice(0, 5).map(field =>
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(field.id)
          .setLabel(field.pytanie.slice(0, 45))
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(field.min ?? 10)
          .setMaxLength(1000)
          .setRequired(true)
          .setPlaceholder(`Minimum ${field.min ?? 10} znaków...`)
      )
    );

    modal.addComponents(...fields);

    await interaction.showModal(modal);
  },
};
