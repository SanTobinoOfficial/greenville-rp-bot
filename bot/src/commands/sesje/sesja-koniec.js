// Komenda /sesja-koniec — zakończenie sesji RP z podsumowaniem

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasRole } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

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
    const sessionStart = session.startedAt ?? endTime;
    const duration = Math.floor((endTime.getTime() - sessionStart.getTime()) / 60000);

    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'ENDED', endedAt: endTime, peacetime: 0 },
    });

    // Zresetuj peacetime
    const rpChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && norm(c.name).includes('ogloszenia-sesji')
    );
    if (rpChannel) {
      await rpChannel.setTopic('✅ Normalny tryb — Brak Peacetime').catch(() => {});
    }

    const timeRange = { gte: sessionStart, lte: endTime };

    const [signupsCount, mandatyCount, grzywnyCount, arrestsCount, onDutyLogs] = await Promise.all([
      prisma.sessionSignup.count({ where: { sessionId: session.id } }),
      prisma.fine.count({ where: { type: 'MANDAT',  createdAt: timeRange } }),
      prisma.fine.count({ where: { type: 'GRZYWNA', createdAt: timeRange } }),
      prisma.arrest.count({ where: { createdAt: timeRange } }),
      prisma.dutyLog.findMany({
        where:    { action: 'ON_DUTY', createdAt: timeRange },
        distinct: ['userId'],
        select:   { userId: true },
      }),
    ]);

    const officersCount = onDutyLogs.length;
    const hours = Math.floor(duration / 60);
    const mins  = duration % 60;
    const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

    // Odpowiedź dla hosta
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle('🏁 Sesja RP — ZAKOŃCZONA')
          .addFields(
            { name: '⏱️ Czas trwania', value: durationText,         inline: true },
            { name: '👥 Uczestników',   value: `${signupsCount}`,    inline: true },
          )
          .setFooter({ text: `Host: ${interaction.user.tag}` })
          .setTimestamp()
      ],
    });

    // Podsumowanie sesji → #wyniki-sesji
    const recapChannel = interaction.guild.channels.cache.find(
      c => c.isTextBased() && norm(c.name).includes('wyniki-sesji')
    );
    if (recapChannel) {
      const recapEmbed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📊 Podsumowanie Sesji RP')
        .setDescription('Sesja dobiegła końca. Poniżej znajdziesz statystyki z tego spotkania.')
        .addFields(
          { name: '⏱️ Czas trwania',    value: durationText,         inline: true },
          { name: '👥 Uczestników',      value: `${signupsCount}`,    inline: true },
          { name: '🚔 Funkcjonariuszy',  value: `${officersCount}`,   inline: true },
          { name: '📋 Mandatów',         value: `${mandatyCount}`,    inline: true },
          { name: '⚖️ Grzywien',         value: `${grzywnyCount}`,    inline: true },
          { name: '🔒 Zatrzymań',        value: `${arrestsCount}`,    inline: true },
        )
        .setFooter({ text: `Host: ${interaction.user.tag} • AURORA Greenville RP` })
        .setTimestamp();

      await recapChannel.send({ embeds: [recapEmbed] }).catch(err => {
        logger.error('sesja-koniec: błąd wysyłania podsumowania do #wyniki-sesji:', err.message);
      });
    }
  },
};
