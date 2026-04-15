// Przycisk "Przejdź do quizu"
// Generuje token quizu i wysyła link w DM

const { EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    // Sprawdź czy ma zweryfikowany nick Roblox
    if (!user?.robloxId) {
      return interaction.editReply({
        content: '❌ Najpierw zweryfikuj swój nick Roblox (przycisk "🔍 Zweryfikuj nick Roblox").',
      });
    }

    // Sprawdź czy jest już zweryfikowany jako Mieszkaniec
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const hasRole = member.roles.cache.some(r => r.name === 'Mieszkaniec');
    if (hasRole) {
      return interaction.editReply({
        content: '✅ Jesteś już zweryfikowany! Masz rolę **Mieszkaniec**.',
      });
    }

    // Sprawdź cooldown
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const cooldownHours = settings?.quizCooldownHours || 24;

    if (user.quizLastAttempt) {
      const cooldownMs = cooldownHours * 60 * 60 * 1000;
      const elapsed = Date.now() - user.quizLastAttempt.getTime();
      if (elapsed < cooldownMs) {
        const nextAttempt = new Date(user.quizLastAttempt.getTime() + cooldownMs);
        return interaction.editReply({
          content: `⏳ Możesz podejść do quizu ponownie <t:${Math.floor(nextAttempt.getTime() / 1000)}:R>.`,
        });
      }
    }

    // Unieważnij poprzednie tokeny
    await prisma.quizToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Wygeneruj nowy token (ważny 30 minut)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.quizToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const dashboardUrl = process.env.NEXTAUTH_URL || 'https://localhost:3000';
    const quizUrl = `${dashboardUrl}/quiz/${token}`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📋 Link do quizu weryfikacyjnego')
      .setDescription(
        `Twój link do quizu jest gotowy!\n\n` +
        `🔗 **[Kliknij tutaj aby rozpocząć quiz](${quizUrl})**\n\n` +
        `⏱️ Link wygasa za **30 minut**.\n` +
        `📝 Quiz zawiera **10 pytań** z regulaminu.\n` +
        `✅ Potrzebujesz min. **6/10** punktów.\n` +
        `🏆 Wynik **8+/10** = pełna weryfikacja bez ostrzeżenia.`
      )
      .setFooter({ text: 'AURORA Greenville RP — Quiz weryfikacyjny' })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply({
        content: '✅ Wysłano link do quizu w wiadomości prywatnej! Sprawdź DM.',
      });
    } catch {
      // DM zablokowane — wyślij link bezpośrednio (ephemeral)
      await interaction.editReply({
        embeds: [embed],
      });
    }

    logger.info(`Token quizu wygenerowany dla ${interaction.user.tag}: ${token}`);
  },
};
