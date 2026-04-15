// Komenda /moje-pojazdy — lista zarejestrowanych pojazdów gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moje-pojazdy')
    .setDescription('Wyświetla listę Twoich zarejestrowanych pojazdów'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { vehicles: { orderBy: { createdAt: 'desc' } } },
    });

    if (!user) {
      return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany w systemie.' });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const member = interaction.member;

    let maxVehicles = settings?.maxVehiclesBase || 5;
    if (member.roles.cache.some(r => r.name === 'Booster')) {
      maxVehicles = settings?.maxVehiclesBooster || 10;
    } else if (member.roles.cache.some(r => r.name === 'Wspierający')) {
      maxVehicles = settings?.maxVehiclesSupporter || 9;
    }

    if (user.vehicles.length === 0) {
      return interaction.editReply({
        content: `🚗 Nie masz jeszcze żadnych zarejestrowanych pojazdów.\n\nIdź do kanału **#rejestrowanie-samochodu** aby zarejestrować pojazd.\n**Limit:** 0/${maxVehicles}`,
      });
    }

    const vehicleList = user.vehicles.map((v, i) =>
      `**${i + 1}.** ${v.marka} ${v.model} (${v.rok}) — \`${v.tablica}\` — ${v.kolor}`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle(`🚗 Twoje pojazdy — ${user.vehicles.length}/${maxVehicles}`)
      .setDescription(vehicleList)
      .setFooter({ text: 'AURORA Greenville RP — Rejestracja pojazdów' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
