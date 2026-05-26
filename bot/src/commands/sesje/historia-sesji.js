// Komenda /historia-sesji — archiwum sesji RP
// Wyświetla ostatnie sesje z datą, hostem, statusem, czasem trwania i liczbą uczestników
// Dostępna dla: Mieszkaniec+ (podstawowy widok) | Staff+ (pełne szczegóły z opisem)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Pomocnicza: czas trwania sesji (startedAt → endedAt) ─────────────────────
function formatDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return '—';
  const totalMin = Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000);
  if (totalMin < 1) return '< 1 min';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// ── Pomocnicza: czytelna etykieta statusu sesji ───────────────────────────────
function formatStatus(status) {
  switch (status) {
    case 'UPCOMING':  return '🕐 Nadchodząca';
    case 'ONGOING':   return '🟢 Trwa';
    case 'ENDED':     return '✅ Zakończona';
    case 'CANCELLED': return '❌ Anulowana';
    default:          return status;
  }
}

// ── Pomocnicza: kolor embeda zależny od przeważającego statusu wyników ────────
function resolveEmbedColor(sessions) {
  if (sessions.every(s => s.status === 'ENDED'))     return COLORS.success;
  if (sessions.some(s => s.status === 'ONGOING'))    return 0x57F287; // zielony
  if (sessions.some(s => s.status === 'UPCOMING'))   return COLORS.info;
  if (sessions.every(s => s.status === 'CANCELLED')) return COLORS.error;
  return COLORS.neutral;
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('historia-sesji')
    .setDescription('Przeglądaj historię sesji RP — daty, hosci, czas trwania, frekwencja')
    .addIntegerOption(opt =>
      opt
        .setName('limit')
        .setDescription('Liczba sesji do wyświetlenia (domyślnie: 5, maks: 10)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt
        .setName('status')
        .setDescription('Filtruj po statusie sesji (domyślnie: wszystkie)')
        .setRequired(false)
        .addChoices(
          { name: '📋 Wszystkie',   value: 'ALL'       },
          { name: '✅ Zakończone',  value: 'ENDED'     },
          { name: '🟢 Trwające',    value: 'ONGOING'   },
          { name: '🕐 Nadchodzące', value: 'UPCOMING'  },
          { name: '❌ Anulowane',   value: 'CANCELLED' },
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    // ── Sprawdź uprawnienia — wymagany Mieszkaniec+ ───────────────────────────
    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić historię sesji.',
      });
    }

    const limit       = interaction.options.getInteger('limit')  ?? 5;
    const statusFilter = interaction.options.getString('status') ?? 'ALL';
    const staffView   = isStaff(interaction.member); // Staff widzi więcej szczegółów

    // ── Zbuduj filtr Prisma ───────────────────────────────────────────────────
    const whereClause = statusFilter === 'ALL' ? {} : { status: statusFilter };

    // ── Pobierz sesje z bazy ──────────────────────────────────────────────────
    let sessions;
    try {
      sessions = await prisma.session.findMany({
        where:   whereClause,
        orderBy: { date: 'desc' },
        take:    limit,
        include: {
          _count: { select: { signups: true } }, // tylko liczba — nie ładujemy całych rekordów
        },
      });
    } catch (err) {
      logger.error('historia-sesji: błąd zapytania do bazy:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania historii sesji. Spróbuj ponownie.' });
    }

    // ── Brak wyników ─────────────────────────────────────────────────────────
    if (sessions.length === 0) {
      const filterLabel = statusFilter === 'ALL' ? '' : ` o statusie **${formatStatus(statusFilter)}**`;
      return interaction.editReply({
        content: `ℹ️ Brak sesji${filterLabel} w archiwum.`,
      });
    }

    // ── Pobierz dane hostów jednym zapytaniem (zamiast N × findUnique) ────────
    const hostDbIds = [...new Set(sessions.map(s => s.hostId))];
    let hostUsers;
    try {
      hostUsers = await prisma.user.findMany({
        where:  { id: { in: hostDbIds } },
        select: { id: true, discordId: true, discordUsername: true },
      });
    } catch {
      hostUsers = [];
    }
    const hostMap = new Map(hostUsers.map(u => [u.id, u]));

    // ── Buduj tekst listy sesji ───────────────────────────────────────────────
    const sessionLines = sessions.map((s, i) => {
      const hostUser    = hostMap.get(s.hostId);
      const hostDisplay = hostUser
        ? `<@${hostUser.discordId}>`
        : `*(nieznany host)*`;

      const unixTs   = Math.floor(s.date.getTime() / 1000);
      const duration = s.status === 'ENDED'
        ? formatDuration(s.startedAt, s.endedAt)
        : '—';

      const signedUp = s._count.signups;

      // Linie rekordu
      const lines = [
        `**${i + 1}.** ${formatStatus(s.status)} — <t:${unixTs}:D> o <t:${unixTs}:t>`,
        `> 👤 Host: ${hostDisplay}  •  👥 Zapisani: **${signedUp}/${s.maxPlayers}**  •  ⏱️ Czas: **${duration}**`,
      ];

      // Opis sesji — tylko Staff widzi pełny opis (może zawierać poufne info)
      if (staffView && s.description) {
        const desc = s.description.length > 90
          ? s.description.slice(0, 87) + '…'
          : s.description;
        lines.push(`> 📝 *${desc}*`);
      }

      // ID sesji dla Staffu (pomocne przy debugowaniu / ręcznych korektach)
      if (staffView) {
        lines.push(`> \`ID: ${s.id.slice(0, 8)}\``);
      }

      return lines.join('\n');
    }).join('\n\n');

    // ── Liczniki podsumowania (tylko Staff) ───────────────────────────────────
    let summaryField = null;
    if (staffView) {
      const total     = sessions.length;
      const ended     = sessions.filter(s => s.status === 'ENDED').length;
      const upcoming  = sessions.filter(s => s.status === 'UPCOMING').length;
      const cancelled = sessions.filter(s => s.status === 'CANCELLED').length;
      const ongoing   = sessions.filter(s => s.status === 'ONGOING').length;
      const totalSignups = sessions.reduce((acc, s) => acc + s._count.signups, 0);
      const avgSignups   = total > 0 ? Math.round(totalSignups / total) : 0;

      summaryField = {
        name: '📊 Podsumowanie wyświetlonych',
        value: [
          `✅ Zakończone: **${ended}** | ❌ Anulowane: **${cancelled}**`,
          `🟢 Trwające: **${ongoing}** | 🕐 Nadchodzące: **${upcoming}**`,
          `👥 Śr. uczestników/sesja: **${avgSignups}**`,
        ].join('\n'),
        inline: false,
      };
    }

    // ── Zbuduj embed ─────────────────────────────────────────────────────────
    const filterLabel = statusFilter === 'ALL'
      ? ''
      : ` — ${formatStatus(statusFilter)}`;
    const staffTag = staffView ? ' *(widok Staff)*' : '';

    const embed = new EmbedBuilder()
      .setColor(resolveEmbedColor(sessions))
      .setTitle(`📋 Historia Sesji RP${filterLabel}${staffTag}`)
      .setDescription(sessionLines)
      .setFooter({
        text: `Wyświetlono ${sessions.length} sesji • AURORA Greenville RP`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    if (summaryField) {
      embed.addFields(summaryField);
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    logger.info(
      `historia-sesji | ${interaction.user.tag} | limit=${limit} status=${statusFilter} | wyniki=${sessions.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
