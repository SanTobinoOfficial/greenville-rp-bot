// Handler: job_quiz_start_[jobId] — inicjuje test rekrutacyjny dla pracy PUBLIC
// Sprawdza cooldown, tworzy sesję quizu, wyświetla pierwsze pytanie

const { EmbedBuilder } = require('discord.js');
const {
  startSession,
  getSession,
  buildNextQuestion,
  COOLDOWN_H,
} = require('../../utils/jobQuizEngine');
const path = require('path');
const fs   = require('fs');

function getJobs() {
  return JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../../../../../server-config.json'), 'utf-8'
  )).jobs ?? [];
}

module.exports = {
  async execute(interaction, client, prisma) {
    const jobId = interaction.customId.replace('job_quiz_start_', '');
    const job   = getJobs().find(j => j.id === jobId);

    if (!job) {
      return interaction.reply({ content: '❌ Nie znaleziono pracy.', ephemeral: true });
    }

    // Pobierz użytkownika
    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!user) {
      return interaction.reply({ content: '❌ Nie znaleziono Twojego konta.', ephemeral: true });
    }

    // Sprawdź cooldown testu
    if (user.jobQuizCooldown && new Date() < user.jobQuizCooldown) {
      const rem   = Math.ceil((user.jobQuizCooldown.getTime() - Date.now()) / 60000);
      const hours = Math.floor(rem / 60);
      const mins  = rem % 60;
      return interaction.update({
        content: `⏳ Oblałeś ostatni test. Następna próba za **${hours > 0 ? `${hours}h ` : ''}${mins}min**.\nWykorzystaj ten czas i zapoznaj się dokładnie z mini-regulaminem pracy.`,
        embeds: [],
        components: [],
      });
    }

    // Sprawdź cooldown zmiany pracy
    if (user.jobCooldownEnd && new Date() < user.jobCooldownEnd) {
      const rem   = Math.ceil((user.jobCooldownEnd.getTime() - Date.now()) / 60000);
      const hours = Math.floor(rem / 60);
      const mins  = rem % 60;
      return interaction.update({
        content: `⏳ Musisz poczekać jeszcze **${hours > 0 ? `${hours}h ` : ''}${mins}min** przed zmianą pracy.`,
        embeds: [],
        components: [],
      });
    }

    // Nadpisz istniejącą sesję (restart)
    const session = startSession(interaction.user.id, jobId, job.name);
    const next    = buildNextQuestion(session);

    // Dodaj intro do pierwszego pytania
    next.content = `📋 **Test rekrutacyjny: ${job.emoji} ${job.name}** — ${session.questions.length} pytań, min. 80% by zdać.`;

    await interaction.update(next);
  },
};
