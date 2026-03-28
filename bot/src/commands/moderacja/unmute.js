// Komenda /unmute — usunięcie timeoutu (wyciszenia) gracza

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Odcisz gracza (Staff)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do odciszenia')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('gracz');
    if (!target) return interaction.editReply({ content: '❌ Nie znaleziono gracza.' });

    try {
      await target.timeout(null);

      const mod = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      const targetUser = await prisma.user.findUnique({ where: { discordId: target.id } });

      if (mod && targetUser) {
        const caseRecord = await prisma.case.create({
          data: {
            type: 'UNMUTE',
            targetId: targetUser.id,
            moderatorId: mod.id,
            reason: 'Ręczne odciszenie',
            status: 'ACTIVE',
          },
        });

        const logChannel = interaction.guild.channels.cache.find(
          c => c.name === '🔨│logi-moderacji' && c.isTextBased()
        );
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle(`🔊 Unmute | Case #${caseRecord.caseNumber}`)
                .addFields(
                  { name: '👤 Gracz', value: `${target.user.tag}`, inline: true },
                  { name: '🛡️ Moderator', value: `${interaction.user.tag}`, inline: true },
                )
                .setTimestamp()
            ],
          });
        }
      }

      await interaction.editReply({ content: `✅ Gracz **${target.user.tag}** został odciszony.` });

    } catch (err) {
      await interaction.editReply({ content: `❌ Błąd: \`${err.message}\`` });
    }
  },
};
