// Komenda /do — opis środowiska/sceny (akcja IC/RP)
// Uzupełnienie do /me: opisuje co jest PRAWDĄ w otoczeniu postaci
// np. "Drzwi są zamknięte na klucz" / "Silnik samochodu dymi i wycieka płyn"
// Dostępna dla: wszyscy gracze

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');
const { logIcAction } = require('../../utils/icLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('do')
    .setDescription('Opisz otoczenie lub stan sceny (środowisko RP, nie czynność postaci)')
    .addStringOption(opt =>
      opt
        .setName('opis')
        .setDescription('Co jest prawdą w otoczeniu? (np. "Drzwi są uchylone, ze środka dobiegają głosy")')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(400)
    ),

  async execute(interaction, client, prisma) {
    // Publiczna odpowiedź — scena RP jest widoczna dla wszystkich
    await interaction.deferReply({ ephemeral: false });

    const opis = interaction.options.getString('opis').trim();

    // Pobierz postać gracza (IC name)
    const user = await prisma.user
      .findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      })
      .catch(() => null);

    const char = user?.character;
    const icName = char
      ? `${char.firstName} ${char.lastName}`
      : (interaction.member?.displayName ?? interaction.user.username);

    // Buduj embed — styl odmienny od /me (fioletowy, bez emoji akcji)
    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)  // Fiolet — odróżnia /do od /me (niebieski)
      .setDescription(`> *${opis}*`)
      .addFields({
        name: '👁️ Obserwator',
        value: `**${icName}**`,
        inline: true,
      })
      .setFooter({
        text: `${interaction.user.tag} • ${interaction.channel.name} • /do`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logIcAction(prisma, interaction.user.id, interaction.channel.id, icName, 'DO', opis).catch(() => {});

    logger.info(`/do | ${interaction.user.tag} (${icName}) | "${opis}"`);

    await interaction.editReply({ embeds: [embed] });
  },
};
