// Komenda /aktywnosc-ic — statystyki aktywności IC gracza
// Własna aktywność: wszyscy zweryfikowani | Dowolny gracz: Staff+
// Dane pobierane z ProximityMessage (logi /me, /do, /krzyk itp. przez icLog.js)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const IC_TYPES = [
  { key: 'ME',    emoji: '✨', label: '/me'    },
  { key: 'DO',    emoji: '🌍', label: '/do'    },
  { key: 'KRZYK', emoji: '📢', label: '/krzyk' },
  { key: 'NPC',   emoji: '🤖', label: '/npc'   },
];

function progressBar(value, total, len = 8) {
  const filled = total > 0 ? Math.round((value / total) * len) : 0;
  return '`' + '█'.repeat(filled) + '░'.repeat(len - filled) + '`';
}

async function fetchIcStats(prisma, userId, since7, since30) {
  const since14 = new Date(since7.getTime() - 7 * 86_400_000);

  const [total7, total30, total7Prev, ...typeCounts] = await Promise.all([
    prisma.proximityMessage.count({
      where: { userId, createdAt: { gte: since7 } },
    }),
    prisma.proximityMessage.count({
      where: { userId, createdAt: { gte: since30 } },
    }),
    prisma.proximityMessage.count({
      where: { userId, createdAt: { gte: since14, lt: since7 } },
    }),
    ...IC_TYPES.map(t =>
      prisma.proximityMessage.count({
        where: { userId, createdAt: { gte: since30 }, content: { startsWith: `[${t.key}]` } },
      })
    ),
  ]);

  const lastMsg = await prisma.proximityMessage.findFirst({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    select:  { createdAt: true, content: true, locationId: true },
  });

  return { total7, total30, total7Prev, typeCounts, lastMsg };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aktywnosc-ic')
    .setDescription('Statystyki aktywności IC — akcje /me, /do, /krzyk i inne')
    .addSubcommand(sub =>
      sub
        .setName('moja')
        .setDescription('Sprawdź swoją własną aktywność IC (ostatnie 7 i 30 dni)')
    )
    .addSubcommand(sub =>
      sub
        .setName('gracza')
        .setDescription('Sprawdź aktywność IC dowolnego gracza (Staff+)')
        .addUserOption(opt =>
          opt
            .setName('gracz')
            .setDescription('Gracz do sprawdzenia')
            .setRequired(true)
        )
    ),

  async execute(interaction, client, prisma) {
    const sub = interaction.options.getSubcommand();

    if (!isVerified(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z tej komendy.',
        ephemeral: true,
      });
    }

    if (sub === 'gracza' && !isStaff(interaction.member)) {
      return interaction.reply(noPermissionReply('Staff+'));
    }

    await interaction.deferReply({ ephemeral: sub === 'gracza' });

    const targetUser = sub === 'gracza'
      ? interaction.options.getUser('gracz')
      : interaction.user;

    const dbUser = await prisma.user.findUnique({
      where:   { discordId: targetUser.id },
      include: { character: true },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: '❌ Ten użytkownik nie jest zarejestrowany w systemie bota.',
      });
    }

    const now     = new Date();
    const since7  = new Date(now.getTime() - 7  * 86_400_000);
    const since30 = new Date(now.getTime() - 30 * 86_400_000);

    const { total7, total30, total7Prev, typeCounts, lastMsg } =
      await fetchIcStats(prisma, dbUser.id, since7, since30);

    // Trend tygodniowy
    let trendText;
    if (total7Prev === 0 && total7 === 0) {
      trendText = '➖ Brak aktywności w obu tygodniach';
    } else if (total7Prev === 0) {
      trendText = `🆕 Nowa aktywność — **${total7}** akcji w tym tygodniu`;
    } else {
      const diff = total7 - total7Prev;
      const pct  = Math.abs(Math.round((diff / total7Prev) * 100));
      if      (diff > 0) trendText = `📈 **+${diff}** (${pct}% więcej niż tydzień temu)`;
      else if (diff < 0) trendText = `📉 **${diff}** (${pct}% mniej niż tydzień temu)`;
      else               trendText = '➖ Bez zmian względem poprzedniego tygodnia';
    }

    // Rozkład typów — tylko te z > 0 aktywności
    const typeLines = IC_TYPES
      .map((t, i) => ({ ...t, count: typeCounts[i] }))
      .filter(t => t.count > 0)
      .map(t => `${t.emoji} ${t.label}: **${t.count}** ${progressBar(t.count, total30)}`)
      .join('\n');

    // Ostatnia zarejestrowana akcja IC
    let lastLine = '*Brak zarejestrowanych akcji IC*';
    if (lastMsg) {
      const ts     = Math.floor(new Date(lastMsg.createdAt).getTime() / 1000);
      const type   = lastMsg.content.match(/^\[(\w+)\]/)?.[1] ?? '?';
      lastLine     = `\`[${type}]\` w <#${lastMsg.locationId}> — <t:${ts}:R>`;
    }

    const icName = dbUser.character
      ? `${dbUser.character.firstName} ${dbUser.character.lastName}`
      : 'Brak postaci';

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle(`🎭 Aktywność IC — ${icName}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
      .addFields(
        {
          name:  '📅 Ostatnie 7 dni',
          value: `**${total7}** akcji IC\n${trendText}`,
          inline: true,
        },
        {
          name:  '📆 Ostatnie 30 dni',
          value: `**${total30}** akcji IC łącznie`,
          inline: true,
        },
        { name: '​', value: '​', inline: true },
        {
          name:  '📊 Rozkład typów (30 dni)',
          value: typeLines || '*Brak danych o typach akcji*',
          inline: false,
        },
        {
          name:  '⏱️ Ostatnia akcja IC',
          value: lastLine,
          inline: false,
        },
      )
      .setFooter({
        text:    `${targetUser.tag} • AURORA Greenville RP`,
        iconURL: targetUser.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/aktywnosc-ic ${sub} | ${interaction.user.tag}` +
      (sub === 'gracza' ? ` → ${targetUser.tag}` : '') +
      ` | 7d: ${total7} | 30d: ${total30}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
