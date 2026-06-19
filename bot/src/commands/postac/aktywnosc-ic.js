// Komenda /aktywnosc-ic — prywatna historia aktywności IC gracza
// Pokazuje podział /me /do /krzyk z ostatnich 30 dni, wynik w bieżącej/ostatniej sesji,
// pozycję w /ranking-ic oraz tygodniowy trend zaangażowania RP.
// Dostępna dla: Mieszkaniec+ (swoje statystyki); Staff może sprawdzić dowolnego gracza.

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const DAYS      = 30;
const RANK_POOL = 150;

const PT_LABELS = {
  1: '⚠️ PT1°',
  2: '🚨 PT2°',
};

function pluralAkcja(n) {
  if (n === 1)           return 'akcja';
  if (n >= 2 && n <= 4) return 'akcje';
  return 'akcji';
}

function trendArrow(current, previous) {
  if (previous === 0 && current === 0) return '`=` brak aktywności';
  if (previous === 0)                  return `\`▲ +${current}\` (poprzedni tyg.: 0)`;
  const diff  = current - previous;
  const pct   = Math.abs(Math.round((diff / previous) * 100));
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '=';
  const sign  = diff > 0 ? '+' : '';
  return `\`${arrow} ${sign}${diff}\` (${arrow === '=' ? '0' : pct}% vs poprzedni tyg.)`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aktywnosc-ic')
    .setDescription(`Twoja aktywność IC — breakdown /me /do /krzyk z ostatnich ${DAYS} dni`)
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Sprawdź statystyki innego gracza (tylko Staff)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetOption = interaction.options.getUser('gracz');
    const checkingOther = !!targetOption;

    if (checkingOther && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko Staff może sprawdzać aktywność IC innych graczy.',
      });
    }

    if (!checkingOther && !isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby zobaczyć aktywność IC.',
      });
    }

    const discordId  = checkingOther ? targetOption.id : interaction.user.id;
    const lookupUser = checkingOther ? targetOption    : interaction.user;

    let user;
    try {
      user = await prisma.user.findUnique({
        where:  { discordId },
        select: { id: true },
      });
    } catch (err) {
      logger.error(`/aktywnosc-ic: błąd pobierania gracza: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    if (!user) {
      return interaction.editReply({
        content: checkingOther
          ? '❌ Ten gracz nie jest zarejestrowany w systemie.'
          : '❌ Nie jesteś zarejestrowany/a w systemie. Najpierw przejdź weryfikację.',
      });
    }

    const now           = new Date();
    const since30d      = new Date(now.getTime() - DAYS * 86_400_000);
    const thisWeekSince = new Date(now.getTime() -  7 * 86_400_000);
    const lastWeekSince = new Date(now.getTime() - 14 * 86_400_000);

    let total30d, meCount, doCount, krzykCount, thisWeek, lastWeek, rankPool, session;
    try {
      [total30d, meCount, doCount, krzykCount, thisWeek, lastWeek, rankPool, session] =
        await Promise.all([
          prisma.proximityMessage.count({
            where: { userId: user.id, createdAt: { gte: since30d } },
          }),
          prisma.proximityMessage.count({
            where: { userId: user.id, createdAt: { gte: since30d }, content: { startsWith: '[ME]' } },
          }),
          prisma.proximityMessage.count({
            where: { userId: user.id, createdAt: { gte: since30d }, content: { startsWith: '[DO]' } },
          }),
          prisma.proximityMessage.count({
            where: { userId: user.id, createdAt: { gte: since30d }, content: { startsWith: '[KRZYK]' } },
          }),
          prisma.proximityMessage.count({
            where: { userId: user.id, createdAt: { gte: thisWeekSince } },
          }),
          prisma.proximityMessage.count({
            where: { userId: user.id, createdAt: { gte: lastWeekSince, lt: thisWeekSince } },
          }),
          prisma.proximityMessage.groupBy({
            by:      ['userId'],
            _count:  { id: true },
            where:   { createdAt: { gte: since30d } },
            orderBy: { _count: { id: 'desc' } },
            take:    RANK_POOL,
          }),
          prisma.session.findFirst({
            where:   { status: { in: ['ONGOING', 'ENDED'] } },
            orderBy: { startedAt: 'desc' },
          }),
        ]);
    } catch (err) {
      logger.error(`/aktywnosc-ic: błąd zapytań statystyk: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.' });
    }

    // Pozycja w rankingu
    const rankIdx     = rankPool.findIndex(g => g.userId === user.id);
    const rankDisplay = rankIdx === -1
      ? `Poza top ${RANK_POOL}`
      : `#${rankIdx + 1} z ${rankPool.length}${rankPool.length >= RANK_POOL ? '+' : ''} graczy`;

    // Aktywność w sesji
    let sessionCount = 0;
    let sessionLabel = '*(brak aktywnych/zakończonych sesji)*';
    if (session?.startedAt) {
      const sessionEnd = session.status === 'ONGOING' ? now : (session.endedAt ?? now);
      try {
        sessionCount = await prisma.proximityMessage.count({
          where: { userId: user.id, createdAt: { gte: session.startedAt, lte: sessionEnd } },
        });
      } catch { /* niekrytyczne */ }
      const statusStr = session.status === 'ONGOING' ? '🟢 trwająca' : '🔴 ostatnia';
      const ptStr     = PT_LABELS[session.peacetime] ? ` ${PT_LABELS[session.peacetime]}` : '';
      const startTs   = Math.floor(session.startedAt.getTime() / 1000);
      sessionLabel    = `${statusStr}${ptStr} | start: <t:${startTs}:R>`;
    }

    // Mini pasek procentowy (10 bloków)
    function buildBar(count, total) {
      if (total === 0) return '░'.repeat(10);
      const filled = Math.round((count / total) * 10);
      return '█'.repeat(filled) + '░'.repeat(10 - filled);
    }

    function pct(n) {
      if (total30d === 0) return '0%';
      return `${Math.round((n / total30d) * 100)}%`;
    }

    const embed = new EmbedBuilder()
      .setColor(total30d > 0 ? COLORS.rp : COLORS.neutral)
      .setTitle(`🎭 Aktywność IC — ${lookupUser.displayName ?? lookupUser.username}`)
      .setThumbnail(lookupUser.displayAvatarURL({ size: 64 }))
      .addFields(
        {
          name:   `📊 Łącznie z ostatnich ${DAYS} dni`,
          value:  total30d > 0
            ? `**${total30d}** ${pluralAkcja(total30d)} IC`
            : '*Brak zarejestrowanych akcji IC w tym okresie.*\n*Używaj `/me`, `/do` i `/krzyk` podczas sesji RP.*',
          inline: false,
        },
      );

    if (total30d > 0) {
      embed.addFields(
        {
          name:   '🎬 Podział typów akcji',
          value:  [
            `\`/me   \` \`${buildBar(meCount,    total30d)}\` **${meCount   }** (${pct(meCount   )})`,
            `\`/do   \` \`${buildBar(doCount,    total30d)}\` **${doCount   }** (${pct(doCount   )})`,
            `\`/krzyk\` \`${buildBar(krzykCount, total30d)}\` **${krzykCount}** (${pct(krzykCount)})`,
          ].join('\n'),
          inline: false,
        },
        {
          name:   '📈 Tygodniowy trend',
          value:  trendArrow(thisWeek, lastWeek),
          inline: true,
        },
        {
          name:   '🏅 Pozycja w rankingu',
          value:  rankDisplay,
          inline: true,
        },
      );
    }

    embed.addFields(
      {
        name:   '🎪 Sesja RP',
        value:  `${sessionLabel}\n> Twoje akcje IC: **${sessionCount}** ${pluralAkcja(sessionCount)}`,
        inline: false,
      },
    );

    if (total30d === 0) {
      embed.addFields({
        name:   '💡 Jak zdobywać aktywność IC?',
        value:  '> Używaj `/me`, `/do` i `/krzyk` podczas sesji RP — każda akcja jest automatycznie rejestrowana.',
        inline: false,
      });
    }

    embed
      .setFooter({ text: `AURORA Greenville RP — Aktywność IC | Ostatnie ${DAYS} dni` })
      .setTimestamp();

    logger.info(
      `/aktywnosc-ic | ${interaction.user.tag}` +
      (checkingOther ? ` → ${lookupUser.tag}` : '') +
      ` | total30d=${total30d} me=${meCount} do=${doCount} krzyk=${krzykCount}` +
      ` | rank=${rankDisplay} | sesja=${sessionCount}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
