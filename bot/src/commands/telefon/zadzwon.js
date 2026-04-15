// Komenda /zadzwoń — symulacja połączenia telefonicznego RP
// Wysyła DM do odbiorcy z przyciskami Odbierz / Odrzuć

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zadzwoń')
    .setDescription('Zadzwoń do innego gracza (RP)')
    .addStringOption(opt =>
      opt.setName('numer')
        .setDescription('Numer telefonu osoby do której dzwonisz')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetNumber = interaction.options.getString('numer').trim();

    const caller = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!caller?.phoneNumber) {
      return interaction.editReply({
        content: '❌ Nie masz przypisanego numeru telefonu RP.',
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { phoneNumber: targetNumber },
    });

    if (!receiver) {
      return interaction.editReply({
        content: `❌ Numer **${targetNumber}** nie istnieje.`,
      });
    }

    if (receiver.discordId === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz dzwonić do samego siebie.' });
    }

    // Zapisz "połączenie" w bazie
    await prisma.sMS.create({
      data: {
        senderId: caller.id,
        receiverId: receiver.id,
        content: '📞 Połączenie przychodzące',
        type: 'CALL',
      },
    });

    // Wyślij DM do odbiorcy z przyciskami
    try {
      const receiverMember = await interaction.guild.members.fetch(receiver.discordId);
      const callEmbed = new EmbedBuilder()
        .setColor(0x25D366)
        .setTitle('📞 Połączenie przychodzące — AURORA Greenville RP')
        .setDescription(
          `Dzwoni: **\`${caller.phoneNumber}\`**\n\n` +
          'Odbierz lub odrzuć połączenie.'
        )
        .setFooter({ text: 'AURORA Greenville RP — System Telefoniczny' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`call_accept_${caller.id}`)
          .setLabel('📞 Odbierz')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`call_reject_${caller.id}`)
          .setLabel('📵 Odrzuć')
          .setStyle(ButtonStyle.Danger)
      );

      await receiverMember.user.send({ embeds: [callEmbed], components: [row] });

      await interaction.editReply({
        content: `📞 Dzwonisz na numer **${targetNumber}**... Czekaj na odebranie.`,
      });
    } catch {
      await interaction.editReply({
        content: '❌ Nie można nawiązać połączenia (użytkownik zablokował DM).',
      });
    }
  },
};
