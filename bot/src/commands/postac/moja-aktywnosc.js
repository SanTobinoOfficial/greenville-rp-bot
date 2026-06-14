// Komenda /moja-aktywnosc — osobisty dashboard aktywności RP gracza
// Pokazuje akcje IC, sesje i logi służby z ostatnich 7 i 30 dni

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

function pluralAkcja(n) {
  if (n === 1) return 'akcja';
  if (n >= 2 && n <= 4) return 'akcje';
  return 'akcji';
}

function pluralSesja(n) {
  if (n === 1) return 'sesja';
  if (n >= 2 && n <= 4) return 'sesje';
  return 'sesji';
}

function pluralLog(n) {
  if (n === 1) return 'wpis';
  if (n >= 2 && n <= 4) return 'wpisy';
  return 'wpisów';
}

function activityBar(value, max, length = 10) {
  if (max === 0) return '░'.repeat(length);
  const filled = Math.round((value / max) * length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moja-aktywnosc')
    .setDescription('Twój osobisty dashboard aktywności RP — akcje IC, sesje i służba z ostatnich 30 dni'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić aktywność RP.',
      });
    }

    const discordId = interaction.user.id;

    let dbUser;
    try {
      dbUser = await prisma.user.findUnique({
        where: { discordId },
        select: { id: true, createdAt: true, currentJob: true },
      });
    } catch (err) {
      logger.error(`/moja-aktywnosc: błąd pobierania użytkownika: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania danych. Spróbuj ponownie.' });
    }

    if (!dbUser) {
      return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany/a w systemie. Przejdź weryfikację.' });
    }

    const now = Date.now();
    const since7d  = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // ── Równoległe zapytania do bazy ─────────────────────────────────────────
    let ic7d, ic30d, sessions30d, dutyLogs30d, serverRank;
    try {
      [ic7d, ic30d, sessions30d, dutyLogs30d, serverRank] = await Promise.all([
        // Akcje IC (ProximityMessage) — ostatnie 7 dni
        prisma.proximityMessage.count({
          where: { userId: dbUser.id, createdAt: { gte: since7d } },
        }),
        // Akcje IC — ostatnie 30 dni
        prisma.proximityMessage.count({
          where: { userId: dbUser.id, createdAt: { gte: since30d } },
        }),
        // Sesje — ostatnie 30 dni
        prisma.sessionSignup.count({
          where: { userId: dbUser.id, createdAt: { gte: since30d } },
        }),
        // Logi służby — ostatnie 30 dni (z informacją o serwisie)
        prisma.dutyLog.findMany({
          where: { userId: dbUser.id, createdAt: { gte: since30d } },
          select: { service: true, action: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        // Pozycja gracza w rankingu IC (ostatnie 30 dni) — groupBy po userId
        prisma.proximityMessage.groupBy({
          by: ['userId'],
          _count: { id: true },
          where: { createdAt: { gte: since30d } },
          orderBy: { _count: { id: 'desc' } },
        }),
      ]);
    } catch (err) {
      logger.error(`/moja-aktywnosc: błąd zapytań DB: ${err.message}`);
      return interaction.editReply({ content: '❌ Błąd podczas obliczania aktywności. Spróbuj ponownie.' });
    }

    // ── Pozycja w rankingu ────────────────────────────────────────────────────
    const rankPos = serverRank.findIndex(g => g.userId === dbUser.id);
    const rankText = rankPos === -1
      ? 'Brak pozycji (brak akcji IC)'
      : `**#${rankPos + 1}** z ${serverRank.length} aktywnych graczy`;

    // ── Statystyki służby ─────────────────────────────────────────────────────
    const dutyCount = dutyLogs30d.length;
    const serviceSet = new Set(dutyLogs30d.map(d => d.service));
    const servicesText = serviceSet.size > 0
      ? [...serviceSet].slice(0, 3).join(', ')
      : '—';

    // ── Pasek aktywności (max = max z 30d, dla proporcji 7d vs 30d) ──────────
    const bar7d  = activityBar(ic7d,  ic30d || 1);
    const bar30d = activityBar(ic30d, ic30d || 1);

    // ── Ocena aktywności (subiektywna etykieta) ───────────────────────────────
    let activityLabel;
    if (ic30d === 0)        activityLabel = '💤 Brak aktywności';
    else if (ic30d < 10)    activityLabel = '🌱 Początkująca';
    else if (ic30d < 40)    activityLabel = '📈 Rozwijająca się';
    else if (ic30d < 100)   activityLabel = '🔥 Aktywna';
    else                    activityLabel = '⭐ Bardzo aktywna';

    const embed = new EmbedBuilder()
      .setColor(ic30d > 0 ? COLORS.rp : COLORS.neutral)
      .setTitle(`📊 Moja aktywność RP — ${interaction.user.username}`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription(
        `Aktywność RP z ostatnich **7** i **30** dni.\n` +
        `Poziom aktywności: ${activityLabel}`
      )
      .addFields(
        {
          name: '🎭 Akcje IC (ostatnie 7 dni)',
          value: `\`${bar7d}\` **${ic7d}** ${pluralAkcja(ic7d)}`,
          inline: false,
        },
        {
          name: '🎭 Akcje IC (ostatnie 30 dni)',
          value: `\`${bar30d}\` **${ic30d}** ${pluralAkcja(ic30d)}`,
          inline: false,
        },
        {
          name: '📅 Sesje RP (ostatnie 30 dni)',
          value: `**${sessions30d}** ${pluralSesja(sessions30d)}`,
          inline: true,
        },
        {
          name: '🚔 Służba (ostatnie 30 dni)',
          value: dutyCount > 0
            ? `**${dutyCount}** ${pluralLog(dutyCount)}\n*${servicesText}*`
            : 'Brak logów służby',
          inline: true,
        },
        {
          name: '🏆 Pozycja w rankingu IC',
          value: rankText,
          inline: false,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — /ranking-ic pokazuje pełny ranking serwera' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    logger.info(`/moja-aktywnosc | ${interaction.user.tag} | ic7d=${ic7d} ic30d=${ic30d} sesje=${sessions30d}`);
  },
};
