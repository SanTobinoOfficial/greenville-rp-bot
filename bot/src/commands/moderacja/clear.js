// Komenda /clear — masowe usuwanie wiadomości z kanału
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Usuń ostatnie wiadomości z kanału (Moderator+)')
    .addIntegerOption(opt =>
      opt.setName('ilosc')
        .setDescription('Liczba wiadomości do usunięcia (1–100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Usuń tylko wiadomości tego gracza (opcjonalnie)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Moderator+ może używać tej komendy.', ephemeral: true });
    }

    const amount = interaction.options.getInteger('ilosc');
    const targetUser = interaction.options.getUser('gracz');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Pobierz wiadomości
      let messages = await interaction.channel.messages.fetch({ limit: targetUser ? 100 : amount });

      if (targetUser) {
        messages = messages.filter(m => m.author.id === targetUser.id).first(amount);
      }

      // Discord nie pozwala usuwać wiadomości starszych niż 14 dni bulk-delete
      const recent = [...messages.values()].filter(
        m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000
      );

      if (recent.length === 0) {
        return interaction.editReply({ content: '❌ Brak wiadomości do usunięcia (starsze niż 14 dni nie mogą być usuwane zbiorczo).' });
      }

      const deleted = await interaction.channel.bulkDelete(recent, true);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🗑️ Wiadomości usunięte')
        .addFields(
          { name: '📦 Usunięto', value: `**${deleted.size}** wiadomości`, inline: true },
          { name: '👤 Moderator', value: `<@${interaction.user.id}>`, inline: true },
          { name: '📍 Kanał', value: `${interaction.channel}`, inline: true },
          ...(targetUser ? [{ name: '🎯 Filtr gracza', value: `<@${targetUser.id}>`, inline: true }] : []),
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Log do moderacji
      const logCh = interaction.guild.channels.cache.find(
        c => c.isTextBased() && c.name.includes('logi-moderacji')
      );
      if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});

      logger.info(`/clear: ${interaction.user.tag} usunął ${deleted.size} wiadomości z #${interaction.channel.name}`);
    } catch (e) {
      logger.error('Błąd /clear:', e.message);
      await interaction.editReply({ content: `❌ Błąd: ${e.message}` });
    }
  },
};
