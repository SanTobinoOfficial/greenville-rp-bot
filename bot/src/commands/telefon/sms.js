// Komenda /sms — wysyłanie wiadomości SMS w RP
// Wysyła embed na #telefon i DM do odbiorcy

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sms')
    .setDescription('Wyślij SMS do innego gracza (RP)')
    .addStringOption(opt =>
      opt.setName('numer')
        .setDescription('Numer telefonu odbiorcy (np. 500 123 456)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('treść')
        .setDescription('Treść wiadomości SMS')
        .setRequired(true)
        .setMaxLength(300)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const targetNumber = interaction.options.getString('numer').trim();
    const content = interaction.options.getString('treść').trim();

    // Pobierz nadawcę
    const sender = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!sender?.phoneNumber) {
      return interaction.editReply({
        content: '❌ Nie masz przypisanego numeru telefonu. Najpierw zweryfikuj się w **#weryfikacja**.',
      });
    }

    // Znajdź odbiorcę
    const receiver = await prisma.user.findUnique({
      where: { phoneNumber: targetNumber },
    });

    if (!receiver) {
      return interaction.editReply({
        content: `❌ Numer **${targetNumber}** nie istnieje w systemie RP.`,
      });
    }

    if (receiver.discordId === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz wysłać SMS do samego siebie.' });
    }

    // Zapisz SMS do bazy
    await prisma.sMS.create({
      data: {
        senderId: sender.id,
        receiverId: receiver.id,
        content,
        type: 'MESSAGE',
      },
    });

    // Embed na kanale #telefon
    const smsEmbed = new EmbedBuilder()
      .setColor(0x25D366) // Zielony jak WhatsApp/SMS
      .setTitle('📱 SMS')
      .addFields(
        { name: '📤 Od', value: `${interaction.user.username} (\`${sender.phoneNumber}\`)`, inline: true },
        { name: '📥 Do', value: `\`${targetNumber}\``, inline: true },
        { name: '💬 Treść', value: content, inline: false },
      )
      .setFooter({ text: 'Greenville RP — System Telefoniczny' })
      .setTimestamp();

    const telefonChannel = interaction.guild.channels.cache.find(
      c => c.name === '📱│telefon' && c.isTextBased()
    );
    if (telefonChannel) {
      await telefonChannel.send({ embeds: [smsEmbed] });
    }

    // Powiadomienie DM do odbiorcy
    try {
      const receiverMember = await interaction.guild.members.fetch(receiver.discordId);
      await receiverMember.user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x25D366)
            .setTitle('📱 Nowy SMS — Greenville RP')
            .addFields(
              { name: '📤 Od numeru', value: `\`${sender.phoneNumber}\``, inline: true },
              { name: '💬 Treść', value: content, inline: false },
            )
            .setFooter({ text: 'Odpowiedz używając /sms' })
            .setTimestamp()
        ],
      });
    } catch {}

    await interaction.editReply({
      content: `✅ SMS wysłany na numer **${targetNumber}**.`,
    });
  },
};
