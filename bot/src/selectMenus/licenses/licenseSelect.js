// Select menu — wybór kategorii prawa jazdy
// Po wyborze: walidacja weryfikacji i duplikatu, powiadomienie do #egzaminy

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');

// Czytelna etykieta dla każdej kategorii
const CATEGORY_LABELS = {
  AM: 'AM — Motorower',
  A1: 'A1 — Motocykl 125 cm³',
  A2: 'A2 — Motocykl 35 kW',
  A:  'A — Motocykl bez ograniczeń',
  B:  'B — Samochód osobowy',
  C:  'C — Pojazd ciężarowy',
  D:  'D — Autobus',
};

module.exports = {
  /**
   * Obsługa select menu wyboru kategorii prawa jazdy
   * @param {import('discord.js').StringSelectMenuInteraction} interaction
   */
  async execute(interaction, client, prisma) {
    // Pobieramy wybraną kategorię (zawsze jeden element, maxValues=1)
    const kategoria = interaction.values[0];
    const discordId = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    // === 1. Sprawdź czy użytkownik jest zweryfikowany (ma robloxId w DB) ===
    const user = await prisma.user.findUnique({
      where: { discordId },
      include: {
        licenses: {
          where: { kategoria },
        },
      },
    });

    if (!user || !user.robloxId) {
      return interaction.editReply({
        content:
          '❌ **Nie jesteś zweryfikowany!**\nAby złożyć wniosek o prawo jazdy, musisz najpierw zweryfikować swoje konto Roblox.\nUżyj przycisku weryfikacji na kanale startowym.',
      });
    }

    // === 2. Sprawdź czy użytkownik już posiada tę kategorię (ACTIVE lub SUSPENDED) ===
    const existingLicense = user.licenses[0];

    if (existingLicense) {
      if (existingLicense.status === 'ACTIVE') {
        return interaction.editReply({
          content: `❌ **Posiadasz już prawo jazdy kategorii ${kategoria}!**\nNie możesz złożyć ponownego wniosku na tę samą kategorię.`,
        });
      }
      if (existingLicense.status === 'SUSPENDED') {
        return interaction.editReply({
          content: `❌ **Twoje prawo jazdy kategorii ${kategoria} jest zawieszone.**\nNie możesz złożyć wniosku podczas zawieszenia.`,
        });
      }
      if (existingLicense.status === 'REVOKED') {
        // Unieważnione — można ponownie złożyć wniosek
        logger.info(`Użytkownik ${interaction.user.tag} składa nowy wniosek PJ ${kategoria} (poprzednie unieważnione)`);
      }
    }

    // === 3. Wyślij powiadomienie do kanału #egzaminy z przyciskami dla staffu ===
    try {
      const guild = interaction.guild;

      // Szukamy kanału #egzaminy po nazwie
      const egzaminyChannel = guild.channels.cache.find(
        c => c.name === 'egzaminy' && c.isTextBased()
      );

      if (egzaminyChannel) {
        // Embed z informacją o wniosku
        const embed = new EmbedBuilder()
          .setColor(0x3B82F6)
          .setTitle('📋 Nowy wniosek o egzamin prawa jazdy')
          .addFields(
            { name: '👤 Gracz', value: `<@${discordId}> (\`${interaction.user.tag}\`)`, inline: true },
            { name: '🎮 Roblox', value: user.robloxUsername || `ID: ${user.robloxId}`, inline: true },
            { name: '🪪 Kategoria', value: `**${CATEGORY_LABELS[kategoria] || kategoria}**`, inline: false },
            { name: '🕐 Data złożenia', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          )
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'AURORA Greenville RP — Egzaminy na prawo jazdy' })
          .setTimestamp();

        // Przyciski akceptacji i odrzucenia terminu egzaminu
        // customId zawiera discordId i kategorię — handler licenseButton je odczyta
        const acceptBtn = new ButtonBuilder()
          .setCustomId(`license_approve_${discordId}_${kategoria}`)
          .setLabel('✅ Zatwierdź termin')
          .setStyle(ButtonStyle.Success);

        const rejectBtn = new ButtonBuilder()
          .setCustomId(`license_reject_${discordId}_${kategoria}`)
          .setLabel('❌ Odrzuć')
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

        await egzaminyChannel.send({ embeds: [embed], components: [row] });
        logger.info(`Wniosek PJ ${kategoria} od ${interaction.user.tag} wysłany do #egzaminy`);
      } else {
        // Kanał nie istnieje — logujemy ostrzeżenie, ale nie blokujemy użytkownika
        logger.warn(`Nie znaleziono kanału #egzaminy na serwerze ${guild.name}`);
      }
    } catch (err) {
      logger.error('Błąd wysyłania powiadomienia do #egzaminy:', err.message);
    }

    // === 4. Odpowiedź efemeryczna dla użytkownika ===
    await interaction.editReply({
      content:
        `✅ **Wniosek złożony pomyślnie!**\n\n` +
        `Złożyłeś wniosek o egzamin na prawo jazdy kategorii **${kategoria}**.\n` +
        `Staff skontaktuje się z Tobą w sprawie terminu egzaminu.\n\n` +
        `> Nie wysyłaj ponownie wniosku — poczekaj na odpowiedź staffu.`,
    });
  },
};
