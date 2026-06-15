// Komenda /ranking-obecnosci — ranking graczy według liczby ukończonych sesji RP
// Pokazuje kto najczęściej uczestniczy w sesjach (top 10 według zapisów w ENDED sesjach).
// Każdy zweryfikowany gracz widzi ranking + własną pozycję jeśli nie jest w top.
// Dostępna dla: Mieszkaniec+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const PERIOD_LABELS = {
  30:  'ostatnich 30 dni',
  90:  'ostatnich 90 dni',
  0:   'całego czasu',
};

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking-obecnosci')
    .setDescription('Ranking graczy według liczby ukończonych sesji RP')
    .addIntegerOption(opt =>
      opt
        .setName('okres')
        .setDescription('Zakres czasowy (domyślnie: cały czas)')
        .setRequired(false)
        .addChoices(
          { name: '📅 Ostatnie 30 dni',  value: 30 },
          { name: '📅 Ostatnie 90 dni',  value: 90 },
          { name: '📅 Cały czas',        value: 0  },
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Liczba pozycji w rankingu (domyślnie: 10, maks: 15)')
        .setMinValue(3)
        .setMaxValue(15)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby zobaczyć ranking obecności.',
        ephemeral: true,
      });
    }

    const periodDays = interaction.options.getInteger('okres') ?? 0;
    const limit      = interaction.options.getInteger('limit') ?? 10;
    const periodLabel = PERIOD_LABELS[periodDays] ?? 'całego czasu';

    // Filtr daty (undefined = brak filtru)
    const dateFilter = periodDays > 0
      ? { gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000) }
      : undefined;

    try {
      // Łączna liczba zakończonych sesji w danym okresie (mianownik wskaźnika)
      const totalEndedSessions = await prisma.session.count({
        where: {
          status: 'ENDED',
          ...(dateFilter ? { date: dateFilter } : {}),
        },
      });

      // Wszystkie zapisy na zakończone sesje w danym okresie, pogrupowane po userId
      const signupGroups = await prisma.sessionSignup.groupBy({
        by: ['userId'],
        _count: { id: true },
        where: {
          session: {
            status: 'ENDED',
            ...(dateFilter ? { date: dateFilter } : {}),
          },
        },
        orderBy: { _count: { id: 'desc' } },
        take: limit + 5, // pobierz trochę więcej, by wyznaczyć pozycję wywołującego
      });

      if (signupGroups.length === 0 || totalEndedSessions === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('🏆 Ranking obecności — brak danych')
              .setDescription(
                `Brak zakończonych sesji w zakresie: **${periodLabel}**.\n` +
                'Ranking pojawi się gdy pierwsze sesje zostaną ukończone.'
              )
              .setFooter({ text: 'AURORA Greenville RP — Ranking obecności' })
              .setTimestamp(),
          ],
        });
      }

      // Pobierz dane użytkowników (Discord ID + postać) jednym zapytaniem
      const dbUserIds = signupGroups.map(g => g.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: dbUserIds } },
        select: {
          id: true,
          discordId: true,
          character: {
            select: { firstName: true, lastName: true },
          },
        },
      });
      const userMap = new Map(users.map(u => [u.id, u]));

      // Zidentyfikuj pozycję wywołującego
      const callerDbUser = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        select: { id: true },
      });
      const callerDbId = callerDbUser?.id ?? null;

      // Zbuduj wiersze rankingu (top limit)
      const topEntries = signupGroups.slice(0, limit);
      const lines = topEntries.map((entry, i) => {
        const u           = userMap.get(entry.userId);
        const charName    = u?.character
          ? `**${u.character.firstName} ${u.character.lastName}**`
          : '*(brak postaci)*';
        const mention     = u ? `<@${u.discordId}>` : `\`${entry.userId.slice(0, 8)}…\``;
        const count       = entry._count.id;
        const pct         = Math.round((count / totalEndedSessions) * 100);
        const medal       = MEDALS[i] ?? `\`${String(i + 1).padStart(2, ' ')}.\``;

        return `${medal} ${charName} — ${mention}\n> 📅 Sesji: **${count}** / ${totalEndedSessions} (**${pct}%**)`;
      });

      // Pozycja wywołującego poza top (jeśli nie widnieje w top)
      let callerFooterLine = '';
      if (callerDbId) {
        const callerPos = signupGroups.findIndex(g => g.userId === callerDbId);
        const callerInTop = callerPos >= 0 && callerPos < limit;

        if (!callerInTop && callerPos >= 0) {
          const callerEntry = signupGroups[callerPos];
          const count       = callerEntry._count.id;
          const pct         = Math.round((count / totalEndedSessions) * 100);
          callerFooterLine  = `\n👤 Twoja pozycja: **#${callerPos + 1}** — ${count} sesji (**${pct}%**)`;
        } else if (callerPos === -1) {
          callerFooterLine = '\n👤 Twoja pozycja: nie masz żadnych zapisów w tym okresie.';
        }
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle('🏆 Ranking obecności na sesjach RP')
        .setDescription(
          `Gracze z największą liczbą ukończonych sesji RP (**${periodLabel}**).\n` +
          `Łączna liczba zakończonych sesji: **${totalEndedSessions}**` +
          callerFooterLine
        )
        .addFields({
          name:  `📋 Top ${topEntries.length} graczy`,
          value: lines.join('\n\n'),
          inline: false,
        })
        .setFooter({ text: `AURORA Greenville RP — Ranking obecności • Tylko zakończone sesje są wliczane` })
        .setTimestamp();

      logger.info(
        `/ranking-obecnosci | ${interaction.user.tag} | okres=${periodDays}d | sesji=${totalEndedSessions} | top=${topEntries.length}`
      );

      return interaction.editReply({ embeds: [embed] });

    } catch (err) {
      logger.error(`/ranking-obecnosci: błąd DB: ${err.message}`);
      return interaction.editReply({
        content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie za chwilę.',
        ephemeral: true,
      });
    }
  },
};
