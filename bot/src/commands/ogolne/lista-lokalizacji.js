// Komenda /lista-lokalizacji — przegląd wszystkich aktywnych lokalizacji IC postaci
// Wyświetla w jednym embedzie wszystkie lokalizacje ustawione przez /lokalizacja ustaw.
// Niezbędne dla koordynatorów sesji, taksówkarzy, EMS i patroli szukających graczy na mapie.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { locationMap } = require('../../utils/locationStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-lokalizacji')
    .setDescription('Wyświetl wszystkie aktywne lokalizacje IC postaci na serwerze'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z tej komendy.',
      });
    }

    if (locationMap.size === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📍 Lista lokalizacji IC')
            .setDescription(
              '> Żadna postać nie ma aktualnie ustawionej lokalizacji IC.\n\n' +
              '*Gracze mogą ustawić lokalizację używając `/lokalizacja ustaw`.*'
            )
            .setFooter({ text: 'AURORA Greenville RP — Lokalizacje IC' })
            .setTimestamp(),
        ],
      });
    }

    // Posortuj po czasie — najświeższe aktualizacje na górze
    const entries = [...locationMap.entries()].sort(
      ([, a], [, b]) => b.updatedAt - a.updatedAt
    );

    const MAX_DISPLAY = 20;
    const shown  = entries.slice(0, MAX_DISPLAY);
    const hidden = entries.length - shown.length;

    const lines = shown.map(([discordId, entry]) => {
      const ts = Math.floor(entry.updatedAt / 1000);
      return `📍 **${entry.icName}** — ${entry.lokalizacja}\n<@${discordId}> · <t:${ts}:R>`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle(`📍 Aktywne lokalizacje IC — ${entries.length} postać/postaci`)
      .setDescription(lines.join('\n\n'))
      .setFooter({ text: `Łącznie aktywnych lokalizacji: ${locationMap.size} · AURORA Greenville RP` })
      .setTimestamp();

    if (hidden > 0) {
      embed.addFields({
        name:  '⚠️ Uwaga',
        value: `Wyświetlono ${MAX_DISPLAY} z ${entries.length} wpisów (posortowane od najnowszej aktualizacji).`,
        inline: false,
      });
    }

    logger.info(
      `/lista-lokalizacji | ${interaction.user.tag} | wyswietlono=${shown.length}/${entries.length}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
