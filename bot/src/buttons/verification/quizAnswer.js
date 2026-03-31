// Obsługuje przyciski A/B/C/D odpowiedzi na pytania quizu
// customId format: quiz_A_0, quiz_B_2 itd.

const { handleQuizAnswer } = require('../../utils/quizEngine');

module.exports = {
  async execute(interaction, client, prisma) {
    await handleQuizAnswer(interaction, client, prisma);
  },
};
