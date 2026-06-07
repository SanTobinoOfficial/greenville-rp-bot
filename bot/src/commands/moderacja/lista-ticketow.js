// Komenda /lista-ticketow — lista aktywnych ticketów z detalami (Staff+)
// Pokazuje wszystkie OPEN/CLAIMED tickety: numer, kategorię, zgłaszającego, agenta, czas oczekiwania

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');

const CATEGORY_EMOJI = {
  'Techniczny': '🔧',
  'Pytanie':    '❓',
  'Odwołanie':  '⚖️',
  'Pojazd':     '🚗',
  'Praca':      '💼',
  'Skarga':     '📢',
  'Dostęp':     '🔑',
};

function formatAge(createdAt) {
  const ageMin = Math.round((Date.now() - new Date(createdAt).getTime()) / 60_000);
  if (ageMin < 60)   return `${ageMin}m`;
  if (ageMin < 1440) return `${Math.floor(ageMin / 60)}h ${ageMin % 60}m`;
  return `${Math.floor(ageMin / 1440)}d`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-ticketow')
    .setDescription('Lista aktywnych ticketów z detalami (Staff+)')
    .addStringOption(opt =>
      opt.setName('status')
        .setDescription('Filtruj po statusie (domyślnie: wszystkie aktywne)')
        .addChoices(
          { name: 'Wszystkie aktywne', value: 'all'     },
          { name: 'Oczekujące (OPEN)',  value: 'OPEN'    },
          { name: 'Przejęte (CLAIMED)', value: 'CLAIMED' },
        )
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Staff może wyświetlić listę ticketów.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const statusFilter = interaction.options.getString('status') ?? 'all';
    const where = statusFilter === 'all'
      ? { status: { in: ['OPEN', 'CLAIMED'] } }
      : { status: statusFilter };

    const tickets = await prisma.ticket.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });

    if (tickets.length === 0) {
      return interaction.editReply({
        content: '✅ Brak aktywnych ticketów w wybranej kategorii.',
      });
    }

    // Pobierz dane agentów (osobno — model nie ma relacji agenta)
    const agentIds = [...new Set(tickets.map(t => t.agentId).filter(Boolean))];
    const agentUsers = agentIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, discordId: true },
        })
      : [];
    const agentMap = Object.fromEntries(agentUsers.map(u => [u.id, u.discordId]));

    const lines = tickets.map(t => {
      const catEmoji   = CATEGORY_EMOJI[t.category] ?? '🎫';
      const statusIcon = t.status === 'OPEN' ? '🟡' : '🔵';
      const numStr     = String(t.ticketNumber).padStart(4, '0');
      const agentDId   = t.agentId ? agentMap[t.agentId] : null;
      const agentPart  = agentDId ? ` · 🛡️ <@${agentDId}>` : '';
      const age        = formatAge(t.createdAt);
      return `${statusIcon} **#${numStr}** ${catEmoji} ${t.category} · <@${t.user.discordId}>${agentPart} · \`${age}\``;
    });

    const openCount    = tickets.filter(t => t.status === 'OPEN').length;
    const claimedCount = tickets.filter(t => t.status === 'CLAIMED').length;
    const limitNote    = tickets.length === 25 ? ' (max 25)' : '';

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('🎫 Aktywne Tickety — AURORA Greenville RP')
      .setDescription(lines.join('\n'))
      .addFields({
        name:   'Podsumowanie',
        value:  `🟡 Oczekujące: **${openCount}** · 🔵 Przejęte: **${claimedCount}**`,
        inline: false,
      })
      .setFooter({ text: `${tickets.length} ticketów${limitNote} · ${interaction.user.tag}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};
