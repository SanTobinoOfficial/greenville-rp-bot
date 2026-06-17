// Komenda /sesja-podsumowanie — statystyki aktywności IC dla trwającej lub ostatnio zakończonej sesji RP
// Pokazuje łączną liczbę akcji IC (/me, /do, /krzyk), top 5 najaktywniejszych graczy,
// liczbę zgłoszeń 911 oraz frekwencję w stosunku do maxPlayers.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

const PT_LABELS = {
  0: null,
  1: '⚠️ PEACETIME 1° — zakaz crime i ucieczek',
  2: '🚨 PEACETIME 2° — PT1° + void wypadków + limit 70 mph',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesja-podsumowanie')
    .setDescription('Statystyki aktywności IC dla bieżącej lub ostatniej zakończonej sesji RP'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą zobaczyć podsumowanie sesji.',
      });
    }

    // Szukaj sesji ONGOING, a jeśli brak — ostatniej ENDED
    let session;
    try {
      session = await prisma.session.findFirst({
        where:   { status: { in: ['ONGOING', 'ENDED'] } },
        orderBy: { startedAt: 'desc' },
        include: { signups: { select: { userId: true } } },
      });
    } catch (err) {
      logger.error(`/sesja-podsumowanie: błąd pobierania sesji: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    if (!session || !session.startedAt) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📊 Podsumowanie Sesji RP')
            .setDescription(
              'Nie znaleziono żadnej zakończonej ani trwającej sesji.\n\n' +
              '*Podsumowanie jest dostępne po uruchomieniu sesji przez hosta (\`/sesja-start\`).*'
            )
            .setFooter({ text: 'AURORA Greenville RP — Podsumowanie Sesji' })
            .setTimestamp(),
        ],
      });
    }

    const isOngoing  = session.status === 'ONGOING';
    const rangeStart = session.startedAt;
    const rangeEnd   = isOngoing ? new Date() : (session.endedAt ?? new Date());

    // Pobierz statystyki IC i zgłoszenia 911 równolegle
    let totalIcActions = 0;
    let icGrouped      = [];
    let totalCalls     = 0;

    try {
      [totalIcActions, icGrouped, totalCalls] = await Promise.all([
        prisma.proximityMessage.count({
          where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
        }),
        prisma.proximityMessage.groupBy({
          by:      ['userId'],
          _count:  { id: true },
          where:   { createdAt: { gte: rangeStart, lte: rangeEnd } },
          orderBy: { _count: { id: 'desc' } },
          take:    5,
        }),
        prisma.cadCall.count({
          where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
        }),
      ]);
    } catch (err) {
      logger.error(`/sesja-podsumowanie: błąd zapytań statystyk: ${err.message}`);
    }

    // Rozwiń Discord ID top graczy
    let topLines = '*Brak zarejestrowanych akcji IC.*';
    if (icGrouped.length > 0) {
      let dbUsers = [];
      try {
        dbUsers = await prisma.user.findMany({
          where:  { id: { in: icGrouped.map(g => g.userId) } },
          select: { id: true, discordId: true },
        });
      } catch { /* niekrytyczne */ }

      const userMap = new Map(dbUsers.map(u => [u.id, u.discordId]));
      topLines = icGrouped
        .map((g, i) => {
          const discordId = userMap.get(g.userId);
          const mention   = discordId ? `<@${discordId}>` : '*(nieznany)*';
          return `${MEDALS[i] ?? `**${i + 1}.**`} ${mention} — **${g._count.id}** akcji`;
        })
        .join('\n');
    }

    // Czas trwania
    const durationMs  = rangeEnd.getTime() - rangeStart.getTime();
    const durationH   = Math.floor(durationMs / 3_600_000);
    const durationM   = Math.floor((durationMs % 3_600_000) / 60_000);
    const durationStr = durationH > 0 ? `${durationH}h ${durationM}min` : `${durationM}min`;

    const startTs = Math.floor(rangeStart.getTime() / 1000);
    const endTs   = !isOngoing && session.endedAt
      ? Math.floor(session.endedAt.getTime() / 1000)
      : null;

    // Nick hosta
    let hostMention = `\`${session.hostId}\``;
    try {
      const hostMember = await interaction.guild.members.fetch(session.hostId);
      hostMention = `${hostMember}`;
    } catch { /* host mógł opuścić serwer */ }

    const signupCount  = session.signups.length;
    const sessionShort = session.id.slice(0, 8).toUpperCase();
    const statusLabel  = isOngoing ? '🟢 SESJA TRWA' : '🔴 SESJA ZAKOŃCZONA';
    const embedColor   = isOngoing ? COLORS.success : COLORS.rp;

    const sessionInfoLines = [
      `🎙️ Host: ${hostMention}`,
      `🕐 Start: <t:${startTs}:F>`,
      endTs ? `🏁 Koniec: <t:${endTs}:F>` : null,
      `⏱️ Czas trwania: **${durationStr}**`,
    ].filter(Boolean).join('\n');

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`📊 Podsumowanie Sesji RP — ${statusLabel}`)
      .addFields(
        {
          name:   '🎪 Informacje o sesji',
          value:  sessionInfoLines,
          inline: false,
        },
        {
          name:   '📈 Statystyki',
          value:  [
            `👥 Zapisanych: **${signupCount}** / ${session.maxPlayers}`,
            `🎭 Akcji IC (/me, /do, /krzyk): **${totalIcActions}**`,
            `🚨 Zgłoszeń 911: **${totalCalls}**`,
          ].join('\n'),
          inline: false,
        },
        {
          name:   '🏆 Top 5 Aktywnych IC',
          value:  topLines,
          inline: false,
        },
      );

    if (session.description) {
      embed.addFields({
        name:   '📋 Opis sesji',
        value:  session.description,
        inline: false,
      });
    }

    const ptLabel = PT_LABELS[session.peacetime ?? 0];
    if (ptLabel) {
      embed.addFields({
        name:   '🔰 Tryb peacetime',
        value:  ptLabel,
        inline: false,
      });
    }

    embed
      .setFooter({ text: `AURORA Greenville RP — Podsumowanie Sesji | ID: ${sessionShort}` })
      .setTimestamp();

    logger.info(
      `/sesja-podsumowanie | ${interaction.user.tag} | sesja: ${sessionShort} | ` +
      `status: ${session.status} | IC: ${totalIcActions} | 911: ${totalCalls} | ` +
      `zapisanych: ${signupCount}/${session.maxPlayers}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
