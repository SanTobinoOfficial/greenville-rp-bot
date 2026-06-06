// Komenda /lista-stanow — przegląd wszystkich aktywnych stanów RP postaci
// Wyświetla w jednym embedzie kto ma aktywny stan IC (ranny, aresztowany itd.)
// Niezbędne dla EMS i Policji przy koordynacji działań podczas sesji RP.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { statusMap } = require('../../utils/characterStateStore');

// Priorytety wyświetlania — stany alarmowe na górze
const PRIORITY = {
  ciezko_ranny:  0,
  nieprzytomny:  1,
  ranny:         2,
  ranny_lekko:   3,
  aresztowany:   4,
  zatrzymany:    5,
  ok:            6,
  niedostepny:   7,
};

// Stany wymagające pilnej interwencji (EMS/Policja)
const ALERT_KEYS = new Set(['ciezko_ranny', 'nieprzytomny', 'ranny', 'aresztowany', 'zatrzymany']);

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-stanow')
    .setDescription('Wyświetl wszystkie aktywne stany RP postaci (EMS / Policja / ogólnie)')
    .addBooleanOption(opt =>
      opt
        .setName('tylko-alarmowe')
        .setDescription('Pokaż tylko stany wymagające interwencji (ranny, aresztowany itp.) — domyślnie: nie')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const tylkoAlarmowe = interaction.options.getBoolean('tylko-alarmowe') ?? false;

    if (statusMap.size === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📋 Lista stanów RP')
            .setDescription(
              '> Żadna postać nie ma aktualnie ustawionego stanu RP.\n\n' +
              '*Gracze mogą ustawić stan używając `/stan-postaci ustaw`.*'
            )
            .setFooter({ text: 'AURORA Greenville RP — Stany RP' })
            .setTimestamp(),
        ],
      });
    }

    // Zbierz wpisy, opcjonalnie filtruj
    let entries = [...statusMap.entries()];
    if (tylkoAlarmowe) {
      entries = entries.filter(([, e]) => ALERT_KEYS.has(e.stanKey));
    }

    if (entries.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('📋 Lista stanów RP — brak alarmowych')
            .setDescription(
              '> Nie ma aktualnie żadnych postaci wymagających interwencji.\n\n' +
              `*Łącznie aktywnych stanów: **${statusMap.size}** (użyj bez opcji \`tylko-alarmowe\` aby zobaczyć wszystkie)*`
            )
            .setFooter({ text: 'AURORA Greenville RP — Stany RP' })
            .setTimestamp(),
        ],
      });
    }

    // Posortuj wg priorytetu, potem po czasie (najświeższe wyżej w obrębie priorytetu)
    entries.sort(([, a], [, b]) => {
      const pa = PRIORITY[a.stanKey] ?? 99;
      const pb = PRIORITY[b.stanKey] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.updatedAt - a.updatedAt;
    });

    // Zbuduj linie — max 20 wpisów w jednym embedzie (limit pola)
    const MAX_DISPLAY = 20;
    const shown  = entries.slice(0, MAX_DISPLAY);
    const hidden = entries.length - shown.length;

    const lines = shown.map(([discordId, entry]) => {
      const ts      = Math.floor(entry.updatedAt / 1000);
      const details = entry.szczegoly ? ` — *${entry.szczegoly}*` : '';
      const alert   = ALERT_KEYS.has(entry.stanKey) ? '' : ' ';
      return `${entry.stanData.emoji} **${entry.icName}** — ${entry.stanData.label}${details}\n` +
             `${alert}<@${discordId}> · <t:${ts}:R>`;
    });

    // Pogrupuj statystyki według stanu
    const counts = entries.reduce((acc, [, e]) => {
      acc[e.stanKey] = (acc[e.stanKey] ?? 0) + 1;
      return acc;
    }, {});
    const statsLine = Object.entries(counts)
      .sort(([a], [b]) => (PRIORITY[a] ?? 99) - (PRIORITY[b] ?? 99))
      .map(([key, count]) => {
        const entry = entries.find(([, e]) => e.stanKey === key)?.[1];
        return `${entry?.stanData.emoji ?? '❓'} ${entry?.stanData.label ?? key}: **${count}**`;
      })
      .join('\n');

    const totalActive = statusMap.size;
    const alertCount  = [...statusMap.values()].filter(e => ALERT_KEYS.has(e.stanKey)).length;
    const embedColor  = alertCount > 0 ? COLORS.error : COLORS.success;

    const titlePrefix = tylkoAlarmowe ? '🚨 Stany alarmowe' : '📋 Wszystkie stany RP';
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`${titlePrefix} — ${entries.length} postać/postaci`)
      .setDescription(lines.join('\n\n'));

    if (statsLine) {
      embed.addFields({ name: '📊 Podsumowanie', value: statsLine, inline: false });
    }

    if (hidden > 0) {
      embed.addFields({
        name:  '⚠️ Uwaga',
        value: `Wyświetlono ${MAX_DISPLAY} z ${entries.length} wpisów. Użyj opcji \`tylko-alarmowe\` aby zawęzić wyniki.`,
        inline: false,
      });
    }

    const footerParts = [`Łącznie aktywnych: ${totalActive}`];
    if (!tylkoAlarmowe && alertCount > 0) {
      footerParts.push(`Alarmowych: ${alertCount}`);
    }
    footerParts.push('AURORA Greenville RP — Stany RP');

    embed
      .setFooter({ text: footerParts.join(' · ') })
      .setTimestamp();

    logger.info(
      `/lista-stanow | ${interaction.user.tag} | tylkoAlarmowe=${tylkoAlarmowe} | ` +
      `wyswietlono=${shown.length} / ${entries.length} (total store: ${totalActive})`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
