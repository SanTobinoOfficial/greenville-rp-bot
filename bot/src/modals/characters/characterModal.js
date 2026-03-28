// Modal tworzenia postaci RP — generuje dowód osobisty
// Tworzy/aktualizuje postać w bazie i wysyła embed na kanał

const { EmbedBuilder } = require('discord.js');
const {
  generatePeselRp,
  generateDocumentId,
} = require('../../utils/tableRejestracyjna');
const logger = require('../../utils/logger');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const firstName = interaction.fields.getTextInputValue('first_name').trim();
    const lastName  = interaction.fields.getTextInputValue('last_name').trim();
    const birthDateStr = interaction.fields.getTextInputValue('birth_date').trim();
    const genderRaw = interaction.fields.getTextInputValue('gender').trim().toUpperCase();
    const appearance = interaction.fields.getTextInputValue('appearance')?.trim() || null;

    // Walidacja płci
    const gender = genderRaw === 'M' ? 'M' : genderRaw === 'K' ? 'K' : null;
    if (!gender) {
      return interaction.editReply({ content: '❌ Płeć musi być "M" (mężczyzna) lub "K" (kobieta).' });
    }

    // Walidacja daty urodzenia
    const dateParts = birthDateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!dateParts) {
      return interaction.editReply({ content: '❌ Nieprawidłowy format daty. Użyj formatu DD.MM.RRRR (np. 15.06.1995).' });
    }

    const [, day, month, year] = dateParts;
    const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (isNaN(birthDate.getTime())) {
      return interaction.editReply({ content: '❌ Nieprawidłowa data urodzenia.' });
    }

    const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 0 || age > 120) {
      return interaction.editReply({ content: '❌ Data urodzenia jest nieprawidłowa.' });
    }

    try {
      // Znajdź użytkownika w bazie
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      });

      if (!user) {
        return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany. Zweryfikuj się w kanale **#weryfikacja**.' });
      }

      // Parsuj opcjonalne dane wyglądu
      let eyeColor = null, hairColor = null, photoUrl = null;
      if (appearance) {
        const eyeMatch = appearance.match(/oczy?:\s*([^,]+)/i);
        const hairMatch = appearance.match(/w[łl]osy?:\s*([^,]+)/i);
        if (eyeMatch) eyeColor = eyeMatch[1].trim();
        if (hairMatch) hairColor = hairMatch[1].trim();
      }

      // Generuj PESEL RP i ID dokumentu
      const peselRp = generatePeselRp(birthDate, gender);

      let documentId;
      let isNew = !user.character;

      if (user.character) {
        // Aktualizacja postaci — zachowaj stare ID dokumentu
        documentId = user.character.documentId;
        await prisma.character.update({
          where: { userId: user.id },
          data: {
            firstName, lastName, birthDate, gender,
            eyeColor, hairColor, photoUrl, peselRp,
          },
        });
      } else {
        // Nowa postać — wygeneruj nowe ID
        documentId = generateDocumentId();
        // Upewnij się, że ID jest unikalne
        let idExists = true;
        let docId = documentId;
        while (idExists) {
          const existing = await prisma.character.findUnique({ where: { documentId: docId } });
          if (!existing) { idExists = false; documentId = docId; }
          else docId = generateDocumentId();
        }

        await prisma.character.create({
          data: {
            userId: user.id,
            firstName, lastName, birthDate, gender,
            eyeColor, hairColor, photoUrl,
            peselRp, documentId,
          },
        });
      }

      // Embed dowodu osobistego
      const dowodEmbed = new EmbedBuilder()
        .setColor(0x1E3A5F)
        .setTitle('🪪 DOWÓD OSOBISTY — Greenville RP')
        .setThumbnail(`https://flagcdn.com/w40/pl.png`)
        .addFields(
          { name: '👤 Imię i Nazwisko', value: `${firstName} ${lastName}`, inline: true },
          { name: '🎂 Data urodzenia', value: birthDateStr, inline: true },
          { name: '⚤ Płeć', value: gender === 'M' ? 'Mężczyzna' : 'Kobieta', inline: true },
          { name: '🔢 PESEL RP', value: `\`${peselRp}\``, inline: true },
          { name: '🪪 Nr dokumentu', value: `\`${documentId}\``, inline: true },
          { name: '📱 Nr telefonu', value: user.phoneNumber ? `\`${user.phoneNumber}\`` : 'Brak', inline: true },
        )
        .setFooter({ text: `Greenville RP | Discord: ${interaction.user.tag}` })
        .setTimestamp();

      if (eyeColor || hairColor) {
        const appearance = [eyeColor && `Oczy: ${eyeColor}`, hairColor && `Włosy: ${hairColor}`]
          .filter(Boolean).join(' | ');
        dowodEmbed.addFields({ name: '👁️ Wygląd', value: appearance, inline: false });
      }

      // Wyślij embed na kanał #dowód-osobisty
      const dowodChannel = interaction.guild.channels.cache.find(
        c => c.name === '🪪│dowód-osobisty' && c.isTextBased()
      );
      if (dowodChannel) {
        await dowodChannel.send({
          content: `**${isNew ? 'Nowy dowód osobisty' : 'Zaktualizowany dowód'}** — <@${interaction.user.id}>`,
          embeds: [dowodEmbed],
        });
      }

      // Wyślij kopię w DM
      try {
        await interaction.user.send({
          content: '📋 Oto kopia Twojego dowodu osobistego RP:',
          embeds: [dowodEmbed],
        });
      } catch {}

      // Wynik
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`✅ Postać ${isNew ? 'stworzona' : 'zaktualizowana'}!`)
            .setDescription(
              `Twój dowód osobisty RP został ${isNew ? 'wystawiony' : 'zaktualizowany'}.\n\n` +
              `🪪 **Nr dokumentu:** \`${documentId}\`\n` +
              `📱 **Nr telefonu:** \`${user.phoneNumber || 'Brak'}\``
            )
        ],
      });

      // Log
      const logChannel = interaction.guild.channels.cache.find(
        c => c.name === '🪪│logi-weryfikacji' && c.isTextBased()
      );
      if (logChannel) {
        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x3B82F6)
              .setTitle(`🪪 ${isNew ? 'Nowa' : 'Zaktualizowana'} postać`)
              .addFields(
                { name: 'Discord', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: 'Postać', value: `${firstName} ${lastName}`, inline: true },
                { name: 'Nr dokumentu', value: documentId, inline: true },
              )
              .setTimestamp()
          ],
        });
      }

      logger.info(`Postać ${isNew ? 'utworzona' : 'zaktualizowana'}: ${firstName} ${lastName} dla ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Błąd tworzenia postaci:', error);
      await interaction.editReply({
        content: `❌ Błąd podczas tworzenia postaci: \`${error.message}\``,
      });
    }
  },
};
