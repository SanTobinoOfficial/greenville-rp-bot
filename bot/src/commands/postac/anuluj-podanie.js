// Komenda /anuluj-podanie — gracz anuluje swoje oczekujące podanie o pracę służbową
// Dostępna dla: wszystkich zweryfikowanych graczy

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anuluj-podanie')
    .setDescription('Anuluj swoje oczekujące podanie o pracę służbową')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('ID podania do anulowania (zostaw puste, żeby zobaczyć swoje podania)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({ content: '❌ Musisz być zweryfikowanym mieszkańcem.' });
    }

    const user = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!user) return interaction.editReply({ content: '❌ Nie znaleziono Twojego konta.' });

    const appId = interaction.options.getString('id');

    // Jeśli nie podano ID — pokaż listę oczekujących podań
    if (!appId) {
      const pending = await prisma.jobApplication.findMany({
        where: { userId: user.id, status: 'PENDING' },
        orderBy: { appliedAt: 'desc' },
        take: 5,
      });

      if (pending.length === 0) {
        return interaction.editReply({ content: '✅ Nie masz żadnych oczekujących podań o pracę.' });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('📋 Twoje oczekujące podania')
        .setDescription('Użyj `/anuluj-podanie id:<ID>` aby anulować podanie.\n\n')
        .addFields(
          pending.map(p => ({
            name: `${p.jobName} — ID: \`${p.id.slice(0, 12)}\``,
            value: `📁 ${p.jobCategory} · Złożone: <t:${Math.floor(new Date(p.appliedAt).getTime() / 1000)}:R>`,
            inline: false,
          }))
        )
        .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // Znajdź podanie
    const app = await prisma.jobApplication.findFirst({
      where: { id: { startsWith: appId }, userId: user.id },
    });

    if (!app) {
      return interaction.editReply({ content: `❌ Nie znaleziono podania o ID zaczynającym się od \`${appId}\`.\n\nUżyj \`/anuluj-podanie\` bez ID, żeby zobaczyć swoje podania.` });
    }

    if (app.status !== 'PENDING') {
      return interaction.editReply({
        content: `❌ Podanie na **${app.jobName}** ma status **${app.status}** i nie może zostać anulowane.\n\nMożna anulować tylko podania oczekujące (PENDING).`,
      });
    }

    // Anuluj (oznacz jako REJECTED przez gracza)
    await prisma.jobApplication.update({
      where: { id: app.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: `PLAYER:${interaction.user.tag}`,
        reviewNote: 'Anulowane przez gracza.',
      },
    });

    // Reset cooldownu (gracz zrezygnował — dajemy mu szansę złożyć nowe podanie)
    await prisma.user.update({
      where: { id: user.id },
      data: { jobCooldownEnd: null },
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('✅ Podanie anulowane')
      .setDescription(`Podanie na stanowisko **${app.jobName}** zostało anulowane.\n\nTwój cooldown został zresetowany — możesz złożyć nowe podanie.`)
      .setFooter({ text: 'AURORA Greenville RP • System Pracy' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
