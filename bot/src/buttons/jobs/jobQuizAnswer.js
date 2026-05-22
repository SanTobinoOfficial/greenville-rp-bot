// Handler: jobquiz_LITERA_INDEX_JOBID — odpowiedź na pytanie testu rekrutacyjnego
// Prefix: jobquiz → zarejestrowany w BUTTON_PREFIX_HANDLERS

const { EmbedBuilder } = require('discord.js');
const {
  getSession,
  clearSession,
  answerQuestion,
  isFinished,
  hasPassed,
  buildNextQuestion,
  buildResultEmbed,
  COOLDOWN_H,
} = require('../../utils/jobQuizEngine');
const path = require('path');
const fs   = require('fs');

function getJobs() {
  const configPath = path.resolve(__dirname, '../../../../../server-config.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')).jobs ?? [];
}

module.exports = {
  async execute(interaction, client, prisma) {
    // customId: jobquiz_A_3_burger_knight
    const parts      = interaction.customId.split('_');
    const answerLabel = parts[1];                     // A/B/C/D
    const questionIdx = parseInt(parts[2], 10);
    const jobId       = parts.slice(3).join('_');     // jobId może mieć podkreślniki

    const session = getSession(interaction.user.id);

    // Sesja wygasła lub nie istnieje
    if (!session || session.jobId !== jobId || session.current !== questionIdx) {
      return interaction.update({
        content: '⚠️ Sesja testu wygasła lub jest nieaktualna. Zacznij od nowa klikając przycisk w kanale.',
        embeds: [],
        components: [],
      });
    }

    // Zarejestruj odpowiedź
    const { isCorrect } = answerQuestion(session, answerLabel);

    // ── Koniec testu ─────────────────────────────────────────────────────────
    if (isFinished(session)) {
      const passed = hasPassed(session);
      clearSession(interaction.user.id);

      const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      if (!user) {
        return interaction.update({ content: '❌ Nie znaleziono konta.', embeds: [], components: [] });
      }

      const now = new Date();

      if (passed) {
        // ── ZDAŁ — przydziel pracę + 2h cooldown zmiany pracy ──────────────
        const job = getJobs().find(j => j.id === jobId);
        if (!job) {
          return interaction.update({ content: '❌ Nie znaleziono pracy.', embeds: [], components: [] });
        }

        const jobCooldownEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2h cooldown zmiany

        await prisma.user.update({
          where: { id: user.id },
          data: {
            currentJob:      job.name,
            jobCategory:     job.kategoria,
            jobAssignedAt:   now,
            jobCooldownEnd:  jobCooldownEnd,
            jobQuizCooldown: null,
          },
        });

        await prisma.jobApplication.create({
          data: {
            userId:      user.id,
            jobName:     job.name,
            jobCategory: job.kategoria,
            jobType:     'PUBLIC',
            answers:     { quizScore: session.correct },
            status:      'ACCEPTED',
            appliedAt:   now,
            cooldownEnd: jobCooldownEnd,
            reviewedAt:  now,
            reviewedBy:  'QUIZ_AUTO',
          },
        }).catch(() => {}); // opcjonalne — ignoruj jeśli tabela nie istnieje

        // Nadaj rolę Discord
        try {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          const roleToAdd = interaction.guild.roles.cache.find(r => r.name === job.rola_discord);
          if (roleToAdd) await member.roles.add(roleToAdd);
        } catch { /* ignoruj — rola opcjonalna */ }

        return interaction.update({
          embeds: [buildResultEmbed(session)],
          components: [],
        });

      } else {
        // ── OBLAŁ — cooldown 24h na nową próbę ────────────────────────────
        const quizCooldown = new Date(now.getTime() + COOLDOWN_H * 60 * 60 * 1000);

        await prisma.user.update({
          where: { id: user.id },
          data: { jobQuizCooldown: quizCooldown },
        }).catch(() => {}); // ignoruj jeśli pole nie istnieje w schemacie

        return interaction.update({
          embeds: [buildResultEmbed(session)],
          components: [],
        });
      }
    }

    // ── Następne pytanie ─────────────────────────────────────────────────────
    const next = buildNextQuestion(session);
    next.content = '';

    return interaction.update(next);
  },
};
