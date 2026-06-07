// Komenda /top-sesji — ranking uczestników sesji RP
// Top 10 graczy z największą liczbą ukończonych sesji

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MEDALS = ['🥇', '🥈', '🥉'];
const TOP_N  = 10;
const FETCH_N = TOP_N + 20; // zapas — potrzebny do ustalenia rangi wywołującego

function pluralSesja(n) {
  if (n === 1) return 'sesja';
  if (n >= 2 && n <= 4) return 'sesje';
  return 'sesji';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top-sesji')
    .setDescription('Ranking graczy z największą liczbą ukończonych sesji RP'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply();

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby zobaczyć ranking sesji.',
      });
    }

    // ── Pobierz ID zakończonych sesji ────────────────────────────────────────
    let endedIds;
    try {
      const ended = await prisma.session.findMany({
        where:  { status: 'ENDED' },
        select: { id: true },
      });
      endedIds = ended.map(s => s.id);
    } catch (err) {
      logger.error('top-sesji: błąd pobierania zakończonych sesji:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.' });
    }

    if (endedIds.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('🏆 Ranking Sesji RP')
            .setDescription('Nie odbyła się jeszcze żadna zakończona sesja — ranking jest pusty.')
            .setFooter({ text: 'AURORA Greenville RP' })
            .setTimestamp(),
        ],
      });
    }

    // ── Grupuj zapisy po userId, sortuj malejąco po liczbie ─────────────────
    let grouped;
    try {
      grouped = await prisma.sessionSignup.groupBy({
        by:      ['userId'],
        _count:  { id: true },
        where:   { sessionId: { in: endedIds } },
        orderBy: { _count: { id: 'desc' } },
        take:    FETCH_N,
      });
    } catch (err) {
      logger.error('top-sesji: błąd grupowania:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas obliczania rankingu.' });
    }

    if (grouped.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('🏆 Ranking Sesji RP')
            .setDescription('Nikt nie uczestniczył jeszcze w żadnej zakończonej sesji.')
            .setFooter({ text: 'AURORA Greenville RP' })
            .setTimestamp(),
        ],
      });
    }

    // ── Pobierz dane użytkowników jednym zapytaniem ──────────────────────────
    const userDbIds = grouped.map(g => g.userId);
    let users;
    try {
      users = await prisma.user.findMany({
        where:  { id: { in: userDbIds } },
        select: { id: true, discordId: true },
      });
    } catch (err) {
      logger.error('top-sesji: błąd pobierania użytkowników:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania danych użytkowników.' });
    }
    const userMap = new Map(users.map(u => [u.id, u]));

    // ── DB-ID wywołującego (do wyznaczenia jego rangi) ───────────────────────
    let callerDbId = null;
    try {
      const caller = await prisma.user.findUnique({
        where:  { discordId: interaction.user.id },
        select: { id: true },
      });
      callerDbId = caller?.id ?? null;
    } catch {
      // niekrytyczne
    }

    // ── Buduj linie rankingu (top N) ─────────────────────────────────────────
    const top = grouped.slice(0, TOP_N);
    const rankLines = top.map((entry, i) => {
      const user    = userMap.get(entry.userId);
      const medal   = i < 3 ? MEDALS[i] : `**${i + 1}.**`;
      const mention = user ? `<@${user.discordId}>` : '*(nieznany gracz)*';
      const count   = entry._count.id;
      return `${medal} ${mention} — **${count}** ${pluralSesja(count)}`;
    });

    // ── Pozycja wywołującego poza top N ──────────────────────────────────────
    let callerNote = '';
    if (callerDbId) {
      const callerPos = grouped.findIndex(g => g.userId === callerDbId);
      if (callerPos >= TOP_N) {
        const count = grouped[callerPos]._count.id;
        callerNote = `\n\n📍 Twoje miejsce: **#${callerPos + 1}** — **${count}** ${pluralSesja(count)}`;
      } else if (callerPos === -1) {
        callerNote = '\n\n📍 Nie uczestniczyłeś/aś jeszcze w żadnej zakończonej sesji.';
      }
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle('🏆 Ranking Uczestników Sesji RP')
      .setDescription(rankLines.join('\n') + callerNote)
      .addFields({
        name:   '📋 Zakończonych sesji łącznie',
        value:  `**${endedIds.length}**`,
        inline: true,
      })
      .setFooter({ text: 'AURORA Greenville RP • Ranking oparty na ukończonych sesjach' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info(`/top-sesji | ${interaction.user.tag} | top=${top.length} łącznie=${endedIds.length}`);
  },
};
