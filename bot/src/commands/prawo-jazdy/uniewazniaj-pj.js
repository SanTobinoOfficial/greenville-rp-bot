// Komenda /unieważnij-pj — unieważnienie prawa jazdy gracza
// Wymagane uprawnienia: Administrator+
// Ustawia status REVOKED, usuwa rolę, wysyła DM i loguje akcję

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isAdmin, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unieważnij-pj')
    .setDescription('Unieważnia prawo jazdy gracza [Admin+]')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz, któremu unieważniasz prawo jazdy')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('kategoria')
        .setDescription('Kategoria prawa jazdy do unieważnienia')
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
    )
    .addStringOption(opt =>
      opt
        .setName('powód')
        .setDescription('Powód unieważnienia prawa jazdy')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(500)
    ),

  /**
   * Unieważnia prawo jazdy gracza — ustawia REVOKED, usuwa rolę, loguje
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, prisma) {
    // === Weryfikacja uprawnień — wymagany Administrator+ ===
    if (!isAdmin(interaction.member)) {
      return interaction.reply(noPermissionReply('Administrator'));
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');
    const kategoria  = interaction.options.getString('kategoria');
    const powod      = interaction.options.getString('powód');
    const moderator  = interaction.user;
    const guild      = interaction.guild;

    // === 1. Pobierz użytkownika z bazy ===
    const dbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie jest zarejestrowany w systemie.`,
      });
    }

    // === 2. Pobierz licencję z bazy ===
    const license = await prisma.license.findUnique({
      where: {
        userId_kategoria: { userId: dbUser.id, kategoria },
      },
    });

    if (!license) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie posiada prawa jazdy **kategorii ${kategoria}** w systemie.`,
      });
    }

    if (license.status === 'REVOKED') {
      return interaction.editReply({
        content: `⚠️ Prawo jazdy **kategorii ${kategoria}** gracza <@${targetUser.id}> jest już unieważnione.`,
      });
    }

    // === 3. Ustaw status REVOKED w bazie danych ===
    try {
      await prisma.license.update({
        where: { id: license.id },
        data: {
          status:          'REVOKED',
          suspendedAt:     new Date(),
          suspendedReason: powod,
          // Czyścimy suspendedUntil — unieważnienie jest bezterminowe
          suspendedUntil:  null,
        },
      });
    } catch (err) {
      logger.error('Błąd aktualizacji licencji w DB:', err.message);
      return interaction.editReply({ content: '❌ Błąd bazy danych podczas unieważniania licencji.' });
    }

    // === 4. Usuń rolę @Kat. [X] ===
    const roleName = `Kat. ${kategoria}`;
    let roleRemoved = false;

    try {
      const member = await guild.members.fetch(targetUser.id);
      const role = guild.roles.cache.find(r => r.name === roleName);

      if (role && member.roles.cache.has(role.id)) {
        await member.roles.remove(role, `Unieważnienie PJ kat. ${kategoria} przez ${moderator.tag} — ${powod}`);
        roleRemoved = true;
        logger.info(`Usunięto rolę "${roleName}" graczowi ${targetUser.tag}`);
      } else {
        logger.warn(`Gracz ${targetUser.tag} nie miał roli "${roleName}" lub rola nie istnieje`);
      }
    } catch (err) {
      logger.error(`Błąd usuwania roli "${roleName}":`, err.message);
    }

    // === 5. Wyślij DM do gracza ===
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌ Prawo jazdy unieważnione')
        .setDescription(
          `Twoje prawo jazdy **kategorii ${kategoria}** na serwerze **${guild.name}** zostało unieważnione.`
        )
        .addFields(
          { name: '🪪 Kategoria', value: `**${kategoria}**`, inline: true },
          { name: '👮 Administrator', value: moderator.tag, inline: true },
          { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
          { name: '📝 Powód', value: powod, inline: false },
        )
        .setFooter({ text: 'Greenville RP — Wydział Komunikacji | Jeśli uważasz to za błąd, skontaktuj się z administracją.' })
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
    } catch (err) {
      // DM może być zablokowane przez ustawienia prywatności gracza
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag}: ${err.message}`);
    }

    // === 6. Log do #logi-weryfikacji ===
    try {
      const logEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('📋 Log — Unieważnienie prawa jazdy')
        .addFields(
          { name: 'Akcja', value: '`UNIEWAŻNIENIE_PJ`', inline: true },
          { name: 'Gracz', value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, inline: true },
          { name: 'Kategoria', value: `\`${kategoria}\``, inline: true },
          { name: 'Administrator', value: `<@${moderator.id}> (\`${moderator.tag}\`)`, inline: true },
          { name: 'Rola usunięta', value: roleRemoved ? '✅ Tak' : '❌ Nie', inline: true },
          { name: 'ID licencji', value: `\`${license.id}\``, inline: true },
          { name: 'Powód', value: powod, inline: false },
        )
        .setFooter({ text: 'Greenville RP — Logi' })
        .setTimestamp();

      await logger.botLog(prisma, client, guild.id, 'logi-weryfikacji', logEmbed);
    } catch (err) {
      logger.error('Błąd zapisu logu unieważnienia:', err.message);
    }

    // === Potwierdzenie dla admina ===
    await interaction.editReply({
      content:
        `✅ **Prawo jazdy unieważnione!**\n\n` +
        `Gracz: <@${targetUser.id}>\n` +
        `Kategoria: **${kategoria}**\n` +
        `Rola \`${roleName}\`: ${roleRemoved ? '✅ Usunięta' : '⚠️ Nie udało się usunąć'}\n` +
        `Powód: ${powod}\n\n` +
        `Gracz został poinformowany przez DM.`,
    });

    logger.info(
      `Admin ${moderator.tag} unieważnił PJ kat. ${kategoria} graczowi ${targetUser.tag} — powód: ${powod}`
    );
  },
};
