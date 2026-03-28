// Komenda /sprawdź-prawo-jazdy — wyświetla wszystkie licencje gracza
// Wymagane uprawnienia: Helper+
// Pokazuje aktywne, zawieszone (z powodem i datą) oraz unieważnione

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Ikony i etykiety statusów licencji
const STATUS_DISPLAY = {
  ACTIVE:    { icon: '✅', label: 'Aktywna',      color: 0x22C55E },
  SUSPENDED: { icon: '⏸️', label: 'Zawieszona',   color: 0xF59E0B },
  REVOKED:   { icon: '❌', label: 'Unieważniona', color: 0xEF4444 },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sprawdź-prawo-jazdy')
    .setDescription('Sprawdza wszystkie prawa jazdy wskazanego gracza [Staff]')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Gracz, którego prawa jazdy chcesz sprawdzić')
        .setRequired(true)
    ),

  /**
   * Wyświetla wszystkie licencje gracza wraz ze szczegółami zawieszeń
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction, client, prisma) {
    // === Weryfikacja uprawnień — wymagany Helper+ ===
    if (!isStaff(interaction.member)) {
      return interaction.reply(noPermissionReply('Helper'));
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('gracz');

    // === 1. Pobierz użytkownika wraz z licencjami z bazy ===
    const dbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        licenses: {
          orderBy: { issuedAt: 'asc' },
        },
      },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: `❌ Gracz <@${targetUser.id}> nie jest zarejestrowany w systemie.`,
      });
    }

    // === 2. Brak jakichkolwiek licencji ===
    if (!dbUser.licenses || dbUser.licenses.length === 0) {
      return interaction.editReply({
        content: `ℹ️ Gracz <@${targetUser.id}> nie posiada żadnych praw jazdy w systemie.`,
      });
    }

    // === 3. Budowanie embed z listą licencji ===
    // Zlicz statusy
    const activeCount    = dbUser.licenses.filter(l => l.status === 'ACTIVE').length;
    const suspendedCount = dbUser.licenses.filter(l => l.status === 'SUSPENDED').length;
    const revokedCount   = dbUser.licenses.filter(l => l.status === 'REVOKED').length;

    // Kolor embeda zależy od najgorszego statusu
    let embedColor = 0x22C55E; // zielony — wszystkie aktywne
    if (suspendedCount > 0) embedColor = 0xF59E0B; // żółty — są zawieszenia
    if (revokedCount > 0)   embedColor = 0xEF4444; // czerwony — są unieważnienia

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🪪 Prawa jazdy — ${targetUser.tag}`)
      .setDescription(
        `**Gracz:** <@${targetUser.id}>\n` +
        `**Roblox:** ${dbUser.robloxUsername || (dbUser.robloxId ? `ID: ${dbUser.robloxId}` : '❌ Niezweryfikowany')}\n\n` +
        `📊 Podsumowanie: ✅ ${activeCount} aktywnych | ⏸️ ${suspendedCount} zawieszonych | ❌ ${revokedCount} unieważnionych`
      )
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: 'Greenville RP — Wydział Komunikacji' })
      .setTimestamp();

    // Dodaj każdą licencję jako osobne pole
    for (const lic of dbUser.licenses) {
      const statusInfo = STATUS_DISPLAY[lic.status] || STATUS_DISPLAY.ACTIVE;
      const issuedTs   = Math.floor(new Date(lic.issuedAt).getTime() / 1000);

      let fieldValue = `${statusInfo.icon} **${statusInfo.label}**\nWydana: <t:${issuedTs}:D>`;

      // Dla zawieszonych — dołącz powód i daty
      if (lic.status === 'SUSPENDED') {
        if (lic.suspendedAt) {
          const suspendedTs = Math.floor(new Date(lic.suspendedAt).getTime() / 1000);
          fieldValue += `\n🔒 Zawieszona: <t:${suspendedTs}:D>`;
        }
        if (lic.suspendedUntil) {
          const untilTs = Math.floor(new Date(lic.suspendedUntil).getTime() / 1000);
          fieldValue += `\n⏰ Do: <t:${untilTs}:D> (<t:${untilTs}:R>)`;
        } else {
          fieldValue += `\n⏰ Bezterminowo`;
        }
        if (lic.suspendedReason) {
          // Ogranicza długość powodu aby nie przekroczyć limitu pola embeda
          const reason = lic.suspendedReason.length > 100
            ? lic.suspendedReason.substring(0, 97) + '...'
            : lic.suspendedReason;
          fieldValue += `\n📝 Powód: ${reason}`;
        }
      }

      // Dla unieważnionych — dołącz powód jeśli dostępny
      if (lic.status === 'REVOKED' && lic.suspendedReason) {
        const reason = lic.suspendedReason.length > 100
          ? lic.suspendedReason.substring(0, 97) + '...'
          : lic.suspendedReason;
        fieldValue += `\n📝 Powód unieważnienia: ${reason}`;
      }

      embed.addFields({
        name:   `Kategoria ${lic.kategoria}`,
        value:  fieldValue,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });

    logger.info(
      `Staff ${interaction.user.tag} sprawdził PJ gracza ${targetUser.tag} (${dbUser.licenses.length} licencji)`
    );
  },
};
