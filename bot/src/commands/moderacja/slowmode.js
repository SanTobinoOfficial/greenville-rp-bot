// Komenda /slowmode — ustaw tryb powolny na kanale
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Ustaw tryb powolny na kanale (Helper+)')
    .addIntegerOption(opt =>
      opt.setName('sekundy')
        .setDescription('Czas opóźnienia w sekundach (0 = wyłącz, max 21600)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Kanał (domyślnie: aktualny)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff może używać tej komendy.', ephemeral: true });
    }

    const seconds = interaction.options.getInteger('sekundy');
    const targetChannel = interaction.options.getChannel('kanal') ?? interaction.channel;

    try {
      await targetChannel.setRateLimitPerUser(seconds, `Slowmode ustawiony przez ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(seconds === 0 ? 0x57F287 : 0xFEE75C)
        .setTitle(seconds === 0 ? '✅ Tryb powolny wyłączony' : '🐢 Tryb powolny ustawiony')
        .addFields(
          { name: '📍 Kanał', value: `${targetChannel}`, inline: true },
          { name: '⏱️ Opóźnienie', value: seconds === 0 ? 'Wyłączony' : `${seconds}s`, inline: true },
          { name: '👤 Moderator', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      logger.info(`/slowmode: ${targetChannel.name} → ${seconds}s przez ${interaction.user.tag}`);
    } catch (e) {
      await interaction.reply({ content: `❌ Błąd: ${e.message}`, ephemeral: true });
    }
  },
};
