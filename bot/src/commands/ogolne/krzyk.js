// Komenda /krzyk — krzyk IC widoczny publicznie na kanale
// Uzupełnienie zestawu RP: /me (akcja) · /do (otoczenie) · /szept (szept) · /krzyk (krzyk)
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { logIcAction } = require('../../utils/icLog');

// Kolor embeda — jaskrawy pomarańcz sygnalizujący głośny krzyk
const KRZYK_COLOR = 0xFF6B00;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('krzyk')
    .setDescription('Krzyknij coś IC — widoczne publicznie na kanale dla całej okolicy')
    .addStringOption(opt =>
      opt
        .setName('tresc')
        .setDescription('Co krzyczy Twoja postać? (widoczne dla wszystkich na kanale)')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(150)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
        ephemeral: true,
      });
    }

    const tresc = interaction.options.getString('tresc').trim();

    // Pobierz postać gracza — wymagamy imienia IC jak w /me i /szept
    const userDb = await prisma.user
      .findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      })
      .catch(() => null);

    const char = userDb?.character;
    const icName = char
      ? `${char.firstName} ${char.lastName}`
      : (interaction.member?.displayName ?? interaction.user.username);

    const embed = new EmbedBuilder()
      .setColor(KRZYK_COLOR)
      .setDescription(`📢 **${icName}** krzyczy:\n# ${tresc}`)
      .setFooter({
        text: `${interaction.user.tag} • ${interaction.channel.name} • /krzyk`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logIcAction(prisma, interaction.user.id, interaction.channel.id, icName, 'KRZYK', tresc).catch(() => {});

    logger.info(`/krzyk | ${interaction.user.tag} (${icName}) | "${tresc}"`);

    await interaction.editReply({ embeds: [embed] });
  },
};
