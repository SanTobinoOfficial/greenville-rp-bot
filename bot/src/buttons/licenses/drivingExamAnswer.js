// Handler przycisków egzaminu teoretycznego na prawo jazdy
// customId format: driveexam_LITERA_INDEX_KATEGORIA

const { handleDrivingExamAnswer } = require('../../utils/drivingExamEngine');

module.exports = {
  async execute(interaction, client, prisma) {
    await handleDrivingExamAnswer(interaction, client, prisma);
  },
};
