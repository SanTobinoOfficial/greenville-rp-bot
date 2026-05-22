// Komenda /poll — utwórz ankietę na serwerze
// Dostępna dla: Helper+

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const EMOJI_OPTIONS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Utwórz ankietę z reakcjami (Helper+)')
    .addStringOption(opt =>
      opt.setName('pytanie')
        .setDescription('Pytanie ankiety')
        .setMaxLength(256)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('opcje')
        .setDescription('Opcje oddzielone | (np. "Tak | Nie | Nie wiem") — max 8')
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Kanał docelowy (domyślnie: aktualny)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('czas')
        .setDescription('Czas trwania w godzinach (0 = bezterminowo)')
        .setMinValue(0)
        .setMaxValue(168)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff może tworzyć ankiety.', ephemeral: true });
    }

    const pytanie = interaction.options.getString('pytanie');
    const opcjeRaw = interaction.options.getString('opcje');
    const targetCh = interaction.options.getChannel('kanal') ??
      interaction.guild.channels.cache.find(c => c.isTextBased() && c.name.includes('ankiety')) ??
      interaction.channel;
    const czas = interaction.options.getInteger('czas') ?? 0;

    const opcje = opcjeRaw.split('|').map(o => o.trim()).filter(Boolean).slice(0, 8);
    if (opcje.length < 2) {
      return interaction.reply({ content: '❌ Podaj co najmniej 2 opcje oddzielone |', ephemeral: true });
    }

    const optionsText = opcje.map((opt, i) => `${EMOJI_OPTIONS[i]} ${opt}`).join('\n');
    const endsAt = czas > 0 ? `\n\n⏰ **Ankieta kończy się:** <t:${Math.floor((Date.now() + czas * 3600000) / 1000)}:R>` : '';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🗳️ ${pytanie}`)
      .setDescription(`${optionsText}${endsAt}`)
      .setAuthor({ name: `Ankieta od: ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
      .setFooter({ text: 'Zagłosuj klikając reakcję poniżej • AURORA Greenville RP' })
      .setTimestamp();

    try {
      const msg = await targetCh.send({ embeds: [embed] });

      // Dodaj reakcje
      for (let i = 0; i < opcje.length; i++) {
        await msg.react(EMOJI_OPTIONS[i]).catch(() => {});
      }

      await interaction.reply({ content: `✅ Ankieta wysłana na ${targetCh}!`, ephemeral: true });
      logger.info(`/poll: ${interaction.user.tag} stworzył ankietę na #${targetCh.name}`);
    } catch (e) {
      await interaction.reply({ content: `❌ Błąd: ${e.message}`, ephemeral: true });
    }
  },
};
