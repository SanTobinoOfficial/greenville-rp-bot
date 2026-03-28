// Select menu podań na służby
// Generuje token podania i wysyła link do formularza

const { EmbedBuilder } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

module.exports = {
  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const position = interaction.values[0];

    // Sprawdź czy jest zweryfikowany
    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: {
        casesAsTarget: {
          where: { type: 'WARN', status: 'ACTIVE' },
        },
      },
    });

    if (!user?.robloxId) {
      return interaction.editReply({
        content: '❌ Musisz być zweryfikowany, aby składać podania.',
      });
    }

    // Sprawdź wiek konta Discord (min. 7 dni)
    const accountAge = Date.now() - interaction.user.createdTimestamp;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (accountAge < sevenDaysMs) {
      return interaction.editReply({
        content: '❌ Twoje konto Discord musi mieć minimum **7 dni**, aby składać podania.',
      });
    }

    // Sprawdź aktywne warny (>2 → auto-odrzucenie)
    const activeWarns = user.casesAsTarget.length;
    if (activeWarns > 2) {
      return interaction.editReply({
        content: `❌ Masz zbyt wiele aktywnych ostrzeżeń (**${activeWarns}/2** maks.). Podanie zostało automatycznie odrzucone.`,
      });
    }

    // Sprawdź czy nie ma już oczekującego podania
    const existingApp = await prisma.application.findFirst({
      where: {
        userId: user.id,
        position,
        status: 'PENDING',
      },
    });

    if (existingApp) {
      return interaction.editReply({
        content: `❌ Masz już oczekujące podanie na **${position}**. Poczekaj na odpowiedź staffu.`,
      });
    }

    // Wygeneruj token podania (ważny 24h)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.applicationToken.create({
      data: {
        userId: user.id,
        token,
        type: 'SERVICE',
        position,
        expiresAt,
      },
    });

    const dashboardUrl = process.env.NEXTAUTH_URL || 'https://localhost:3000';
    const appUrl = `${dashboardUrl}/aplikuj/SERVICE/${token}`;

    const embed = new EmbedBuilder()
      .setColor(0x10B981)
      .setTitle(`💼 Podanie na ${position}`)
      .setDescription(
        `Kliknij poniższy link, aby wypełnić formularz podania:\n\n` +
        `🔗 **[Wypełnij podanie](${appUrl})**\n\n` +
        `⏱️ Link wygasa za **24 godziny**.\n` +
        `📝 Wypełnij wszystkie pola starannie — niekompletne podania zostaną odrzucone.`
      )
      .setFooter({ text: 'Greenville RP — Podania' })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply({
        content: `✅ Link do podania na **${position}** został wysłany w DM!`,
      });
    } catch {
      await interaction.editReply({ embeds: [embed] });
    }

    logger.info(`Token podania wygenerowany: ${token} — ${position} dla ${interaction.user.tag}`);
  },
};
