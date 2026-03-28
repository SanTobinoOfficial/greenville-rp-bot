// Komenda /wydaj-prawo-jazdy — ręczne wydanie prawa jazdy graczowi przez staff
// Wymagane uprawnienia: Helper+
// Tworzy wpis w DB, nadaje rolę, wysyła certyfikat i DM

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Dostępne kategorie prawa jazdy
const KATEGORIE = ['AM', 'A1', 'A2', 'A', 'B', 'C', 'D'];

// Kolory certyfikatu dla każdej kategorii
const KATEGORIA_COLORS = {
  AM: 0x6B7280,
  A1: 0xF59E0B,
  A2: 0xF97316,
  A:  0xEF4444,
  B:  0x3B82F6,
  C:  0x8B5CF6,
  D:  0x10B981,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wydaj-prawo-jazdy')
    .setDescription('Wydaje prawo jazdy wskazanemu graczowi [Staff]')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz, któremu wydajesz prawo jazdy')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('kategoria')
        .setDescription('Kategoria prawa jazdy')
        .setRequired(true)
        .addChoices(
          { name: 'AM — Motorower', value: 'AM' },
          { name: 'A1 — Motocykl 125 cm³', value: 'A1' },
          { name: 'A2 — Motocykl 35 kW', value: 'A2' },
          { name: 'A — Motocykl bez ograniczeń', value: 'A' },
          { name: 'B — Samochód osobowy', value: 'B' },
          { name: 'C — Pojazd ciężarowy', value: 'C' },
          { name: 'D — Autobus', value: 'D' },
        )
    ),

  /**
   * Wydaje prawo jazdy graczowi
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, prisma) {
    // === Weryfikacja uprawnień — wymagany Helper+ ===
    if (!isStaff(interaction.member)) {
      return interaction.reply(noPermissionReply('Helper'));
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser  = interaction.options.getUser('gracz');
    const kategoria   = interaction.options.getString('kategoria');
    const examinator  = interaction.user;
    const guild       = interaction.guild;

    // === 1. Pobierz dane gracza z bazy ===
    const dbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie jest zarejestrowany w systemie.`,
      });
    }

    if (!dbUser.robloxId) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie ma zweryfikowanego konta Roblox.`,
      });
    }

    // === 2. Sprawdź czy gracz już ma tę kategorię (i jest ACTIVE) ===
    const existing = await prisma.license.findUnique({
      where: {
        userId_kategoria: { userId: dbUser.id, kategoria },
      },
    });

    if (existing && existing.status === 'ACTIVE') {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> już posiada aktywne prawo jazdy **kategorii ${kategoria}**.`,
      });
    }

    // === 3. Utwórz lub przywróć licencję w bazie danych ===
    let license;
    try {
      if (existing) {
        // Jeśli istnieje (unieważnione) — przywróć status ACTIVE
        license = await prisma.license.update({
          where: { id: existing.id },
          data: {
            status:          'ACTIVE',
            suspendedAt:     null,
            suspendedUntil:  null,
            suspendedReason: null,
            examinatorId:    examinator.id,
            issuedAt:        new Date(),
          },
        });
      } else {
        // Nowy wpis
        license = await prisma.license.create({
          data: {
            userId:      dbUser.id,
            kategoria,
            status:      'ACTIVE',
            examinatorId: examinator.id,
          },
        });
      }
    } catch (err) {
      logger.error('Błąd tworzenia licencji w DB:', err.message);
      return interaction.editReply({ content: '❌ Błąd bazy danych podczas tworzenia licencji.' });
    }

    // === 4. Nadaj rolę @Kat. [X] ===
    const roleName = `Kat. ${kategoria}`;
    let roleGiven = false;

    try {
      const member = await guild.members.fetch(targetUser.id);
      let role = guild.roles.cache.find(r => r.name === roleName);

      if (!role) {
        // Tworzymy rolę jeśli nie istnieje
        role = await guild.roles.create({
          name:   roleName,
          color:  KATEGORIA_COLORS[kategoria] || 0x5865F2,
          reason: `Automatyczne tworzenie roli dla kategorii PJ ${kategoria}`,
        });
        logger.info(`Utworzono nową rolę: ${roleName}`);
      }

      await member.roles.add(role, `Wydanie PJ kat. ${kategoria} przez ${examinator.tag}`);
      roleGiven = true;
      logger.info(`Nadano rolę "${roleName}" graczowi ${targetUser.tag}`);
    } catch (err) {
      logger.error(`Błąd nadawania roli "${roleName}":`, err.message);
      // Nie przerywamy — licencja już istnieje w DB
    }

    // === 5. Wyślij certyfikat do #wyniki-egzaminów ===
    const certEmbed = new EmbedBuilder()
      .setColor(KATEGORIA_COLORS[kategoria] || 0x5865F2)
      .setTitle('🪪 Prawo jazdy — Certyfikat zdania egzaminu')
      .setDescription(`Gratulacje! Poniższy gracz zdał egzamin na prawo jazdy.`)
      .addFields(
        { name: '👤 Kierowca', value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
        { name: '🎮 Roblox', value: dbUser.robloxUsername || `ID: ${dbUser.robloxId}`, inline: true },
        { name: '🪪 Kategoria', value: `**${kategoria}**`, inline: true },
        { name: '👮 Egzaminator', value: `<@${examinator.id}>`, inline: true },
        { name: '📅 Data wydania', value: `<t:${Math.floor(Date.now() / 1000)}:D>`, inline: true },
        { name: '🏷️ Rola', value: roleGiven ? `✅ Nadano \`${roleName}\`` : '⚠️ Nie udało się nadać roli', inline: true },
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Greenville RP — Wydział Komunikacji' })
      .setTimestamp();

    try {
      const wynikiChannel = guild.channels.cache.find(
        c => c.name === 'wyniki-egzaminów' && c.isTextBased()
      );
      if (wynikiChannel) {
        await wynikiChannel.send({ embeds: [certEmbed] });
      } else {
        logger.warn('Nie znaleziono kanału #wyniki-egzaminów');
      }
    } catch (err) {
      logger.error('Błąd wysyłania certyfikatu do #wyniki-egzaminów:', err.message);
    }

    // === 6. Wyślij DM do gracza ===
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(KATEGORIA_COLORS[kategoria] || 0x5865F6)
        .setTitle('🎉 Otrzymałeś prawo jazdy!')
        .setDescription(
          `Gratulacje! Zdałeś egzamin i otrzymałeś prawo jazdy **kategorii ${kategoria}** na serwerze **${guild.name}**.\n\n` +
          `Możesz teraz legalnie poruszać się pojazdami tej kategorii w grze.`
        )
        .addFields(
          { name: '🪪 Kategoria', value: `**${kategoria}**`, inline: true },
          { name: '👮 Egzaminator', value: examinator.tag, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
        )
        .setFooter({ text: 'Greenville RP — Wydział Komunikacji' })
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (err) {
      // DM może być zablokowane przez ustawienia prywatności gracza
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag}: ${err.message}`);
    }

    // === 7. Log do #logi-weryfikacji ===
    try {
      const logEmbed = new EmbedBuilder()
        .setColor(0x22C55E)
        .setTitle('📋 Log — Wydanie prawa jazdy')
        .addFields(
          { name: 'Akcja', value: '`WYDANIE_PJ`', inline: true },
          { name: 'Gracz', value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
          { name: 'Kategoria', value: `\`${kategoria}\``, inline: true },
          { name: 'Egzaminator', value: `<@${examinator.id}> (\`${examinator.tag}\`)`, inline: true },
          { name: 'Rola nadana', value: roleGiven ? '✅ Tak' : '❌ Nie', inline: true },
          { name: 'ID licencji', value: `\`${license.id}\``, inline: false },
        )
        .setFooter({ text: `Greenville RP — Logi` })
        .setTimestamp();

      await logger.botLog(prisma, client, guild.id, 'logi-weryfikacji', logEmbed);
    } catch (err) {
      logger.error('Błąd zapisu logu:', err.message);
    }

    // === Odpowiedź potwierdzająca dla staffu ===
    await interaction.editReply({
      content:
        `✅ **Prawo jazdy wydane pomyślnie!**\n\n` +
        `Gracz: <@${targetUser.id}>\n` +
        `Kategoria: **${kategoria}**\n` +
        `Rola: ${roleGiven ? `✅ \`${roleName}\` nadana` : '⚠️ Roli nie udało się nadać'}\n` +
        `Certyfikat wysłany do #wyniki-egzaminów`,
    });
  },
};
