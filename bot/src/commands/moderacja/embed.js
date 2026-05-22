// Komenda /embed — utwórz i wyślij niestandardowy embed
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Wyślij niestandardowy embed bota (Moderator+)')
    .addStringOption(opt =>
      opt.setName('tytul')
        .setDescription('Tytuł embeda')
        .setMaxLength(256)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opis')
        .setDescription('Treść embeda (markdown)')
        .setMaxLength(2000)
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Kanał docelowy (domyślnie: aktualny)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('kolor')
        .setDescription('Kolor hex bez # (np. 5865F2)')
        .setMaxLength(6)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('footer')
        .setDescription('Tekst stopki')
        .setMaxLength(200)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('obraz')
        .setDescription('URL obrazu w embedzie')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff może używać tej komendy.', ephemeral: true });
    }

    const tytul = interaction.options.getString('tytul');
    const opis = interaction.options.getString('opis');
    const colorStr = interaction.options.getString('kolor') ?? '5865F2';
    const footer = interaction.options.getString('footer') ?? 'AURORA Greenville RP';
    const obrazUrl = interaction.options.getString('obraz');
    const targetCh = interaction.options.getChannel('kanal') ?? interaction.channel;

    const color = /^[0-9A-Fa-f]{6}$/.test(colorStr) ? parseInt(colorStr, 16) : 0x5865F2;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(tytul)
      .setDescription(opis)
      .setFooter({ text: footer })
      .setTimestamp();

    if (obrazUrl) {
      try { embed.setImage(obrazUrl); } catch {}
    }

    try {
      await targetCh.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Embed wysłany na ${targetCh}!`, ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: `❌ Błąd: ${e.message}`, ephemeral: true });
    }
  },
};
