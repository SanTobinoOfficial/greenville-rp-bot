// Komenda /zdjecie — zdjęcie IC (fotografia in-character)
// Gracz "wykonuje zdjęcie" sceny, obiektu lub osoby — widoczne publicznie na kanale.
// Uzupełnienie zestawu IC: /me (akcja) · /do (opis środowiska) · /zdjecie (dokumentacja)
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isVerified } = require('../../utils/permissions');
const { logIcAction } = require('../../utils/icLog');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zdjecie')
    .setDescription('Wykonaj zdjęcie IC — sfotografuj scenę, pojazd lub osobę (publiczne)')
    .addStringOption(opt =>
      opt
        .setName('opis')
        .setDescription('Co jest na zdjęciu? (np. "przewrócony samochód przy skrzyżowaniu Oak St.")')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(300)
    )
    .addStringOption(opt =>
      opt
        .setName('lokalizacja')
        .setDescription('Gdzie zostało wykonane zdjęcie? (opcjonalne)')
        .setRequired(false)
        .setMaxLength(80)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Musisz być zweryfikowanym mieszkańcem, aby używać tej komendy.',
      });
    }

    const opis = interaction.options.getString('opis').trim();
    const lokalizacja = interaction.options.getString('lokalizacja')?.trim() ?? null;

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

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateIC = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const footerParts = [`📷 ${icName}`, dateIC];
    if (lokalizacja) footerParts.push(`📍 ${lokalizacja}`);

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setAuthor({
        name: `${icName} wykonuje zdjęcie`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setDescription(`\`\`\`\n${opis}\n\`\`\``)
      .setFooter({ text: footerParts.join('  •  ') })
      .setTimestamp();

    logIcAction(
      prisma,
      interaction.user.id,
      interaction.channel.id,
      icName,
      'ZDJECIE',
      opis
    ).catch(() => {});

    logger.info(
      `/zdjecie | ${interaction.user.tag} (${icName}) | "${opis}"` +
      (lokalizacja ? ` | 📍 ${lokalizacja}` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
