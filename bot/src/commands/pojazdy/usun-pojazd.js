// Komenda /usuń-pojazd — wyrejestrowanie pojazdu

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('usuń-pojazd')
    .setDescription('Wyrejestruj pojazd z systemu')
    .addStringOption(opt =>
      opt.setName('tablica')
        .setDescription('Tablica rejestracyjna pojazdu do usunięcia')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const tablica = interaction.options.getString('tablica').toUpperCase().trim();

    const user = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
    });

    if (!user) {
      return interaction.editReply({ content: '❌ Nie jesteś zarejestrowany w systemie.' });
    }

    // Staff może usunąć dowolny pojazd, gracz tylko swój
    const isStaffMember = interaction.member.roles.cache.some(r =>
      ['Helper', 'Moderator', 'Administrator', 'Co-Owner', 'Owner'].includes(r.name)
    );

    const vehicle = await prisma.vehicle.findUnique({
      where: { tablica },
      include: { user: true },
    });

    if (!vehicle) {
      return interaction.editReply({ content: `❌ Pojazd z tablicą **${tablica}** nie istnieje.` });
    }

    if (!isStaffMember && vehicle.userId !== user.id) {
      return interaction.editReply({ content: '❌ Możesz usuwać tylko własne pojazdy.' });
    }

    await prisma.vehicle.delete({ where: { tablica } });

    // Log
    const logChannel = interaction.guild.channels.cache.find(
      c => c.name === '🚗│logi-pojazdów' && c.isTextBased()
    );
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🚗 Pojazd wyrejestrowany')
            .addFields(
              { name: 'Pojazd', value: `${vehicle.marka} ${vehicle.model} — \`${tablica}\``, inline: false },
              { name: 'Właściciel', value: `<@${vehicle.user.discordId}>`, inline: true },
              { name: 'Usunął', value: `<@${interaction.user.id}>`, inline: true },
            )
            .setTimestamp()
        ],
      });
    }

    await interaction.editReply({
      content: `✅ Pojazd **${vehicle.marka} ${vehicle.model}** (\`${tablica}\`) został wyrejestrowany.`,
    });
  },
};
