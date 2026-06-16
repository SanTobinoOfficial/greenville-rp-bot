// Komenda /sms — System SMS IC
// Uzupełnienie zestawu telefonicznego opisanego w #telefon
// Numery RP są przydzielane automatycznie podczas weryfikacji
// Wiadomości persystowane w bazie (model SMS)
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sms')
    .setDescription('Wyślij lub odbierz SMS IC po numerze telefonu RP')
    .addSubcommand(sub =>
      sub
        .setName('wyslij')
        .setDescription('Wyślij SMS IC do gracza po jego numerze telefonu RP')
        .addStringOption(opt =>
          opt
            .setName('numer')
            .setDescription('Numer telefonu RP odbiorcy (np. 555-1234)')
            .setRequired(true)
            .setMinLength(4)
            .setMaxLength(20)
        )
        .addStringOption(opt =>
          opt
            .setName('tresc')
            .setDescription('Treść SMS-a (maks. 300 znaków)')
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(300)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('skrzynka')
        .setDescription('Sprawdź odebrane SMS-y IC (ostatnie 10 wiadomości)')
    )
    .addSubcommand(sub =>
      sub
        .setName('moj-numer')
        .setDescription('Sprawdź swój numer telefonu RP')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z systemu SMS.',
      });
    }

    const senderDb = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { character: true },
    });

    if (!senderDb?.phoneNumber) {
      return interaction.editReply({
        content:
          '❌ Nie masz przypisanego numeru telefonu RP.\n' +
          'Numer jest nadawany automatycznie podczas weryfikacji — skontaktuj się z administracją przez ticket.',
      });
    }

    const senderIcName = senderDb.character
      ? `${senderDb.character.firstName} ${senderDb.character.lastName}`
      : interaction.member.displayName;

    const sub = interaction.options.getSubcommand();

    // ── MOJ-NUMER ─────────────────────────────────────────────────────────────
    if (sub === 'moj-numer') {
      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('📱 Twój numer telefonu RP')
        .setDescription('Podaj ten numer innym graczom — mogą wysłać Ci SMS przez `/sms wyslij`.')
        .addFields(
          { name: '🎭 Postać RP',   value: senderIcName,                        inline: true },
          { name: '📞 Numer RP',    value: `\`${senderDb.phoneNumber}\``,         inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — System Telefoniczny IC' })
        .setTimestamp();

      logger.info(`/sms moj-numer | ${interaction.user.tag} | ${senderDb.phoneNumber}`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── WYSLIJ ────────────────────────────────────────────────────────────────
    if (sub === 'wyslij') {
      const numer = interaction.options.getString('numer').trim();
      const tresc = interaction.options.getString('tresc').trim();

      if (numer === senderDb.phoneNumber) {
        return interaction.editReply({ content: '❌ Nie możesz wysłać SMS-a do samego siebie.' });
      }

      const receiverDb = await prisma.user.findUnique({
        where: { phoneNumber: numer },
        include: { character: true },
      });

      if (!receiverDb) {
        return interaction.editReply({
          content: `❌ Numer **${numer}** nie istnieje w systemie. Sprawdź numer i spróbuj ponownie.`,
        });
      }

      const receiverIcName = receiverDb.character
        ? `${receiverDb.character.firstName} ${receiverDb.character.lastName}`
        : 'Nieznana postać';

      // Zapisz SMS do bazy
      await prisma.sMS.create({
        data: {
          senderId:   senderDb.id,
          receiverId: receiverDb.id,
          content:    tresc,
          type:       'MESSAGE',
        },
      });

      // DM do odbiorcy
      const ts = Math.floor(Date.now() / 1000);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle('📱 Nowy SMS IC')
        .setDescription(`*„${tresc}"*`)
        .addFields(
          { name: '📞 Od numeru',   value: `**${senderDb.phoneNumber}**`, inline: true },
          { name: '🎭 Od postaci',  value: senderIcName,                  inline: true },
          { name: '🕐 Czas',        value: `<t:${ts}:T>`,                 inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — SMS IC | Odpowiedź: /sms wyslij' })
        .setTimestamp();

      let dmSent = false;
      try {
        const receiverDiscord = await client.users.fetch(receiverDb.discordId);
        await receiverDiscord.send({ embeds: [dmEmbed] });
        dmSent = true;
      } catch {
        logger.warn(`/sms wyslij: Nie udało się wysłać DM do ${receiverDb.discordId} (zablokowane DM)`);
      }

      const confirmEmbed = new EmbedBuilder()
        .setColor(dmSent ? COLORS.success : COLORS.warning)
        .setTitle(dmSent ? '✅ SMS wysłany' : '⚠️ SMS wysłany (DM odbiorcy zablokowane)')
        .addFields(
          { name: '📞 Do numeru',  value: `**${numer}**`,  inline: true  },
          { name: '🎭 Do postaci', value: receiverIcName,  inline: true  },
          { name: '💬 Treść',      value: `*„${tresc}"*`,  inline: false },
        );

      if (!dmSent) {
        confirmEmbed.setDescription(
          '⚠️ Odbiorca ma zablokowane wiadomości prywatne — SMS nie dotarł w czasie rzeczywistym.\n' +
          'Wiadomość została zapisana. Odbiorca może sprawdzić skrzynkę przez `/sms skrzynka`.'
        );
      }

      confirmEmbed
        .setFooter({ text: `Twój numer: ${senderDb.phoneNumber} • AURORA Greenville RP — SMS IC` })
        .setTimestamp();

      logger.info(
        `/sms wyslij | ${interaction.user.tag} (${senderDb.phoneNumber}) → ${numer} | ` +
        `DM: ${dmSent ? 'OK' : 'ZABLOKOWANE'} | "${tresc.slice(0, 60)}${tresc.length > 60 ? '…' : ''}"`
      );

      return interaction.editReply({ embeds: [confirmEmbed] });
    }

    // ── SKRZYNKA ──────────────────────────────────────────────────────────────
    if (sub === 'skrzynka') {
      const messages = await prisma.sMS.findMany({
        where: { receiverId: senderDb.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { sender: { include: { character: true } } },
      });

      if (messages.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📱 Skrzynka odbiorcza — pusta')
              .setDescription(
                'Nie masz żadnych odebranych SMS-ów.\n' +
                'Kiedy ktoś wyśle Ci wiadomość przez `/sms wyslij`, pojawi się tu i w DM.'
              )
              .addFields({ name: '📞 Twój numer', value: `\`${senderDb.phoneNumber}\``, inline: true })
              .setFooter({ text: 'AURORA Greenville RP — System Telefoniczny IC' })
              .setTimestamp(),
          ],
        });
      }

      const count = messages.length;
      const embed = new EmbedBuilder()
        .setColor(0x6366F1)
        .setTitle(`📱 Skrzynka odbiorcza — ${count} wiadomoś${count === 1 ? 'ć' : 'ci'}`);

      for (const msg of messages) {
        const fromIcName = msg.sender.character
          ? `${msg.sender.character.firstName} ${msg.sender.character.lastName}`
          : 'Nieznana postać';
        const ts      = Math.floor(msg.createdAt.getTime() / 1000);
        const preview = msg.content.length > 120 ? msg.content.slice(0, 117) + '…' : msg.content;

        embed.addFields({
          name:  `📞 ${msg.sender.phoneNumber ?? '???'} — ${fromIcName}`,
          value: `*„${preview}"*\n*— <t:${ts}:R>*`,
          inline: false,
        });
      }

      embed
        .setFooter({ text: `Twój numer: ${senderDb.phoneNumber} • AURORA Greenville RP — SMS IC` })
        .setTimestamp();

      logger.info(`/sms skrzynka | ${interaction.user.tag} | ${count} wiadomości`);
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
