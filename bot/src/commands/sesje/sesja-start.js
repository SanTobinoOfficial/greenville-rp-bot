// Komenda /sesja-start — oficjalny start sesji RP

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesja-start')
    .setDescription('Rozpocznij sesję RP (Host+)')
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('ID sesji (opcjonalne — ostatnia nierozpoczęta)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!hasRole(interaction.member, 'Host')) {
      return interaction.reply({ content: '❌ Brak uprawnień (wymagane: Host+).', ephemeral: true });
    }

    await interaction.deferReply();

    const sessionId = interaction.options.getString('id');

    const session = sessionId
      ? await prisma.session.findUnique({ where: { id: sessionId } })
      : await prisma.session.findFirst({
          where: { hostId: interaction.user.id, status: 'UPCOMING' },
          orderBy: { date: 'asc' },
        });

    if (!session) {
      return interaction.editReply({ content: '❌ Nie znaleziono sesji do rozpoczęcia.' });
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'ONGOING', startedAt: new Date() },
    });

    const signupsCount = await prisma.sessionSignup.count({ where: { sessionId: session.id } });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🎪 Sesja RP — START!')
          .setDescription(
            `Sesja oficjalnie się rozpoczęła!\n\n` +
            `👥 Zapisanych graczy: **${signupsCount}**\n` +
            `🕐 Godzina startu: <t:${Math.floor(Date.now() / 1000)}:T>`
          )
          .setFooter({ text: `Host: ${interaction.user.tag}` })
          .setTimestamp()
      ],
    });

    // Ping na kanale ogłoszeń
    const announceChannel = interaction.guild.channels.cache.find(
      c => c.name === '📢│sesje-ogłoszenia' && c.isTextBased()
    );
    if (announceChannel) {
      await announceChannel.send({
        content: '@everyone',
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🚦 Sesja RP — ROZPOCZĘTA!')
            .setDescription(`Zapraszamy do gry! **${signupsCount}** graczy dołączyło do sesji.`)
            .setTimestamp()
        ],
      });
    }
  },
};
