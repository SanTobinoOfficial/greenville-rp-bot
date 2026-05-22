// Komenda /aktywnosc — raport aktywności kont (Staff)
// Pokazuje nieaktywne konta do wyczyszczenia lub niedawno dołączonych graczy

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aktywnosc')
    .setDescription('Raport aktywności graczy (Staff+)')
    .addSubcommand(sub =>
      sub.setName('nowi')
        .setDescription('Nowi gracze z ostatnich N dni')
        .addIntegerOption(opt =>
          opt.setName('dni')
            .setDescription('Liczba dni wstecz (domyślnie: 7)')
            .setMinValue(1)
            .setMaxValue(90)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('niezweryfikowani')
        .setDescription('Lista niezweryfikowanych graczy (bez Roblox)')
        .addIntegerOption(opt =>
          opt.setName('dni')
            .setDescription('Dołączyli w ostatnich N dniach (domyślnie: 30)')
            .setMinValue(1)
            .setMaxValue(365)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('dzienne')
        .setDescription('Statystyki daily reward')
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff może sprawdzać aktywność.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ── NOWI ─────────────────────────────────────────────────────────────────
    if (sub === 'nowi') {
      const dni = interaction.options.getInteger('dni') ?? 7;
      const since = new Date(Date.now() - dni * 86400000);

      const [nowiWszyscy, nowiZwer, totalUsers, totalZwer] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: since } } }),
        prisma.user.count({ where: { createdAt: { gte: since }, robloxId: { not: null } } }),
        prisma.user.count(),
        prisma.user.count({ where: { robloxId: { not: null } } }),
      ]);

      const wskZwer = nowiWszyscy > 0
        ? ((nowiZwer / nowiWszyscy) * 100).toFixed(1)
        : '0.0';

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`📈 Nowi Gracze — ostatnie ${dni} dni`)
        .addFields(
          { name: '📅 Zakres', value: `<t:${Math.floor(since.getTime() / 1000)}:D> — Dziś`, inline: false },
          { name: '👥 Nowych w bazie', value: `**${nowiWszyscy}**`, inline: true },
          { name: '✅ Z nich zweryfikowanych', value: `**${nowiZwer}** (${wskZwer}%)`, inline: true },
          { name: '❌ Niezweryfikowanych', value: `**${nowiWszyscy - nowiZwer}**`, inline: true },
          { name: '📊 Łącznie w bazie', value: `**${totalUsers}** | zweryfikowanych: **${totalZwer}**`, inline: false },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── NIEZWERYFIKOWANI ─────────────────────────────────────────────────────
    if (sub === 'niezweryfikowani') {
      const dni = interaction.options.getInteger('dni') ?? 30;
      const since = new Date(Date.now() - dni * 86400000);

      const niezwer = await prisma.user.findMany({
        where: {
          robloxId: null,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { discordId: true, discordUsername: true, createdAt: true },
      });

      const total = await prisma.user.count({
        where: { robloxId: null, createdAt: { gte: since } },
      });

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`⚠️ Niezweryfikowani Gracze — ostatnie ${dni} dni`)
        .setDescription(
          total === 0
            ? '✅ Brak niezweryfikowanych graczy z tego okresu!'
            : `Łącznie: **${total}** (wyświetlono ${niezwer.length} najnowszych)\n` +
              niezwer.map(u => {
                const ts = Math.floor(u.createdAt.getTime() / 1000);
                return `<@${u.discordId}> — dołączył <t:${ts}:R>`;
              }).join('\n')
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── DZIENNE ──────────────────────────────────────────────────────────────
    if (sub === 'dzienne') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 86400000);
      const week = new Date(today.getTime() - 7 * 86400000);

      const [claimedToday, claimedYesterday, claimedWeek, streak7plus, streak3plus] =
        await Promise.all([
          prisma.user.count({ where: { dailyLastClaim: { gte: today } } }),
          prisma.user.count({ where: { dailyLastClaim: { gte: yesterday, lt: today } } }),
          prisma.user.count({ where: { dailyLastClaim: { gte: week } } }),
          prisma.user.count({ where: { dailyStreak: { gte: 7 } } }),
          prisma.user.count({ where: { dailyStreak: { gte: 3 } } }),
        ]);

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🔥 Statystyki Dziennej Nagrody (/daily)')
        .addFields(
          { name: '📅 Dzisiaj', value: `**${claimedToday}** graczy odebrało nagrodę`, inline: true },
          { name: '📅 Wczoraj', value: `**${claimedYesterday}** graczy`, inline: true },
          { name: '📅 Ostatnie 7 dni', value: `**${claimedWeek}** graczy`, inline: true },
          { name: '🔥 Seria 7+ dni', value: `**${streak7plus}** graczy`, inline: true },
          { name: '🔥 Seria 3+ dni', value: `**${streak3plus}** graczy`, inline: true },
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
