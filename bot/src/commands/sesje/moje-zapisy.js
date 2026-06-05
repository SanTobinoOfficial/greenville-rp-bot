// Komenda /moje-zapisy — historia zapisów gracza na sesje RP
// Pokazuje sesje, na które gracz się zapisał, z podsumowaniem frekwencji
// Dostępna dla: Mieszkaniec+ (własne zapisy) | Staff+ (zapisy innego gracza)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

function formatStatus(status) {
  switch (status) {
    case 'UPCOMING':  return '🕐 Nadchodząca';
    case 'ONGOING':   return '🟢 Trwa';
    case 'ENDED':     return '✅ Zakończona';
    case 'CANCELLED': return '❌ Anulowana';
    default:          return status;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moje-zapisy')
    .setDescription('Historia Twoich zapisów na sesje RP — frekwencja i statystyki')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz do sprawdzenia (tylko Staff+)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Liczba sesji do wyświetlenia (domyślnie: 8, maks: 15)')
        .setMinValue(1)
        .setMaxValue(15)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić historię zapisów.',
      });
    }

    const targetDiscordUser = interaction.options.getUser('gracz');
    const isCheckingOther = !!targetDiscordUser;

    if (isCheckingOther && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko Staff może sprawdzać zapisy innych graczy.',
      });
    }

    const lookupDiscordId = isCheckingOther
      ? targetDiscordUser.id
      : interaction.user.id;
    const lookupUser = isCheckingOther ? targetDiscordUser : interaction.user;
    const limit = interaction.options.getInteger('limit') ?? 8;

    // Pobierz użytkownika z bazy
    const userDb = await prisma.user.findUnique({
      where: { discordId: lookupDiscordId },
      select: { id: true },
    });

    if (!userDb) {
      const who = isCheckingOther ? `Gracz ${lookupUser.tag}` : 'Nie jesteś';
      return interaction.editReply({
        content: `❌ ${who} ${isCheckingOther ? 'nie jest' : ''} zarejestrowany/a w systemie.`,
      });
    }

    // Pobierz wszystkie zapisy (do statystyk) + ostatnie N (do listy)
    const [allSignups, recentSignups] = await Promise.all([
      prisma.sessionSignup.findMany({
        where: { userId: userDb.id },
        include: { session: { select: { status: true } } },
      }),
      prisma.sessionSignup.findMany({
        where: { userId: userDb.id },
        orderBy: { session: { date: 'desc' } },
        take: limit,
        include: {
          session: {
            select: {
              id: true,
              date: true,
              status: true,
              maxPlayers: true,
              hostId: true,
              _count: { select: { signups: true } },
            },
          },
        },
      }),
    ]);

    if (allSignups.length === 0) {
      return interaction.editReply({
        content: isCheckingOther
          ? `ℹ️ Gracz ${lookupUser.tag} nie zapisał/a się jeszcze na żadną sesję.`
          : 'ℹ️ Nie zapisałeś/aś się jeszcze na żadną sesję RP.',
      });
    }

    // Statystyki ze wszystkich zapisów
    const totalSignups  = allSignups.length;
    const completed     = allSignups.filter(s => s.session.status === 'ENDED').length;
    const cancelled     = allSignups.filter(s => s.session.status === 'CANCELLED').length;
    const upcoming      = allSignups.filter(s => s.session.status === 'UPCOMING').length;
    const ongoing       = allSignups.filter(s => s.session.status === 'ONGOING').length;
    const decidedCount  = totalSignups - cancelled;
    const attendancePct = decidedCount > 0
      ? Math.round((completed / decidedCount) * 100)
      : 0;

    // Pobierz dane hostów jednym zapytaniem
    const hostDbIds = [...new Set(recentSignups.map(s => s.session.hostId))];
    let hostUsers = [];
    try {
      hostUsers = await prisma.user.findMany({
        where:  { id: { in: hostDbIds } },
        select: { id: true, discordId: true },
      });
    } catch {
      // Toleruj błąd — hosty wyświetlimy jako "nieznany"
    }
    const hostMap = new Map(hostUsers.map(u => [u.id, u]));

    // Buduj listę sesji
    const sessionLines = recentSignups.map((signup, i) => {
      const s         = signup.session;
      const unixTs    = Math.floor(new Date(s.date).getTime() / 1000);
      const signupTs  = Math.floor(new Date(signup.createdAt).getTime() / 1000);
      const hostUser  = hostMap.get(s.hostId);
      const hostMention = hostUser ? `<@${hostUser.discordId}>` : '*nieznany host*';

      return [
        `**${i + 1}.** ${formatStatus(s.status)} — <t:${unixTs}:D> o <t:${unixTs}:t>`,
        `> 👤 Host: ${hostMention}  •  👥 Zapisanych: **${s._count.signups}/${s.maxPlayers}**`,
        `> 📝 Twój zapis: <t:${signupTs}:R>`,
      ].join('\n');
    }).join('\n\n');

    // Pasek frekwencji
    const barFilled = Math.round(attendancePct / 10);
    const bar = '█'.repeat(barFilled) + '░'.repeat(10 - barFilled);

    const staffTag = isCheckingOther ? ' *(widok Staff)*' : '';
    const embed = new EmbedBuilder()
      .setColor(attendancePct >= 75 ? COLORS.success : attendancePct >= 40 ? COLORS.info : COLORS.warning)
      .setTitle(`📋 Moje Zapisy na Sesje — ${lookupUser.displayName}${staffTag}`)
      .setThumbnail(lookupUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '📊 Statystyki (wszystkie zapisy)',
          value: [
            `📋 Łącznie zapisów: **${totalSignups}**`,
            `✅ Ukończonych sesji: **${completed}**`,
            `❌ Odwołanych sesji: **${cancelled}**`,
            `🕐 Nadchodzących: **${upcoming + ongoing}**`,
            `🎯 Frekwencja: \`${bar}\` **${attendancePct}%**`,
          ].join('\n'),
          inline: false,
        },
        {
          name: `📅 Ostatnie ${recentSignups.length} sesji`,
          value: sessionLines,
          inline: false,
        },
      )
      .setFooter({
        text: `AURORA Greenville RP — historia ${recentSignups.length} z ${totalSignups} zapisów`,
        iconURL: lookupUser.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/moje-zapisy | ${interaction.user.tag} | cel: ${lookupUser.tag} | zapisy: ${totalSignups} | frekwencja: ${attendancePct}%`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
