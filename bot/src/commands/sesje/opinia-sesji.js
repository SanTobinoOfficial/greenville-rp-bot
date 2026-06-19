// Komenda /opinia-sesji — system oceniania zakończonych sesji RP
// Subkomenda 'ocen': zweryfikowany gracz wystawia ocenę 1–5 ⭐ + opcjonalny komentarz
// Subkomenda 'wyniki': Host / Staff widzi zbiorcze wyniki ocen dla sesji

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, hasRole, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// In-memory: sessionId → Map<discordUserId, { stars, comment, icName, createdAt }>
const sessionRatings = new Map();
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dni

function purgeOld() {
  const cutoff = Date.now() - TTL_MS;
  for (const [sid, ratings] of sessionRatings) {
    for (const [uid, r] of ratings) {
      if (r.createdAt < cutoff) ratings.delete(uid);
    }
    if (ratings.size === 0) sessionRatings.delete(sid);
  }
}

async function getIcName(prisma, discordId, member) {
  try {
    const u = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (u?.character) return `${u.character.firstName} ${u.character.lastName}`;
  } catch {}
  return member?.displayName ?? 'Nieznana postać';
}

function starsStr(n) {
  return '⭐'.repeat(n) + '☆'.repeat(5 - n);
}

function avgColor(avg) {
  if (avg >= 4) return COLORS.success;
  if (avg >= 3) return COLORS.warning;
  return COLORS.error;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('opinia-sesji')
    .setDescription('Oceń zakończoną sesję RP lub sprawdź zbiorcze wyniki ocen')
    .addSubcommand(sub =>
      sub
        .setName('ocen')
        .setDescription('Oceń ostatnią sesję RP, w której brałeś/aś udział (1–5 ⭐)')
        .addIntegerOption(opt =>
          opt
            .setName('gwiazdki')
            .setDescription('Ocena sesji: 1 = słaba, 3 = dobra, 5 = doskonała')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addStringOption(opt =>
          opt
            .setName('komentarz')
            .setDescription('Uwaga dla hosta — co poszło dobrze / co można poprawić? (maks. 300 znaków)')
            .setRequired(false)
            .setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('wyniki')
        .setDescription('Sprawdź zbiorcze oceny sesji — tylko Host i Staff')
        .addStringOption(opt =>
          opt
            .setName('sesja_id')
            .setDescription('Pierwsze 8 znaków ID sesji (domyślnie: ostatnia zakończona)')
            .setRequired(false)
            .setMaxLength(20)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({ content: '❌ Wymagana rola **Mieszkaniec**, aby korzystać z systemu ocen sesji.' });
    }

    purgeOld();
    const sub = interaction.options.getSubcommand();

    // ══ OCEN ══════════════════════════════════════════════════════════════════
    if (sub === 'ocen') {
      const gwiazdki  = interaction.options.getInteger('gwiazdki');
      const komentarz = interaction.options.getString('komentarz')?.trim() ?? null;

      // Pobierz konto gracza z bazy
      let dbUser;
      try {
        dbUser = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      } catch (err) {
        logger.error('/opinia-sesji ocen: błąd db user:', err.message);
        return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
      }

      if (!dbUser) {
        return interaction.editReply({ content: '❌ Twoje konto nie jest w systemie. Przejdź przez weryfikację.' });
      }

      // Znajdź ostatnią zakończoną sesję, na którą gracz był zapisany
      let signup;
      try {
        signup = await prisma.sessionSignup.findFirst({
          where: {
            userId: dbUser.id,
            session: { status: 'ENDED' },
          },
          include: { session: true },
          orderBy: { createdAt: 'desc' },
        });
      } catch (err) {
        logger.error('/opinia-sesji ocen: błąd db signup:', err.message);
        return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
      }

      if (!signup?.session) {
        return interaction.editReply({
          content:
            '❌ Nie znaleziono zakończonej sesji, na którą byłeś/aś zapisany/a.\n' +
            '*Oceny można wystawiać tylko za sesje, na które wcześniej się zapisałeś/aś.*',
        });
      }

      const session   = signup.session;
      const sessionId = session.id;

      // Sprawdź czy gracz już oceniał tę sesję
      if (sessionRatings.get(sessionId)?.has(interaction.user.id)) {
        return interaction.editReply({
          content: '❌ Już oceniłeś/aś tę sesję. Każdy gracz może wystawić jedną ocenę za sesję.',
        });
      }

      // Pobierz imię IC gracza
      const icName = await getIcName(prisma, interaction.user.id, interaction.member);

      // Zapisz ocenę
      if (!sessionRatings.has(sessionId)) sessionRatings.set(sessionId, new Map());
      sessionRatings.get(sessionId).set(interaction.user.id, {
        stars:     gwiazdki,
        comment:   komentarz,
        icName,
        createdAt: Date.now(),
      });

      const sessionTs = Math.floor(session.date.getTime() / 1000);

      const fields = [
        { name: '⭐ Ocena',  value: `${starsStr(gwiazdki)} **(${gwiazdki}/5)**`, inline: true },
        { name: '🎭 Postać', value: icName,                                       inline: true },
      ];
      if (komentarz) fields.push({ name: '💬 Komentarz', value: komentarz, inline: false });

      logger.info(
        `/opinia-sesji ocen | ${interaction.user.tag} (${icName}) | sesja ${sessionId.slice(0, 8)} | ${gwiazdki}⭐`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(gwiazdki >= 4 ? COLORS.success : gwiazdki >= 3 ? COLORS.warning : COLORS.error)
            .setTitle('✅ Dziękujemy za ocenę!')
            .setDescription(
              `Twoja ocena sesji z <t:${sessionTs}:D> została zarejestrowana.\n` +
              `*Host zobaczy ją w zbiorczych wynikach — widoczna wyłącznie dla niego i Staffu.*`
            )
            .addFields(fields)
            .setFooter({ text: `AURORA Greenville RP — Opinie Sesji | ID: ${sessionId.slice(0, 8)}` })
            .setTimestamp(),
        ],
      });
    }

    // ══ WYNIKI ════════════════════════════════════════════════════════════════
    if (sub === 'wyniki') {
      if (!hasRole(interaction.member, ROLES.HOST)) {
        return interaction.editReply({ content: '❌ Wyniki ocen mogą przeglądać tylko **Host** i Staff.' });
      }

      const sessionIdPrefix = interaction.options.getString('sesja_id')?.trim() ?? null;

      let session;
      try {
        if (sessionIdPrefix) {
          // Prisma nie obsługuje STARTS WITH — filtrujemy w JS po pobraniu kandydatów
          const candidates = await prisma.session.findMany({
            where:   { status: 'ENDED' },
            orderBy: { date: 'desc' },
            take:    50,
          });
          session = candidates.find(s => s.id.startsWith(sessionIdPrefix)) ?? null;
        } else {
          session = await prisma.session.findFirst({
            where:   { status: 'ENDED' },
            orderBy: { date: 'desc' },
          });
        }
      } catch (err) {
        logger.error('/opinia-sesji wyniki: błąd db session:', err.message);
        return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
      }

      if (!session) {
        return interaction.editReply({ content: '❌ Nie znaleziono zakończonej sesji.' });
      }

      const ratings    = sessionRatings.get(session.id);
      const sessionTs  = Math.floor(session.date.getTime() / 1000);

      // Brak ocen
      if (!ratings || ratings.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle(`📊 Opinie sesji — <t:${sessionTs}:D>`)
              .setDescription(
                'Brak ocen dla tej sesji.\n\n' +
                '*Gracze którzy byli zapisani mogą ocenić sesję przez `/opinia-sesji ocen`.*'
              )
              .setFooter({ text: `AURORA Greenville RP | Sesja: ${session.id.slice(0, 8)}` })
              .setTimestamp(),
          ],
        });
      }

      // Oblicz statystyki
      const list     = [...ratings.values()];
      const total    = list.length;
      const avgRaw   = list.reduce((s, r) => s + r.stars, 0) / total;
      const avgStr   = avgRaw.toFixed(2);

      // Rozkład gwiazdek od 5 do 1
      const dist = [0, 0, 0, 0, 0];
      for (const r of list) dist[r.stars - 1]++;
      const maxBar  = Math.max(...dist, 1);
      const distLines = [5, 4, 3, 2, 1]
        .map(s => {
          const count = dist[s - 1];
          const bar   = '█'.repeat(Math.round((count / maxBar) * 8)).padEnd(8, '░');
          return `${s}⭐ ${bar} ${count}`;
        })
        .join('\n');

      const embed = new EmbedBuilder()
        .setColor(avgColor(avgRaw))
        .setTitle(`📊 Opinie sesji — <t:${sessionTs}:D>`)
        .setDescription(`Zebrano **${total}** oc${total === 1 ? 'enę' : total < 5 ? 'eny' : 'en'} od uczestników.`)
        .addFields(
          { name: '⭐ Średnia ocena', value: `**${avgStr} / 5.00**  ${starsStr(Math.round(avgRaw))}`, inline: true },
          { name: '👥 Liczba ocen',  value: `**${total}**`,                                           inline: true },
          { name: '📊 Rozkład',      value: `\`\`\`\n${distLines}\n\`\`\``,                           inline: false },
        );

      // Komentarze (maks. 5 najnowszych)
      const withComments = list.filter(r => r.comment);
      if (withComments.length > 0) {
        const shown        = withComments.slice(0, 5);
        const commentValue = shown
          .map(r => `> ${starsStr(r.stars)} **${r.icName}**\n> *„${r.comment}"*`)
          .join('\n\n');
        embed.addFields({
          name:  `💬 Komentarze (${shown.length} z ${withComments.length})`,
          value: commentValue,
          inline: false,
        });
      }

      embed
        .setFooter({ text: `AURORA Greenville RP — Opinie Sesji | ID: ${session.id.slice(0, 8)} | Tylko dla Ciebie` })
        .setTimestamp();

      logger.info(
        `/opinia-sesji wyniki | ${interaction.user.tag} | sesja ${session.id.slice(0, 8)} | ${total} ocen, avg ${avgStr}`
      );

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
