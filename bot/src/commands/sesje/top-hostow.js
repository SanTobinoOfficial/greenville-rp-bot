// Komenda /top-hostow — ranking najaktywniejszych hostów sesji RP
// Top 10 hostów z największą liczbą przeprowadzonych zakończonych sesji,
// ze średnią frekwencją i łączną liczbą uczestników.
// Dostępna dla: wszyscy zweryfikowani gracze

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MEDALS = ['🥇', '🥈', '🥉'];
const TOP_N  = 10;

function pluralSesja(n) {
  if (n === 1) return 'sesja';
  if (n >= 2 && n <= 4) return 'sesje';
  return 'sesji';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-hostow')
    .setDescription('Ranking najaktywniejszych hostów sesji RP — liczba sesji i średnia frekwencja'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply();

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby zobaczyć ranking hostów.',
      });
    }

    // Pobierz zakończone sesje z liczebnością zapisów i pojemnością
    let sessions;
    try {
      sessions = await prisma.session.findMany({
        where:  { status: 'ENDED' },
        select: {
          hostId:     true,
          maxPlayers: true,
          _count:     { select: { signups: true } },
        },
      });
    } catch (err) {
      logger.error('/top-hostow: błąd pobierania sesji:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.' });
    }

    if (sessions.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('🎙️ Ranking Hostów Sesji RP')
            .setDescription('Nie odbyła się jeszcze żadna zakończona sesja — ranking jest pusty.')
            .setFooter({ text: 'AURORA Greenville RP' })
            .setTimestamp(),
        ],
      });
    }

    // Agreguj statystyki per host (hostId = Discord ID)
    const hostStats = new Map(); // discordId → { count, totalSignups, totalCapacity }
    for (const s of sessions) {
      const prev = hostStats.get(s.hostId) ?? { count: 0, totalSignups: 0, totalCapacity: 0 };
      hostStats.set(s.hostId, {
        count:         prev.count + 1,
        totalSignups:  prev.totalSignups  + s._count.signups,
        totalCapacity: prev.totalCapacity + s.maxPlayers,
      });
    }

    // Sortuj malejąco po liczbie sesji, weź top N
    const sorted = [...hostStats.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, TOP_N);

    // Buduj linie rankingu, pobierając nick hosta z Discorda
    const rankLines = [];
    for (let i = 0; i < sorted.length; i++) {
      const [hostDiscordId, stats] = sorted[i];
      const medal   = i < 3 ? MEDALS[i] : `**${i + 1}.**`;
      const avgFill = stats.totalCapacity > 0
        ? Math.round((stats.totalSignups / stats.totalCapacity) * 100)
        : 0;

      let mention = `\`${hostDiscordId}\``;
      try {
        const member = await interaction.guild.members.fetch(hostDiscordId);
        mention = `${member}`;
      } catch {
        // Host opuścił serwer — ID jako fallback
      }

      const n = stats.count;
      rankLines.push(
        `${medal} ${mention} — **${n}** ${pluralSesja(n)}` +
        ` · śr. frekwencja: **${avgFill}%**` +
        ` · graczy łącznie: **${stats.totalSignups}**`
      );
    }

    // Pozycja wywołującego poza top N
    const allSorted = [...hostStats.entries()]
      .sort((a, b) => b[1].count - a[1].count);
    const callerPos = allSorted.findIndex(([id]) => id === interaction.user.id);

    let callerNote = '';
    if (callerPos === -1) {
      callerNote = '\n\n📍 Nie prowadziłeś/aś jeszcze żadnej zakończonej sesji.';
    } else if (callerPos >= TOP_N) {
      const [, stats] = allSorted[callerPos];
      const avgFill = stats.totalCapacity > 0
        ? Math.round((stats.totalSignups / stats.totalCapacity) * 100)
        : 0;
      callerNote =
        `\n\n📍 Twoje miejsce: **#${callerPos + 1}**` +
        ` — **${stats.count}** ${pluralSesja(stats.count)}` +
        ` · śr. frekwencja: **${avgFill}%**`;
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🎙️ Ranking Hostów Sesji RP')
      .setDescription(rankLines.join('\n') + callerNote)
      .addFields(
        {
          name:   '📊 Zakończonych sesji łącznie',
          value:  `**${sessions.length}**`,
          inline: true,
        },
        {
          name:   '🎙️ Unikalnych hostów',
          value:  `**${hostStats.size}**`,
          inline: true,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP • Ranking oparty na zakończonych sesjach' })
      .setTimestamp();

    logger.info(
      `/top-hostow | ${interaction.user.tag} | hostów: ${sorted.length} z ${hostStats.size} | sesji: ${sessions.length}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
