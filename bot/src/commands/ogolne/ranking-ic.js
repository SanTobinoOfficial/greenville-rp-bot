// Komenda /ranking-ic — ranking aktywności IC graczy RP
// Top 10 graczy z największą liczbą akcji IC (/me, /do, /krzyk) z ostatnich 30 dni.
// Źródło danych: tabela ProximityMessage (zapisywana automatycznie podczas sesji RP).
// Dostępna dla: Mieszkaniec+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MEDALS  = ['🥇', '🥈', '🥉'];
const TOP_N   = 10;
const DAYS    = 30;
const FETCH_N = TOP_N + 20; // zapas do wyznaczenia rangi wywołującego

function pluralAkcja(n) {
  if (n === 1)              return 'akcja';
  if (n >= 2 && n <= 4)    return 'akcje';
  return 'akcji';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ranking-ic')
    .setDescription(`Top ${TOP_N} najaktywniejszych graczy RP — akcje IC (/me, /do, /krzyk) z ostatnich ${DAYS} dni`),

  async execute(interaction, client, prisma) {
    await interaction.deferReply();

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby zobaczyć ranking aktywności IC.',
      });
    }

    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

    // ── Grupuj ProximityMessage po userId za ostatnie DAYS dni ────────────────
    let grouped;
    try {
      grouped = await prisma.proximityMessage.groupBy({
        by:      ['userId'],
        _count:  { id: true },
        where:   { createdAt: { gte: since } },
        orderBy: { _count: { id: 'desc' } },
        take:    FETCH_N,
      });
    } catch (err) {
      logger.error(`/ranking-ic: błąd groupBy: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd podczas obliczania rankingu. Spróbuj ponownie.' });
    }

    if (grouped.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle(`🎭 Ranking Aktywności IC — ostatnie ${DAYS} dni`)
            .setDescription('Brak zarejestrowanych akcji IC w podanym okresie.\n\n*Akcje IC są zapisywane automatycznie podczas korzystania z \`/me\`, \`/do\` i \`/krzyk\` na sesjach RP.*')
            .setFooter({ text: 'AURORA Greenville RP' })
            .setTimestamp(),
        ],
      });
    }

    // ── Pobierz dane użytkowników jednym zapytaniem ───────────────────────────
    const userDbIds = grouped.map(g => g.userId);
    let users;
    try {
      users = await prisma.user.findMany({
        where:  { id: { in: userDbIds } },
        select: { id: true, discordId: true },
      });
    } catch (err) {
      logger.error(`/ranking-ic: błąd pobierania userów: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania danych użytkowników.' });
    }
    const userMap = new Map(users.map(u => [u.id, u]));

    // ── DB-ID wywołującego (do wyznaczenia jego pozycji) ─────────────────────
    let callerDbId = null;
    try {
      const caller = await prisma.user.findUnique({
        where:  { discordId: interaction.user.id },
        select: { id: true },
      });
      callerDbId = caller?.id ?? null;
    } catch {
      // niekrytyczne — brak pozycji wywołującego to nie błąd
    }

    // ── Buduj linie rankingu ──────────────────────────────────────────────────
    const top       = grouped.slice(0, TOP_N);
    const rankLines = top.map((entry, i) => {
      const user    = userMap.get(entry.userId);
      const medal   = i < 3 ? MEDALS[i] : `**${i + 1}.**`;
      const mention = user ? `<@${user.discordId}>` : '*(nieznany gracz)*';
      const count   = entry._count.id;
      return `${medal} ${mention} — **${count}** ${pluralAkcja(count)}`;
    });

    // ── Pozycja wywołującego poza top N ──────────────────────────────────────
    let callerNote = '';
    if (callerDbId) {
      const callerPos = grouped.findIndex(g => g.userId === callerDbId);
      if (callerPos >= TOP_N) {
        const count = grouped[callerPos]._count.id;
        callerNote = `\n\n📍 Twoje miejsce: **#${callerPos + 1}** — **${count}** ${pluralAkcja(count)}`;
      } else if (callerPos === -1) {
        callerNote = `\n\n📍 Nie masz zarejestrowanych akcji IC z ostatnich ${DAYS} dni.`;
      }
    }

    const totalActions = grouped.reduce((sum, g) => sum + g._count.id, 0);

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(`🎭 Ranking Aktywności IC — ostatnie ${DAYS} dni`)
      .setDescription(
        `Gracze z największą liczbą akcji IC (\`/me\`, \`/do\`, \`/krzyk\`) ` +
        `zarejestrowanych podczas sesji RP.\n\n` +
        rankLines.join('\n') +
        callerNote
      )
      .addFields(
        {
          name:   '📊 Łącznie akcji IC w tym okresie',
          value:  `**${totalActions}** we wszystkich sesjach RP`,
          inline: true,
        },
        {
          name:   '🎯 Jak zwiększyć wynik?',
          value:  'Używaj \`/me\`, \`/do\` i \`/krzyk\` aktywnie podczas sesji RP.',
          inline: true,
        },
      )
      .setFooter({ text: `AURORA Greenville RP • Ranking oparty na akcjach IC z ostatnich ${DAYS} dni` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info(`/ranking-ic | ${interaction.user.tag} | top=${top.length} łącznie=${totalActions}`);
  },
};
