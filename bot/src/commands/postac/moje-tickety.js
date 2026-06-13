// Komenda /moje-tickety — historia ticketów supportu gracza
// Każdy może sprawdzić własne tickety | Staff może sprawdzać historię innych
// Dostępna dla: Mieszkaniec+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isVerified, isStaff } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const STATUS_META = {
  OPEN:    { emoji: '🟡', label: 'Oczekujący'   },
  CLAIMED: { emoji: '🔵', label: 'W realizacji'  },
  CLOSED:  { emoji: '✅', label: 'Zamknięty'     },
};

const CATEGORY_EMOJI = {
  'Techniczny': '🔧',
  'Pytanie':    '❓',
  'Odwołanie':  '⚖️',
  'Pojazd':     '🚗',
  'Praca':      '💼',
  'Skarga':     '📢',
  'Dostęp':     '🔑',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moje-tickety')
    .setDescription('Sprawdź historię swoich ticketów supportu')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Historia ticketów innej osoby (tylko Staff)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser     = interaction.options.getUser('gracz');
    const isCheckingOther = !!targetUser;

    if (isCheckingOther && !isStaff(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko Staff może sprawdzać historię ticketów innych graczy.',
      });
    }

    if (!isCheckingOther && !isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby zobaczyć historię ticketów.',
      });
    }

    const discordId  = isCheckingOther ? targetUser.id : interaction.user.id;
    const lookupUser = isCheckingOther ? targetUser     : interaction.user;

    const dbUser = await prisma.user.findUnique({
      where: { discordId },
      select: { id: true },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: `❌ ${isCheckingOther ? 'Ten gracz nie jest' : 'Nie jesteś'} zarejestrowany/a w systemie.`,
      });
    }

    const [tickets, openCount, claimedCount, closedCount] = await Promise.all([
      prisma.ticket.findMany({
        where:   { userId: dbUser.id },
        orderBy: { createdAt: 'desc' },
        take:    15,
        select:  {
          ticketNumber: true,
          category:     true,
          status:       true,
          createdAt:    true,
          closedAt:     true,
        },
      }),
      prisma.ticket.count({ where: { userId: dbUser.id, status: 'OPEN'    } }),
      prisma.ticket.count({ where: { userId: dbUser.id, status: 'CLAIMED' } }),
      prisma.ticket.count({ where: { userId: dbUser.id, status: 'CLOSED'  } }),
    ]);

    const totalCount = openCount + claimedCount + closedCount;

    const embed = new EmbedBuilder()
      .setColor(openCount > 0 ? COLORS.warning : COLORS.primary)
      .setTitle(`🎫 Historia ticketów — ${lookupUser.tag}`)
      .setThumbnail(lookupUser.displayAvatarURL())
      .setFooter({ text: 'AURORA Greenville RP — Historia ticketów' })
      .setTimestamp();

    if (tickets.length === 0) {
      embed
        .setColor(COLORS.success)
        .setDescription('Brak ticketów w historii.');
      logger.info(`/moje-tickety | ${interaction.user.tag} | brak ticketów`);
      return interaction.editReply({ embeds: [embed] });
    }

    embed.setDescription(
      `Łącznie: **${totalCount}** ticket${totalCount === 1 ? '' : 'ów'}` +
      (totalCount > 15 ? ' *(pokazuję ostatnie 15)*' : '') +
      `\n🟡 Oczekujące: **${openCount}** · 🔵 W realizacji: **${claimedCount}** · ✅ Zamknięte: **${closedCount}**`
    );

    for (const t of tickets) {
      const num      = String(t.ticketNumber).padStart(4, '0');
      const meta     = STATUS_META[t.status] ?? { emoji: '❓', label: t.status };
      const catEmoji = CATEGORY_EMOJI[t.category] ?? '🎫';
      const openedTs = Math.floor(t.createdAt.getTime() / 1000);

      let value = `${meta.emoji} **${meta.label}**\n`;
      value    += `${catEmoji} ${t.category}\n`;
      value    += `📅 Otwarto: <t:${openedTs}:D> (<t:${openedTs}:R>)`;

      if (t.closedAt) {
        const closedTs = Math.floor(t.closedAt.getTime() / 1000);
        value += `\n🔒 Zamknięto: <t:${closedTs}:D>`;
      }

      embed.addFields({ name: `Ticket #${num}`, value, inline: true });
    }

    logger.info(
      `/moje-tickety | ${interaction.user.tag}${isCheckingOther ? ` → ${lookupUser.tag}` : ''} | ${tickets.length}/${totalCount} ticketów`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
