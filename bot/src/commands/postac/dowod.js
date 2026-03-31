// Komenda /dowod — wyświetl swój dowód osobisty / dowód innej osoby
// Gracz: swój własny | Policja+: każdego gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isService, ROLES } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dowod')
    .setDescription('Wyświetl dowód osobisty (postać RP)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Sprawdź dowód innej osoby (tylko Policja/Staff)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');
    const isCheckingOther = !!targetUser;

    // Tylko Policja, Staff mogą sprawdzać dowody innych
    if (isCheckingOther && !isService(interaction.member) && !interaction.member.roles.cache.some(r => r.name === ROLES.HELPER)) {
      return interaction.editReply({ content: '❌ Tylko funkcjonariusze służb lub staff mogą sprawdzać dowody innych graczy.' });
    }

    const discordId = isCheckingOther ? targetUser.id : interaction.user.id;
    const lookupUser = isCheckingOther ? targetUser : interaction.user;

    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });

    if (!user) {
      return interaction.editReply({ content: `❌ ${isCheckingOther ? 'Ten gracz nie jest' : 'Nie jesteś'} zarejestrowany/a w systemie.` });
    }

    if (!user.character) {
      return interaction.editReply({ content: `❌ ${isCheckingOther ? 'Ten gracz nie ma' : 'Nie masz'} stworzonej postaci. Idź na kanał **#tworzenie-postaci**.` });
    }

    const char = user.character;
    const birthDate = new Date(char.birthDate);
    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000));

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle('🪪 Dowód Osobisty — Greenville RP')
      .setDescription('**RZECZPOSPOLITA POLSKA**\nDOWÓD OSOBISTY / IDENTITY CARD')
      .addFields(
        { name: '👤 Imię i Nazwisko', value: `${char.firstName} ${char.lastName}`, inline: true },
        { name: '🎂 Data urodzenia', value: `${birthDate.toLocaleDateString('pl-PL')} (${age} lat)`, inline: true },
        { name: '⚧ Płeć', value: char.gender, inline: true },
        { name: '🆔 PESEL', value: `||${char.peselRp}||`, inline: true },
        { name: '📄 Nr dokumentu', value: `||${char.documentId}||`, inline: true },
        { name: '👁️ Kolor oczu', value: char.eyeColor || 'Nie podano', inline: true },
        { name: '💇 Kolor włosów', value: char.hairColor || 'Nie podano', inline: true },
      )
      .setThumbnail(char.photoUrl || lookupUser.displayAvatarURL())
      .setFooter({ text: 'Greenville RP — Dowód Osobisty' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
