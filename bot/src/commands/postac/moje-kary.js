// Komenda /moje-kary — gracz sprawdza własne aktywne kary moderacyjne
// Pokazuje warnty i mute z powodem, datą i terminem wygaśnięcia.
// Moderator nie jest ujawniany (prywatność wewnętrzna).
// Dostępna dla: Mieszkaniec+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isVerified } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const TYPE_META = {
  WARN:  { emoji: '⚠️', label: 'Ostrzeżenie' },
  MUTE:  { emoji: '🔇', label: 'Wyciszenie'  },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('moje-kary')
    .setDescription('Sprawdź swoje aktywne ostrzeżenia i wyciszenia — powody i daty'),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Wymagana rola **Mieszkaniec** aby zobaczyć swoje kary.',
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      select: { id: true },
    });

    if (!dbUser) {
      return interaction.editReply({
        content: '❌ Nie jesteś zarejestrowany/a w systemie. Przejdź weryfikację.',
      });
    }

    // Pobierz aktywne warny i mute — bany pominięte (zbanowany nie może wejść)
    const cases = await prisma.case.findMany({
      where: {
        targetId: dbUser.id,
        status:   'ACTIVE',
        type:     { in: ['WARN', 'MUTE'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        caseNumber: true,
        type:       true,
        reason:     true,
        createdAt:  true,
        expiresAt:  true,
      },
    });

    // Zlicz wszystkie historyczne kary (dla kontekstu)
    const [totalWarns, totalMutes] = await Promise.all([
      prisma.case.count({ where: { targetId: dbUser.id, type: 'WARN' } }),
      prisma.case.count({ where: { targetId: dbUser.id, type: 'MUTE' } }),
    ]);

    const activeWarns = cases.filter(c => c.type === 'WARN').length;
    const activeMutes = cases.filter(c => c.type === 'MUTE').length;

    const embedColor = activeWarns > 0
      ? COLORS.warning
      : activeMutes > 0 ? COLORS.mod_mute : COLORS.success;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle('⚖️ Moje aktywne kary')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({ text: 'AURORA Greenville RP — Twoje kary • moderator nie jest ujawniany' })
      .setTimestamp();

    if (cases.length === 0) {
      embed
        .setColor(COLORS.success)
        .setDescription(
          '✅ **Nie masz żadnych aktywnych kar.**\n\n' +
          `Historycznie: ⚠️ warnów **${totalWarns}** · 🔇 wyciszeń **${totalMutes}**`
        );

      logger.info(`/moje-kary | ${interaction.user.tag} | brak aktywnych kar`);
      return interaction.editReply({ embeds: [embed] });
    }

    embed.setDescription(
      `Aktywne kary: ⚠️ **${activeWarns}** ostrzeżeń · 🔇 **${activeMutes}** wyciszeń\n` +
      `Historycznie łącznie: ⚠️ **${totalWarns}** · 🔇 **${totalMutes}**`
    );

    for (const c of cases) {
      const meta      = TYPE_META[c.type] ?? { emoji: '❓', label: c.type };
      const createdTs = Math.floor(c.createdAt.getTime() / 1000);

      let value = `${meta.emoji} **${meta.label}** · #${c.caseNumber}\n`;
      value    += `📅 Nadana: <t:${createdTs}:D> (<t:${createdTs}:R>)\n`;

      if (c.expiresAt) {
        const expTs    = Math.floor(c.expiresAt.getTime() / 1000);
        const expired  = c.expiresAt.getTime() < Date.now();
        value += expired
          ? `⏰ Wygaśnięcie: *(wkrótce archiwizacja)*\n`
          : `⏰ Wygasa: <t:${expTs}:D> (<t:${expTs}:R>)\n`;
      } else if (c.type === 'MUTE') {
        value += `⏰ Bezterminowo\n`;
      }

      const reason = c.reason.length > 200
        ? c.reason.substring(0, 197) + '...'
        : c.reason;
      value += `📝 Powód: ${reason}`;

      embed.addFields({ name: '​', value, inline: false });
    }

    // Informacja gdzie zgłosić apelację
    embed.addFields({
      name:   '📌 Chcesz odwołać się od kary?',
      value:  'Utwórz ticket kategorii **⚖️ Apelacja od kary** w kanale #support.',
      inline: false,
    });

    logger.info(
      `/moje-kary | ${interaction.user.tag} | aktywne: W:${activeWarns} M:${activeMutes}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
