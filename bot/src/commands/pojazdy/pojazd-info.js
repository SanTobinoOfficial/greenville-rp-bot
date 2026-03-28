// Komenda /pojazd-info — sprawdź dane właściciela pojazdu (Staff)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pojazd-info')
    .setDescription('Sprawdź dane właściciela pojazdu po tablicy (Staff)')
    .addStringOption(opt =>
      opt.setName('tablica')
        .setDescription('Tablica rejestracyjna (np. GV 123 AB)')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień (wymagane: Helper+).', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const tablica = interaction.options.getString('tablica').toUpperCase().trim();

    const vehicle = await prisma.vehicle.findUnique({
      where: { tablica },
      include: {
        user: {
          include: { character: true },
        },
      },
    });

    if (!vehicle) {
      return interaction.editReply({ content: `❌ Pojazd z tablicą **${tablica}** nie jest zarejestrowany.` });
    }

    const user = vehicle.user;
    const char = user.character;

    const embed = new EmbedBuilder()
      .setColor(0x3B82F6)
      .setTitle(`🚗 Informacje o pojeździe — ${tablica}`)
      .addFields(
        { name: '🚗 Pojazd', value: `${vehicle.marka} ${vehicle.model} (${vehicle.rok})`, inline: true },
        { name: '🎨 Kolor', value: vehicle.kolor, inline: true },
        { name: '🪪 Tablica', value: `\`${vehicle.tablica}\``, inline: true },
        { name: '👤 Właściciel Discord', value: `<@${user.discordId}> (${user.discordUsername})`, inline: false },
        { name: '🎮 Nick Roblox', value: user.robloxUsername || 'Brak', inline: true },
        { name: '📱 Telefon RP', value: user.phoneNumber || 'Brak', inline: true },
      )
      .setTimestamp();

    if (char) {
      embed.addFields(
        { name: '🪪 Postać RP', value: `${char.firstName} ${char.lastName}`, inline: true },
        { name: '🔢 Nr dokumentu', value: char.documentId, inline: true },
      );
    }

    if (vehicle.opis) {
      embed.addFields({ name: '📝 Opis', value: vehicle.opis, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
