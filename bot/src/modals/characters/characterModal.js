// Modal tworzenia postaci RP — generuje dowód osobisty
// Pola od gracza: imię, nazwisko, wiek, historia
// Reszta (płeć, data urodzenia, wygląd, PESEL, dokumentId) — autogeneracja

const { EmbedBuilder } = require('discord.js');
const {
  generatePeselRp,
  generateDocumentId,
} = require('../../utils/tableRejestracyjna');
const logger = require('../../utils/logger');

// ─── Losowe dane wyglądu ─────────────────────────────────────────────────────

const EYE_COLORS  = ['niebieskie', 'zielone', 'brązowe', 'szare', 'piwne', 'orzechowe', 'czarne'];
const HAIR_COLORS = ['czarne', 'brązowe', 'blond', 'ciemnoblond', 'kasztanowe', 'rude', 'szare', 'ciemnobrązowe'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomGender() { return Math.random() < 0.5 ? 'M' : 'K'; }

/**
 * Generuje datę urodzenia na podstawie wieku.
 * Losuje dzień i miesiąc, rok = bieżący − wiek.
 */
function birthDateFromAge(age) {
  const year  = new Date().getFullYear() - age;
  const month = Math.floor(Math.random() * 12);       // 0–11
  const day   = Math.floor(Math.random() * 28) + 1;   // 1–28 (bezpiecznie dla każdego miesiąca)
  return new Date(year, month, day);
}

// ─── Handler ─────────────────────────────────────────────────────────────────

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const firstName = interaction.fields.getTextInputValue('first_name').trim();
    const lastName  = interaction.fields.getTextInputValue('last_name').trim();
    const ageRaw    = interaction.fields.getTextInputValue('age').trim();
    const historia  = interaction.fields.getTextInputValue('historia').trim();

    // Walidacja wieku
    const age = parseInt(ageRaw, 10);
    if (isNaN(age) || age < 18 || age > 80) {
      return interaction.editReply({ content: '❌ Wiek musi być liczbą od 18 do 80.' });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      });

      if (!user) {
        return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany. Zweryfikuj się w kanale **#weryfikacja**.' });
      }

      // Autogeneracja
      const gender    = randomGender();
      const birthDate = birthDateFromAge(age);
      const eyeColor  = pick(EYE_COLORS);
      const hairColor = pick(HAIR_COLORS);
      const peselRp   = generatePeselRp(birthDate, gender);

      const birthDateStr = birthDate.toLocaleDateString('pl-PL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      }); // "DD.MM.YYYY"

      let documentId;
      const isNew = !user.character;

      if (user.character) {
        // Aktualizacja — zachowaj stary nr dokumentu
        documentId = user.character.documentId;
        await prisma.character.update({
          where: { userId: user.id },
          data: { firstName, lastName, birthDate, gender, eyeColor, hairColor, photoUrl: null, peselRp },
        });
      } else {
        // Nowa postać — wygeneruj unikalny nr dokumentu
        documentId = generateDocumentId();
        let attempts = 0;
        while (await prisma.character.findUnique({ where: { documentId } })) {
          documentId = generateDocumentId();
          if (++attempts > 20) throw new Error('Nie udało się wygenerować unikalnego ID dokumentu.');
        }
        await prisma.character.create({
          data: {
            userId: user.id,
            firstName, lastName, birthDate, gender,
            eyeColor, hairColor, photoUrl: null,
            peselRp, documentId,
          },
        });
      }

      // ── Embed dowodu ────────────────────────────────────────────────────────
      const dowodEmbed = new EmbedBuilder()
        .setColor(0x1E3A5F)
        .setTitle('🪪 DOWÓD OSOBISTY — AURORA Greenville RP')
        .setThumbnail('https://flagcdn.com/w40/pl.png')
        .addFields(
          { name: '👤 Imię i Nazwisko',  value: `${firstName} ${lastName}`,               inline: true },
          { name: '🎂 Data urodzenia',    value: birthDateStr,                              inline: true },
          { name: '⚤ Płeć',              value: gender === 'M' ? 'Mężczyzna' : 'Kobieta', inline: true },
          { name: '🔢 PESEL RP',          value: `\`${peselRp}\``,                          inline: true },
          { name: '🪪 Nr dokumentu',      value: `\`${documentId}\``,                       inline: true },
          { name: '📱 Nr telefonu',       value: user.phoneNumber ? `\`${user.phoneNumber}\`` : 'Brak', inline: true },
          { name: '👁️ Wygląd',           value: `Oczy: ${eyeColor} | Włosy: ${hairColor}`, inline: false },
          { name: '📖 Historia',          value: historia,                                  inline: false },
        )
        .setFooter({ text: `AURORA Greenville RP | Discord: ${interaction.user.tag}` })
        .setTimestamp();

      // Wyślij na kanał #dowód-osobisty
      const dowodChannel = interaction.guild.channels.cache.find(
        c => c.name === '🪪│dowód-osobisty' && c.isTextBased()
      );
      if (dowodChannel) {
        await dowodChannel.send({
          content: `**${isNew ? 'Nowy dowód osobisty' : 'Zaktualizowany dowód'}** — <@${interaction.user.id}>`,
          embeds: [dowodEmbed],
        });
      }

      // Kopia w DM
      try {
        await interaction.user.send({ content: '📋 Oto kopia Twojego dowodu osobistego RP:', embeds: [dowodEmbed] });
      } catch {}

      // Odpowiedź
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(`✅ Postać ${isNew ? 'stworzona' : 'zaktualizowana'}!`)
            .setDescription(
              `Twój dowód osobisty RP został ${isNew ? 'wystawiony' : 'zaktualizowany'}.\n\n` +
              `👤 **${firstName} ${lastName}**, ${age} lat\n` +
              `⚤ **Płeć:** ${gender === 'M' ? 'Mężczyzna' : 'Kobieta'}\n` +
              `🎂 **Urodzony/a:** ${birthDateStr}\n` +
              `👁️ **Wygląd:** Oczy ${eyeColor}, Włosy ${hairColor}\n\n` +
              `🪪 **Nr dokumentu:** \`${documentId}\`\n` +
              `🔢 **PESEL RP:** \`${peselRp}\`\n` +
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
                { name: 'Discord',     value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
                { name: 'Postać',      value: `${firstName} ${lastName}`,                            inline: true },
                { name: 'Nr dokumentu', value: documentId,                                           inline: true },
                { name: 'Płeć / Wiek', value: `${gender === 'M' ? 'M' : 'K'} / ${age} lat`,        inline: true },
              )
              .setTimestamp()
          ],
        });
      }

      logger.info(`Postać ${isNew ? 'utworzona' : 'zaktualizowana'}: ${firstName} ${lastName} dla ${interaction.user.tag}`);

    } catch (error) {
      logger.error('Błąd tworzenia postaci:', error);
      await interaction.editReply({ content: `❌ Błąd podczas tworzenia postaci: \`${error.message}\`` });
    }
  },
};
