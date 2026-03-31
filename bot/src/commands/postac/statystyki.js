// Komenda /statystyki — statystyki moderacyjne i RP gracza
// Gracz: tylko swoje | Staff: dowolnego gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('statystyki')
    .setDescription('Wyświetl statystyki RP gracza')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Statystyki innej osoby (tylko Staff)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');
    const isCheckingOther = !!targetUser;

    if (isCheckingOther && !isStaff(interaction.member)) {
      return interaction.editReply({ content: '❌ Tylko staff może sprawdzać statystyki innych graczy.' });
    }

    const discordId = isCheckingOther ? targetUser.id : interaction.user.id;
    const lookupUser = isCheckingOther ? targetUser : interaction.user;

    const user = await prisma.user.findUnique({
      where: { discordId },
      include: {
        casesAsTarget: true,
        finesReceived: true,
        vehicles: true,
        licenses: true,
        tickets: true,
        arrests: true,
      },
    });

    if (!user) {
      return interaction.editReply({ content: `❌ ${isCheckingOther ? 'Ten gracz nie jest' : 'Nie jesteś'} zarejestrowany/a w systemie.` });
    }

    const cases = user.casesAsTarget;
    const totalWarns  = cases.filter(c => c.type === 'WARN').length;
    const totalBans   = cases.filter(c => c.type === 'BAN').length;
    const totalKicks  = cases.filter(c => c.type === 'KICK').length;
    const totalMutes  = cases.filter(c => c.type === 'MUTE').length;
    const activeWarns = cases.filter(c => c.type === 'WARN' && c.status === 'ACTIVE').length;
    const activeBans  = cases.filter(c => c.type === 'BAN'  && c.status === 'ACTIVE').length;

    const fines = user.finesReceived;
    const totalMandaty  = fines.filter(f => f.type === 'MANDAT').length;
    const totalGrzywny  = fines.filter(f => f.type === 'GRZYWNA').length;
    const totalAreszty  = fines.filter(f => f.type === 'ARESZT').length;
    const totalKwota    = fines.filter(f => f.amount).reduce((sum, f) => sum + (f.amount || 0), 0);

    const totalTickets  = user.tickets.length;
    const totalVehicles = user.vehicles.length;
    const totalLicenses = user.licenses.length;
    const totalArrests  = user.arrests.length;

    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`📊 Statystyki — ${lookupUser.tag}`)
      .setThumbnail(lookupUser.displayAvatarURL())
      .addFields(
        {
          name: '⚖️ Moderacja (łącznie)',
          value: [
            `⚠️ Warny: **${totalWarns}** (aktywne: ${activeWarns})`,
            `🔨 Bany: **${totalBans}** (aktywne: ${activeBans})`,
            `👢 Kicki: **${totalKicks}**`,
            `🔇 Mute: **${totalMutes}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '📜 Mandaty RP',
          value: [
            `📋 Mandaty: **${totalMandaty}**`,
            `💰 Grzywny: **${totalGrzywny}**`,
            `🔒 Areszty: **${totalAreszty}**`,
            `💵 Łączna kwota: **${totalKwota} zł**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🎮 RP',
          value: [
            `🚗 Pojazdy: **${totalVehicles}**`,
            `🪪 Prawa jazdy: **${totalLicenses}**`,
            `🎫 Tickety: **${totalTickets}**`,
            `🚔 Zatrzymania: **${totalArrests}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '📅 Konto',
          value: [
            `Założone: <t:${Math.floor(user.createdAt.getTime() / 1000)}:D>`,
            `Zweryfikowane: ${user.verifiedAt ? `<t:${Math.floor(user.verifiedAt.getTime() / 1000)}:D>` : '❌ Nie'}`,
            `Roblox: ${user.robloxUsername ? `@${user.robloxUsername}` : '❌ Nie połączono'}`,
          ].join('\n'),
          inline: false,
        }
      )
      .setFooter({ text: 'Greenville RP — Statystyki gracza' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
