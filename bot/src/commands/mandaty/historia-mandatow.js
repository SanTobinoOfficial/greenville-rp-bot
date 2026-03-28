// Komenda /historia-mandatów — podgląd historii mandatów gracza
// Dostępna dla: Staff (Helper+) lub sam gracz dla siebie

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historia-mandatów')
    .setDescription('Sprawdź historię mandatów gracza')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz którego historię chcesz sprawdzić')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const targetUser = interaction.options.getUser('gracz');

    // Sprawdzenie uprawnień — Staff lub sam gracz
    const isSelf = targetUser.id === interaction.user.id;
    if (!isSelf && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Możesz sprawdzać tylko swoją własną historię mandatów. Wymagane uprawnienia Staff (Helper+) do sprawdzania innych graczy.',
      });
    }

    // Pobranie gracza z bazy
    const targetDbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
      include: {
        finesReceived: {
          orderBy: { createdAt: 'desc' },
          include: { issuer: true },
        },
      },
    });

    if (!targetDbUser) {
      return interaction.editReply({
        content: `❌ Gracz ${targetUser} nie jest zarejestrowany w systemie RP.`,
      });
    }

    // Pobranie ustawień (limity)
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const maxMandaty = settings?.maxMandaty || 10;
    const maxGrzywny = settings?.maxGrzywny || 5;
    const maxAreszty = settings?.maxAreszty || 5;

    const allFines = targetDbUser.finesReceived;

    // Podział na typy
    const mandaty = allFines.filter(f => f.type === 'MANDAT');
    const grzywny = allFines.filter(f => f.type === 'GRZYWNA');
    const areszty = allFines.filter(f => f.type === 'ARESZT');

    // Zliczenie aktywnych
    const activeMandaty = mandaty.filter(f => f.active).length;
    const activeGrzywny = grzywny.filter(f => f.active).length;
    const activeAreszty = areszty.filter(f => f.active).length;

    // Formatowanie listy mandatów (pokazujemy max 5 ostatnich z każdego typu)
    function formatFineList(fines, emoji) {
      if (fines.length === 0) return '*Brak wpisów*';
      return fines.slice(0, 5).map(f => {
        const data = `<t:${Math.floor(new Date(f.createdAt).getTime() / 1000)}:d>`;
        const kwota = f.amount ? ` — **${f.amount.toLocaleString('pl-PL')} zł**` : '';
        const status = f.active ? '🟢' : '🔴';
        return `${status} ${emoji} ${data}${kwota}\n> ${f.reason}`;
      }).join('\n');
    }

    // Pasek progresu tekstowy
    function progressBar(current, max) {
      const filled = Math.min(current, max);
      const pct = Math.round((filled / max) * 10);
      const bar = '█'.repeat(pct) + '░'.repeat(10 - pct);
      return `\`${bar}\` ${current}/${max}`;
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.rp)
      .setTitle(`📋 Historia mandatów — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name: '📊 Podsumowanie aktywnych',
          value: [
            `🚔 Mandaty:  ${progressBar(activeMandaty, maxMandaty)}`,
            `💰 Grzywny:  ${progressBar(activeGrzywny, maxGrzywny)}`,
            `⛓️ Areszty:  ${progressBar(activeAreszty, maxAreszty)}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: `🚔 Mandaty (${mandaty.length} łącznie, ${activeMandaty} aktywnych)`,
          value: formatFineList(mandaty, '🚔'),
          inline: false,
        },
        {
          name: `💰 Grzywny (${grzywny.length} łącznie, ${activeGrzywny} aktywnych)`,
          value: formatFineList(grzywny, '💰'),
          inline: false,
        },
        {
          name: `⛓️ Areszty (${areszty.length} łącznie, ${activeAreszty} aktywnych)`,
          value: formatFineList(areszty, '⛓️'),
          inline: false,
        }
      )
      .setFooter({ text: `Greenville RP — Historia mandatów • Łącznie: ${allFines.length} wpisów` })
      .setTimestamp();

    // Ostrzeżenie przy bliskim limicie
    const warnings = [];
    if (activeMandaty >= maxMandaty) warnings.push(`🚨 Przekroczono limit mandatów!`);
    else if (activeMandaty >= maxMandaty - 2) warnings.push(`⚠️ Zbliżasz się do limitu mandatów (${activeMandaty}/${maxMandaty})`);
    if (activeGrzywny >= maxGrzywny) warnings.push(`🚨 Przekroczono limit grzywien!`);
    else if (activeGrzywny >= maxGrzywny - 1) warnings.push(`⚠️ Zbliżasz się do limitu grzywien (${activeGrzywny}/${maxGrzywny})`);
    if (activeAreszty >= maxAreszty) warnings.push(`🚨 Przekroczono limit aresztów!`);
    else if (activeAreszty >= maxAreszty - 1) warnings.push(`⚠️ Zbliżasz się do limitu aresztów (${activeAreszty}/${maxAreszty})`);

    if (warnings.length > 0) {
      embed.addFields({
        name: '⚠️ Ostrzeżenia',
        value: warnings.join('\n'),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
