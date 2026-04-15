// Handler: job_apply_[jobId] — otwiera modal z formularzem pracy
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const path = require('path');
const fs = require('fs');

function getJobs() {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.jobs ?? [];
}

module.exports = {
  async execute(interaction, client, prisma) {
    // Obsługa przycisku "Wróć / Anuluj"
    if (interaction.customId === 'job_cancel') {
      return interaction.update({
        content: '↩️ Anulowano wybór pracy. Użyj `/wybierz-prace` ponownie.',
        embeds: [],
        components: [],
      });
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
