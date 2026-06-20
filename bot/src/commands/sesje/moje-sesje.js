// Komenda /moje-sesje — historia zapisów gracza na sesje RP
// Pokazuje wszystkie sesje, na które gracz się zapisał, wraz ze statusem każdej
// Dostępna dla: Mieszkaniec+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MAX_DISPLAY = 12;

const SESSION_STATUS_MAP = {
  UPCOMING:  { emoji: '🕐', label: 'Nadchodząca' },
  ONGOING:   { emoji: '🟢', label: 'Trwa'        },
  ENDED:     { emoji: '✅', label: 'Zakończona'  },
  CANCELLED: { emoji: '❌', label: 'Odwołana'    },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moje-sesje')
    .setDescription('Sprawdź historię swoich zapisów na sesje RP'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić historię sesji.',
      });
    }

    const dbUser = await prisma.user
      .findUnique({ where: { discordId: interaction.user.id }, select: { id: true } })
      .catch(() => null);

    if (!dbUser) {
      return interaction.editReply({
        content: '❌ Nie znaleziono Twojego konta w bazie danych. Upewnij się, że jesteś zweryfikowany/a.',
      });
    }

    let signups;
    try {
      signups = await prisma.sessionSignup.findMany({
        where: { userId: dbUser.id },
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              date: true,
              status: true,
              maxPlayers: true,
              description: true,
              hostId: true,
              _count: { select: { signups: true } },
            },
          },
        },
      });
    } catch (err) {
      logger.error('/moje-sesje: błąd zapytania:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania sesji. Spróbuj ponownie.' });
    }

    if (signups.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📅 Moje sesje RP')
            .setDescription(
              'Nie byłeś/aś jeszcze zapisany/a na żadną sesję RP.\n' +
              'Sprawdź nadchodzące sesje komendą `/nadchodzace-sesje` i dołącz!'
            )
            .setFooter({ text: 'AURORA Greenville RP — Moje sesje' })
            .setTimestamp(),
        ],
      });
    }

    const total     = signups.length;
    const ended     = signups.filter(s => s.session.status === 'ENDED').length;
    const cancelled = signups.filter(s => s.session.status === 'CANCELLED').length;
    const upcoming  = signups.filter(s => s.session.status === 'UPCOMING').length;
    const ongoing   = signups.filter(s => s.session.status === 'ONGOING').length;

    const displayed = signups.slice(0, MAX_DISPLAY);

    const hostIds = [...new Set(displayed.map(s => s.session.hostId))];
    const hostUsers = await prisma.user
      .findMany({
        where: { id: { in: hostIds } },
        select: { id: true, discordId: true },
      })
      .catch(() => []);
    const hostMap = new Map(hostUsers.map(u => [u.id, u]));

    const lines = displayed.map((signup, i) => {
      const sess    = signup.session;
      const st      = SESSION_STATUS_MAP[sess.status] ?? { emoji: '❓', label: sess.status };
      const ts      = Math.floor(sess.date.getTime() / 1000);
      const hostUser = hostMap.get(sess.hostId);
      const hostTag  = hostUser ? `<@${hostUser.discordId}>` : '*(nieznany)*';
      const signupTs = Math.floor(signup.createdAt.getTime() / 1000);

      return [
        `**${i + 1}.** ${st.emoji} ${st.label} — <t:${ts}:D> o <t:${ts}:t>`,
        `> 👤 Host: ${hostTag}  •  Zapisano: <t:${signupTs}:R>`,
      ].join('\n');
    });

    const truncNote = total > MAX_DISPLAY
      ? `\n\n*…i ${total - MAX_DISPLAY} wcześniejszych (wyświetlono ostatnie ${MAX_DISPLAY})*`
      : '';

    const summaryParts = [
      `📋 Łącznie: **${total}**`,
      `✅ Ukończonych: **${ended}**`,
      upcoming  > 0 ? `🕐 Nadchodzących: **${upcoming}**` : null,
      ongoing   > 0 ? `🟢 Trwających: **${ongoing}**`     : null,
      cancelled > 0 ? `❌ Odwołanych: **${cancelled}**`   : null,
    ].filter(Boolean).join('  •  ');

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle('📅 Moje sesje RP')
      .setDescription(lines.join('\n\n') + truncNote)
      .addFields({ name: '📊 Podsumowanie', value: summaryParts, inline: false })
      .setFooter({
        text: 'AURORA Greenville RP — Moje sesje',
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/moje-sesje | ${interaction.user.tag} | total=${total} ended=${ended} upcoming=${upcoming}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
