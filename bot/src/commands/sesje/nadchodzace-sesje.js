// Komenda /nadchodzace-sesje — kalendarz nadchodzących sesji RP
// Pokazuje UPCOMING + ONGOING sesje posortowane rosnąco (najwcześniejsza pierwsza)
// Dla każdej sesji wyświetla stan zapisów i czy wywołujący gracz jest już zapisany
// Dostępna dla: Mieszkaniec+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MAX_SESSIONS = 8;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nadchodzace-sesje')
    .setDescription('Sprawdź nadchodzące i trwające sesje RP — stan zapisów i dostępne miejsca'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić nadchodzące sesje.',
      });
    }

    // Pobierz wewnętrzne ID wywołującego (null gdy niezarejestrowany)
    const dbUser = await prisma.user
      .findUnique({ where: { discordId: interaction.user.id }, select: { id: true } })
      .catch(() => null);

    // Buduj include — signup check tylko gdy mamy userId w DB
    const includeClause = { _count: { select: { signups: true } } };
    if (dbUser) {
      includeClause.signups = { where: { userId: dbUser.id }, select: { id: true } };
    }

    let sessions;
    try {
      sessions = await prisma.session.findMany({
        where: { status: { in: ['UPCOMING', 'ONGOING'] } },
        orderBy: { date: 'asc' },
        take: MAX_SESSIONS,
        include: includeClause,
      });
    } catch (err) {
      logger.error('/nadchodzace-sesje: błąd zapytania:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania sesji. Spróbuj ponownie.' });
    }

    if (sessions.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📅 Nadchodzące sesje RP')
            .setDescription(
              'Brak zaplanowanych sesji na chwilę obecną.\n' +
              'Hosci regularnie ogłaszają nowe sesje — zajrzyj tu wkrótce!'
            )
            .setFooter({ text: 'AURORA Greenville RP — Sesje' })
            .setTimestamp(),
        ],
      });
    }

    // Pobierz dane hostów jednym zapytaniem
    const hostDbIds = [...new Set(sessions.map(s => s.hostId))];
    const hostUsers = await prisma.user
      .findMany({
        where: { id: { in: hostDbIds } },
        select: { id: true, discordId: true, discordUsername: true },
      })
      .catch(() => []);
    const hostMap = new Map(hostUsers.map(u => [u.id, u]));

    // Buduj linie dla każdej sesji
    const sessionLines = sessions.map((s, i) => {
      const hostUser    = hostMap.get(s.hostId);
      const hostDisplay = hostUser ? `<@${hostUser.discordId}>` : '*(nieznany)*';

      const unixTs   = Math.floor(s.date.getTime() / 1000);
      const signedUp = s._count.signups;
      const isFull   = signedUp >= s.maxPlayers;
      const isOngoing = s.status === 'ONGOING';
      const isSignedUp = dbUser && s.signups?.length > 0;

      const statusTag   = isOngoing ? '🟢 **TRWA**' : '🕐 Nadchodząca';
      const spotsEmoji  = isFull ? '🔴' : '🟢';
      const myStatusTag = isSignedUp ? '  ✅ *Jesteś zapisany/a*' : '';

      const lines = [
        `**${i + 1}.** ${statusTag} — <t:${unixTs}:D> o <t:${unixTs}:t> (<t:${unixTs}:R>)`,
        `> 👤 ${hostDisplay}  •  ${spotsEmoji} **${signedUp}/${s.maxPlayers}** miejsc${myStatusTag}`,
      ];

      if (s.description) {
        const desc = s.description.length > 80 ? s.description.slice(0, 77) + '…' : s.description;
        lines.push(`> 📝 *${desc}*`);
      }

      if (!isOngoing && isFull) {
        lines.push(`> ⛔ Brak wolnych miejsc`);
      } else if (!isOngoing && !isSignedUp) {
        lines.push(`> ↗ Zapisz się w kanale \`#sesje-ogłoszenia\``);
      }

      return lines.join('\n');
    });

    const ongoingCount  = sessions.filter(s => s.status === 'ONGOING').length;
    const upcomingCount = sessions.filter(s => s.status === 'UPCOMING').length;
    const mySignups     = dbUser ? sessions.filter(s => s.signups?.length > 0).length : 0;

    const embed = new EmbedBuilder()
      .setColor(ongoingCount > 0 ? COLORS.success : COLORS.info)
      .setTitle('📅 Nadchodzące sesje RP')
      .setDescription(sessionLines.join('\n\n'))
      .addFields({
        name: '📊 Stan',
        value: [
          `🟢 Trwające: **${ongoingCount}**`,
          `🕐 Nadchodzące: **${upcomingCount}**`,
          mySignups > 0 ? `✅ Twoje zapisy: **${mySignups}**` : null,
        ].filter(Boolean).join('  •  '),
        inline: false,
      })
      .setFooter({
        text: `AURORA Greenville RP — Nadchodzące sesje`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/nadchodzace-sesje | ${interaction.user.tag} | ` +
      `ongoing=${ongoingCount} upcoming=${upcomingCount} mySignups=${mySignups}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
