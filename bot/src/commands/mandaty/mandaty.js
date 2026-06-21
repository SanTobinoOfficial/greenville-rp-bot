// Komenda /mandaty lista — gracz sprawdza własne aktywne mandaty, grzywny i areszty
// Naprawia martwe odwołanie w embedzie #moje-mandaty (refresh-all-embeds.js linia 153)
// Dostępna dla: Mieszkaniec+
// Pełna historia: /historia-mandatów (wymaga podania siebie jako gracza)

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

function progressBar(count, max) {
  const filled = Math.min(count, max);
  const blocks = Math.round((filled / max) * 8);
  return `${'🟥'.repeat(blocks)}${'⬜'.repeat(8 - blocks)} **${count}/${max}**`;
}

function formatEntries(entries, emoji) {
  if (entries.length === 0) return '*Brak aktywnych wpisów.*';
  return entries.slice(0, 4).map(f => {
    const ts    = Math.floor(f.createdAt.getTime() / 1000);
    const kwota = f.amount ? ` — **${f.amount.toLocaleString('pl-PL')} zł**` : '';
    return `${emoji} <t:${ts}:d>${kwota}\n> ${f.reason.slice(0, 90)}`;
  }).join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mandaty')
    .setDescription('Sprawdź swoje aktywne mandaty, grzywny i areszty')
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Pokaż swoje aktywne mandaty, grzywny i areszty (Mieszkaniec+)')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby sprawdzić swoje mandaty.',
      });
    }

    const dbUser = await prisma.user.findUnique({
      where:  { discordId: interaction.user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: '❌ Nie jesteś zarejestrowany/a w systemie. Przejdź weryfikację.',
      });
    }

    let fines, settings;
    try {
      [fines, settings] = await Promise.all([
        prisma.fine.findMany({
          where:   { targetId: dbUser.id, active: true },
          orderBy: { createdAt: 'desc' },
          select:  { type: true, amount: true, reason: true, createdAt: true },
        }),
        prisma.settings.findUnique({
          where:  { id: 'global' },
          select: { maxMandaty: true, maxGrzywny: true, maxAreszty: true },
        }),
      ]);
    } catch (err) {
      logger.error(`/mandaty lista: błąd DB dla ${interaction.user.tag}:`, err.message);
      return interaction.editReply({ content: '❌ Błąd bazy danych. Spróbuj ponownie.' });
    }

    const maxMandaty = settings?.maxMandaty ?? 10;
    const maxGrzywny = settings?.maxGrzywny ?? 5;
    const maxAreszty = settings?.maxAreszty ?? 5;

    const activeMandaty = fines.filter(f => f.type === 'MANDAT');
    const activeGrzywny = fines.filter(f => f.type === 'GRZYWNA');
    const activeAreszty = fines.filter(f => f.type === 'ARESZT');

    const overLimit =
      activeMandaty.length >= maxMandaty ||
      activeGrzywny.length >= maxGrzywny ||
      activeAreszty.length >= maxAreszty;

    const anyActive = fines.length > 0;

    const color = overLimit ? COLORS.error : anyActive ? COLORS.warning : COLORS.success;

    const desc = overLimit
      ? '🚨 **Przekroczyłeś/aś limit — prawo jazdy zostało zawieszone!**\nSkontaktuj się z administracją lub Policją.'
      : anyActive
        ? 'Masz aktywne wpisy w rejestrze DMV. Limit skutkuje zawieszeniem prawa jazdy.\nAby odwołać mandat, skontaktuj się ze Staffem.'
        : '✅ Nie masz żadnych aktywnych mandatów, grzywien ani aresztów.';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('📜 Twoje mandaty i grzywny')
      .setDescription(desc)
      .addFields(
        {
          name:   `🚔 Mandaty — ${progressBar(activeMandaty.length, maxMandaty)}`,
          value:  formatEntries(activeMandaty, '🚔'),
          inline: false,
        },
        {
          name:   `⚖️ Grzywny sądowe — ${progressBar(activeGrzywny.length, maxGrzywny)}`,
          value:  formatEntries(activeGrzywny, '⚖️'),
          inline: false,
        },
        {
          name:   `🔒 Areszty — ${progressBar(activeAreszty.length, maxAreszty)}`,
          value:  formatEntries(activeAreszty, '🔒'),
          inline: false,
        },
      )
      .setFooter({ text: 'AURORA Greenville RP — DMV | Pełna historia: /historia-mandatów' })
      .setTimestamp();

    logger.info(
      `/mandaty lista | ${interaction.user.tag} | M:${activeMandaty.length}/${maxMandaty} G:${activeGrzywny.length}/${maxGrzywny} A:${activeAreszty.length}/${maxAreszty}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
