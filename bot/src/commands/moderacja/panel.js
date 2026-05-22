// Komenda /panel — Staff Dashboard (szybki przegląd stanu serwera)
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Panel staffu — szybki przegląd stanu serwera (Staff+)'),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff ma dostęp do panelu.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      openTickets,
      unverifiedMembers,
      pendingApplications,
      pendingJobApps,
      activeWarns,
      activeFines,
      ongoingSessions,
      todayJoins,
      maintenanceSettings,
    ] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.user.count({ where: { robloxId: null } }),
      prisma.application.count({ where: { status: 'PENDING' } }),
      prisma.jobApplication.count({ where: { status: 'PENDING' } }),
      prisma.case.count({ where: { type: 'WARN', status: 'ACTIVE' } }),
      prisma.fine.count({ where: { active: true } }),
      prisma.session.count({ where: { status: 'ONGOING' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.settings.findUnique({ where: { id: 'global' } }),
    ]);

    const maintenance = maintenanceSettings?.maintenanceMode ?? false;

    // Priorytety ostrzeżeń
    const warnings = [];
    if (openTickets > 0)          warnings.push(`🎫 **${openTickets}** nieobsłużonych ticketów`);
    if (pendingApplications > 0)  warnings.push(`📝 **${pendingApplications}** oczekujących podań o służbę`);
    if (pendingJobApps > 0)       warnings.push(`💼 **${pendingJobApps}** oczekujących podań o pracę`);
    if (maintenance)               warnings.push(`🔧 **Tryb konserwacji AKTYWNY**`);
    if (unverifiedMembers > 50)   warnings.push(`🔴 Niezweryfikowanych: **${unverifiedMembers}** (wiele)`);

    const statusSection = warnings.length > 0
      ? warnings.join('\n')
      : '✅ Wszystko w porządku!';

    const guild = interaction.guild;
    const members = guild.memberCount;

    const embed = new EmbedBuilder()
      .setColor(maintenance ? 0xFEE75C : warnings.length > 0 ? 0xED4245 : 0x57F287)
      .setTitle(`${maintenance ? '🔧' : warnings.length > 0 ? '🚨' : '✅'} Panel Staffu — AURORA Greenville RP`)
      .setDescription(
        maintenance
          ? `⚠️ **Tryb konserwacji jest włączony!**\nKomunikat: *${maintenanceSettings?.maintenanceMessage}*`
          : null
      )
      .addFields(
        {
          name: '⚠️ Do obsłużenia',
          value: statusSection,
          inline: false,
        },
        {
          name: '📊 Stan Serwera',
          value:
            `Członków Discord: **${members}**\n` +
            `Nowych dziś: **${todayJoins}**\n` +
            `Niezweryfikowanych: **${unverifiedMembers}**\n` +
            `Aktywna sesja: ${ongoingSessions > 0 ? `**Tak** (${ongoingSessions})` : '**Nie**'}`,
          inline: true,
        },
        {
          name: '⚖️ Moderacja',
          value:
            `Aktywne warny: **${activeWarns}**\n` +
            `Aktywne mandaty RP: **${activeFines}**\n` +
            `Otwarte tickety: **${openTickets}**`,
          inline: true,
        },
        {
          name: '🤖 Bot Status',
          value:
            `Uptime: **${Math.floor(client.uptime / 3600000)}h ${Math.floor((client.uptime % 3600000) / 60000)}m**\n` +
            `Ping API: **${client.ws.ping}ms**\n` +
            `Komend: **${client.commands.size}**`,
          inline: true,
        },
        {
          name: '💡 Szybkie Komendy',
          value:
            '`/raport` — pełny raport\n' +
            '`/ostrzezenia @gracz` — historia kar\n' +
            '`/lookup @gracz` — info o graczu\n' +
            '`/maintenance` — tryb konserwacji\n' +
            '`/giveaway start` — uruchom losowanie',
          inline: false,
        },
      )
      .setFooter({ text: `Staff: ${interaction.user.tag} | ${now.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
