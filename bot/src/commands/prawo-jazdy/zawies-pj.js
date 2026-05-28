// Komenda /zawieś-pj — tymczasowe zawieszenie prawa jazdy
// Ustawia status SUSPENDED z datą przywrócenia, usuwa rolę, wysyła DM
// Automatyczne przywrócenie obsługuje caseExpirer (co 10 minut)
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const LICENSE_CATEGORIES = [
  { name: 'AM — Motorower',              value: 'AM' },
  { name: 'A1 — Motocykl 125 cm³',       value: 'A1' },
  { name: 'A2 — Motocykl 35 kW',         value: 'A2' },
  { name: 'A — Motocykl bez ograniczeń', value: 'A' },
  { name: 'B — Samochód osobowy',        value: 'B' },
  { name: 'C — Pojazd ciężarowy',        value: 'C' },
  { name: 'D — Autobus',                 value: 'D' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zawieś-pj')
    .setDescription('Tymczasowo zawieś prawo jazdy gracza [Moderator+]')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz, któremu zawieszasz prawo jazdy')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('kategoria')
        .setDescription('Kategoria prawa jazdy do zawieszenia')
        .setRequired(true)
        .addChoices(...LICENSE_CATEGORIES)
    )
    .addStringOption(opt =>
      opt.setName('powód')
        .setDescription('Powód zawieszenia prawa jazdy')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(500)
    )
    .addIntegerOption(opt =>
      opt.setName('dni')
        .setDescription('Czas zawieszenia w dniach (domyślnie: wartość z ustawień serwera)')
        .setMinValue(1)
        .setMaxValue(365)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isMod(interaction.member)) {
      return interaction.reply(noPermissionReply('Moderator'));
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');
    const kategoria  = interaction.options.getString('kategoria');
    const powod      = interaction.options.getString('powód');
    const moderator  = interaction.user;
    const guild      = interaction.guild;

    // === 1. Pobierz domyślny czas zawieszenia z ustawień serwera ===
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const defaultDays = settings?.licenseSuspensionDays ?? 30;
    const dni = interaction.options.getInteger('dni') ?? defaultDays;

    // === 2. Pobierz użytkownika z bazy ===
    const dbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie jest zarejestrowany w systemie.`,
      });
    }

    // === 3. Pobierz licencję ===
    const license = await prisma.license.findUnique({
      where: { userId_kategoria: { userId: dbUser.id, kategoria } },
    });

    if (!license) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie posiada prawa jazdy **kategorii ${kategoria}** w systemie.`,
      });
    }

    if (license.status === 'SUSPENDED') {
      const untilTs = license.suspendedUntil
        ? `<t:${Math.floor(new Date(license.suspendedUntil).getTime() / 1000)}:D>`
        : 'bezterminowo';
      return interaction.editReply({
        content: `⚠️ Prawo jazdy **kategorii ${kategoria}** gracza <@${targetUser.id}> jest już zawieszone (do ${untilTs}).`,
      });
    }

    if (license.status === 'REVOKED') {
      return interaction.editReply({
        content: `❌ Prawo jazdy **kategorii ${kategoria}** gracza <@${targetUser.id}> zostało już unieważnione — nie można go zawiesić.`,
      });
    }

    // === 4. Ustaw SUSPENDED w bazie ===
    const now        = new Date();
    const suspendedUntil = new Date(now.getTime() + dni * 86_400_000);

    try {
      await prisma.license.update({
        where: { id: license.id },
        data: {
          status:          'SUSPENDED',
          suspendedAt:     now,
          suspendedUntil,
          suspendedReason: powod,
        },
      });
    } catch (err) {
      logger.error('Błąd aktualizacji licencji (zawieś-pj):', err.message);
      return interaction.editReply({ content: '❌ Błąd bazy danych podczas zawieszania licencji.' });
    }

    // === 5. Usuń rolę @Kat. [X] ===
    const roleName   = `Kat. ${kategoria}`;
    let   roleRemoved = false;

    try {
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      const role   = guild.roles.cache.find(r => r.name === roleName);

      if (member && role && member.roles.cache.has(role.id)) {
        await member.roles.remove(
          role,
          `Zawieszenie PJ kat. ${kategoria} przez ${moderator.tag} — ${powod}`
        );
        roleRemoved = true;
        logger.info(`Usunięto rolę "${roleName}" graczowi ${targetUser.tag} (zawieś-pj)`);
      }
    } catch (err) {
      logger.error(`Błąd usuwania roli "${roleName}" (zawieś-pj):`, err.message);
    }

    // === 6. DM do gracza ===
    const untilTs = Math.floor(suspendedUntil.getTime() / 1000);
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xF59E0B)
            .setTitle('⏸️ Prawo jazdy zawieszone')
            .setDescription(
              `Twoje prawo jazdy **kategorii ${kategoria}** na serwerze **${guild.name}** zostało tymczasowo zawieszone.`
            )
            .addFields(
              { name: '🪪 Kategoria',    value: `**${kategoria}**`,               inline: true },
              { name: '👮 Moderator',    value: moderator.tag,                    inline: true },
              { name: '⏰ Wygasa',       value: `<t:${untilTs}:F> (<t:${untilTs}:R>)`, inline: false },
              { name: '📝 Powód',        value: powod,                            inline: false },
              { name: 'ℹ️ Informacja',   value: 'Prawo jazdy zostanie automatycznie przywrócone po upływie okresu zawieszenia. W razie odwołania skontaktuj się z administracją przez ticket.', inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Wydział Komunikacji' })
            .setTimestamp(),
        ],
      });
    } catch {
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag} (zawieś-pj)`);
    }

    // === 7. Log do #logi-weryfikacji ===
    try {
      const logEmbed = new EmbedBuilder()
        .setColor(0xF59E0B)
        .setTitle('📋 Log — Zawieszenie prawa jazdy')
        .addFields(
          { name: 'Akcja',            value: '`ZAWIESZENIE_PJ`',                                        inline: true },
          { name: 'Gracz',            value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`,              inline: true },
          { name: 'Kategoria',        value: `\`${kategoria}\``,                                         inline: true },
          { name: 'Moderator',        value: `<@${moderator.id}> (\`${moderator.tag}\`)`,                inline: true },
          { name: 'Rola usunięta',    value: roleRemoved ? '✅ Tak' : '❌ Nie',                          inline: true },
          { name: 'Czas (dni)',        value: `\`${dni}\``,                                              inline: true },
          { name: 'Wygasa',           value: `<t:${untilTs}:F>`,                                        inline: false },
          { name: 'Powód',            value: powod,                                                      inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — Logi' })
        .setTimestamp();

      await logger.botLog(prisma, client, guild.id, 'logi-weryfikacji', logEmbed);
    } catch (err) {
      logger.error('Błąd zapisu logu zawieszenia PJ:', err.message);
    }

    // === 8. Potwierdzenie dla moderatora ===
    await interaction.editReply({
      content:
        `✅ **Prawo jazdy zawieszone!**\n\n` +
        `Gracz: <@${targetUser.id}>\n` +
        `Kategoria: **${kategoria}**\n` +
        `Zawieszone do: <t:${untilTs}:F> (<t:${untilTs}:R>)\n` +
        `Rola \`${roleName}\`: ${roleRemoved ? '✅ Usunięta' : '⚠️ Nie udało się usunąć'}\n` +
        `Powód: ${powod}\n\n` +
        `Prawo jazdy zostanie automatycznie przywrócone po ${dni} dniach. Gracz poinformowany przez DM.`,
    });

    logger.info(
      `Moderator ${moderator.tag} zawiesił PJ kat. ${kategoria} graczowi ${targetUser.tag} na ${dni} dni — powód: ${powod}`
    );
  },
};
