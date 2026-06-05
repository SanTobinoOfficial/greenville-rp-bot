// Komenda /moje-prawo-jazdy — gracz sprawdza własne licencje
// Pokazuje wszystkie kategorie: aktywne, zawieszone (z powodem i datą), unieważnione
// Dostępna dla: Mieszkaniec+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const STATUS_DISPLAY = {
  ACTIVE:    { icon: '✅', label: 'Aktywna',      color: COLORS.success },
  SUSPENDED: { icon: '⏸️', label: 'Zawieszona',   color: COLORS.warning },
  REVOKED:   { icon: '❌', label: 'Unieważniona', color: COLORS.error },
};

const CATEGORY_LABELS = {
  AM: '🛵 AM — Motorower',
  A1: '🏍️ A1 — Motocykl 125 cm³',
  A2: '🏍️ A2 — Motocykl 35 kW',
  A:  '🏍️ A — Motocykl bez ograniczeń',
  B:  '🚗 B — Samochód osobowy',
  C:  '🚚 C — Pojazd ciężarowy',
  D:  '🚌 D — Autobus',
  T:  '🚜 T — Ciągnik rolniczy',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moje-prawo-jazdy')
    .setDescription('Sprawdź swoje prawa jazdy — kategorie, statusy i zawieszenia'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić swoje prawa jazdy.',
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: {
        licenses: { orderBy: { issuedAt: 'asc' } },
      },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: '❌ Nie jesteś zarejestrowany/a w systemie. Przejdź weryfikację aby uzyskać konto.',
      });
    }

    const licenses = dbUser.licenses;

    if (licenses.length === 0) {
      return interaction.editReply({
        content: '📋 Nie posiadasz żadnych praw jazdy. Przejdź egzamin w kanale **#prawa-jazdy**.',
      });
    }

    const now = Date.now();
    const active    = licenses.filter(l => l.status === 'ACTIVE');
    const suspended = licenses.filter(l => l.status === 'SUSPENDED');
    const revoked   = licenses.filter(l => l.status === 'REVOKED');

    // Wybierz kolor embeda według najgorszego stanu
    let embedColor = COLORS.success;
    if (revoked.length > 0)   embedColor = COLORS.error;
    else if (suspended.length > 0) embedColor = COLORS.warning;

    const fields = [];

    if (active.length > 0) {
      fields.push({
        name: `✅ Aktywne (${active.length})`,
        value: active
          .map(l => `**${CATEGORY_LABELS[l.kategoria] ?? l.kategoria}**\nWydane: <t:${Math.floor(new Date(l.issuedAt).getTime() / 1000)}:D>`)
          .join('\n\n'),
        inline: false,
      });
    }

    if (suspended.length > 0) {
      fields.push({
        name: `⏸️ Zawieszone (${suspended.length})`,
        value: suspended.map(l => {
          const until = l.suspendedUntil
            ? `<t:${Math.floor(new Date(l.suspendedUntil).getTime() / 1000)}:R>`
            : 'bezterminowo';
          const expired = l.suspendedUntil && new Date(l.suspendedUntil).getTime() < now;
          const timeStr = expired ? '*(wkrótce przywrócone)*' : `Przywrócenie: ${until}`;
          const reason  = l.suspendedReason ? `Powód: ${l.suspendedReason}` : '';
          return `**${CATEGORY_LABELS[l.kategoria] ?? l.kategoria}**\n${timeStr}${reason ? `\n${reason}` : ''}`;
        }).join('\n\n'),
        inline: false,
      });
    }

    if (revoked.length > 0) {
      fields.push({
        name: `❌ Unieważnione (${revoked.length})`,
        value: revoked
          .map(l => `**${CATEGORY_LABELS[l.kategoria] ?? l.kategoria}**`)
          .join('\n'),
        inline: false,
      });
    }

    const summary = [
      active.length    > 0 ? `✅ Aktywne: **${active.length}**`    : null,
      suspended.length > 0 ? `⏸️ Zawieszone: **${suspended.length}**` : null,
      revoked.length   > 0 ? `❌ Unieważnione: **${revoked.length}**` : null,
    ].filter(Boolean).join(' · ');

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('🪪 Moje Prawa Jazdy')
      .setDescription(summary)
      .addFields(fields)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'AURORA Greenville RP — Prawa Jazdy' })
      .setTimestamp();

    logger.info(`/moje-prawo-jazdy: ${interaction.user.tag} — ${licenses.length} licencji`);
    await interaction.editReply({ embeds: [embed] });
  },
};
