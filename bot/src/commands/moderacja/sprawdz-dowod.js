// Komenda /sprawdź-dowód — policja sprawdza dowód osobisty gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isService, isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sprawdź-dowód')
    .setDescription('Sprawdź dowód osobisty gracza (Służby/Staff)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do sprawdzenia')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member) && !isService(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień (wymagane: służby lub staff).', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('gracz');

    const user = await prisma.user.findUnique({
      where: { discordId: target.id },
      include: { character: true },
    });

    if (!user) {
      return interaction.editReply({ content: `❌ <@${target.id}> nie jest zarejestrowany w systemie.` });
    }

    if (!user.character) {
      return interaction.editReply({ content: `❌ <@${target.id}> nie posiada dowodu osobistego RP.` });
    }

    const char = user.character;
    const birthDate = char.birthDate.toLocaleDateString('pl-PL');

    const embed = new EmbedBuilder()
      .setColor(0x1E3A5F)
      .setTitle('🪪 DOWÓD OSOBISTY — Greenville RP')
      .addFields(
        { name: '👤 Imię i Nazwisko', value: `${char.firstName} ${char.lastName}`, inline: true },
        { name: '🎂 Data urodzenia', value: birthDate, inline: true },
        { name: '⚤ Płeć', value: char.gender === 'M' ? 'Mężczyzna' : 'Kobieta', inline: true },
        { name: '🔢 PESEL RP', value: `\`${char.peselRp}\``, inline: true },
        { name: '🪪 Nr dokumentu', value: `\`${char.documentId}\``, inline: true },
        { name: '📱 Nr telefonu', value: user.phoneNumber ? `\`${user.phoneNumber}\`` : 'Brak', inline: true },
        { name: '🎮 Nick Roblox', value: user.robloxUsername || 'Brak', inline: true },
      )
      .setFooter({ text: `Sprawdził: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
