// Komenda /sesja-koniec — zakończenie sesji RP z podsumowaniem

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasRole } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesja-koniec')
    .setDescription('Zakończ sesję RP (Host+)'),

  async execute(interaction, client, prisma) {
    if (!hasRole(interaction.member, 'Host')) {
      return interaction.reply({ content: '❌ Brak uprawnień (wymagane: Host+).', ephemeral: true });
    }

    await interaction.deferReply();

    // Pobierz wewnętrzne ID hosta (hostId w Session to UUID, nie Discord ID)
    const hostDbUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    const session = hostDbUser
      ? await prisma.session.findFirst({
          where: { hostId: hostDbUser.id, status: 'ONGOING' },
        })
      : null;

    if (!session) {
      return interaction.editReply({ content: '❌ Nie masz aktywnej sesji.' });
    }

    const endTime = new Date();
    const duration = session.startedAt
      ? Math.floor((endTime.getTime() - session.startedAt.getTime()) / 60000)
      : 0;

    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'ENDED', endedAt: endTime, peacetime: 0 },
    });

    // Zresetuj peacetime
    const rpChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && c.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').includes('ogloszenia-sesji')
    );
    if (rpChannel) {
      await rpChannel.setTopic('✅ Normalny tryb — Brak Peacetime').catch(() => {});
    }

    const signupsCount = await prisma.sessionSignup.count({ where: { sessionId: session.id } });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🏁 Sesja RP — ZAKOŃCZONA')
          .addFields(
            { name: '⏱️ Czas trwania', value: `${duration} minut`, inline: true },
            { name: '👥 Uczestników', value: `${signupsCount}`, inline: true },
          )
          .setFooter({ text: `Host: ${interaction.user.tag}` })
          .setTimestamp()
      ],
    });
  },
};
