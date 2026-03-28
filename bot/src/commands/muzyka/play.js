// Komenda /play — dodaj utwór do kolejki muzycznej

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addTrack } = require('../../music/player');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Dodaj utwór do kolejki (Staff)')
    .addStringOption(opt =>
      opt.setName('zapytanie')
        .setDescription('Link YouTube lub nazwa utworu')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Brak uprawnień (wymagane: Helper+).', ephemeral: true });
    }

    await interaction.deferReply();

    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.editReply({ content: '❌ Musisz być na kanale głosowym, aby odtwarzać muzykę.' });
    }

    const query = interaction.options.getString('zapytanie');
    const track = await addTrack(interaction.guild, voiceChannel, query, interaction.user.tag);

    if (!track) {
      return interaction.editReply({ content: '❌ Nie znaleziono utworu. Sprawdź link lub wyszukiwaną frazę.' });
    }

    const minutes = Math.floor(track.duration / 60);
    const seconds = track.duration % 60;

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🎵 Dodano do kolejki')
          .addFields(
            { name: '🎶 Utwór', value: track.title, inline: false },
            { name: '⏱️ Czas', value: `${minutes}:${String(seconds).padStart(2, '0')}`, inline: true },
            { name: '👤 Dodał', value: interaction.user.tag, inline: true },
          )
          .setFooter({ text: 'Greenville RP — Muzyka' })
          .setTimestamp()
      ],
    });
  },
};
