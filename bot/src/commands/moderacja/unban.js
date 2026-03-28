// Komenda /unban — odbanowanie gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Odbanuj gracza (Moderator+)')
    .addStringOption(opt =>
      opt.setName('user_id')
        .setDescription('ID użytkownika Discord')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('powód')
        .setDescription('Powód unbana')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isMod(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień (wymagane: Moderator+).', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('powód') || 'Brak podanego powodu';

    try {
      await interaction.guild.bans.remove(userId, reason);

      // Pobierz lub utwórz użytkownika w bazie
      const mod = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      const target = await prisma.user.findUnique({ where: { discordId: userId } });

      if (mod && target) {
        const caseRecord = await prisma.case.create({
          data: {
            type: 'UNBAN',
            targetId: target.id,
            moderatorId: mod.id,
            reason,
            status: 'ACTIVE',
          },
        });

        // Log
        const logChannel = interaction.guild.channels.cache.find(
          c => c.name === '🔨│logi-moderacji' && c.isTextBased()
        );
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`✅ Unban | Case #${caseRecord.caseNumber}`)
                .addFields(
                  { name: '👤 Gracz', value: `${userId}`, inline: true },
                  { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                  { name: '📝 Powód', value: reason, inline: false },
                )
                .setTimestamp()
            ],
          });
        }
      }

      await interaction.editReply({ content: `✅ Użytkownik \`${userId}\` został odbanowany.` });

    } catch (err) {
      await interaction.editReply({ content: `❌ Nie można odbanować: \`${err.message}\`` });
    }
  },
};
