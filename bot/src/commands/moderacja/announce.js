// Komenda /announce — wyślij ogłoszenie jako embed bota
// Dostępna dla: Administrator+

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const logger = require('../../utils/logger');

const ADMIN_ROLES = ['Administrator', 'Co-Owner', 'Owner'];

function isAdmin(member) {
  return member.roles.cache.some(r => ADMIN_ROLES.includes(r.name)) ||
    member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Wyślij ogłoszenie jako embed bota (Administrator+)')
    .addStringOption(opt =>
      opt.setName('tytul')
        .setDescription('Tytuł ogłoszenia')
        .setMaxLength(256)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('tresc')
        .setDescription('Treść ogłoszenia (obsługuje markdown)')
        .setMaxLength(2000)
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Kanał docelowy (domyślnie: #ogłoszenia)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('kolor')
        .setDescription('Kolor embeda')
        .addChoices(
          { name: '🔵 Niebieski', value: '5865F2' },
          { name: '🟢 Zielony', value: '57F287' },
          { name: '🔴 Czerwony', value: 'ED4245' },
          { name: '🟡 Żółty', value: 'FEE75C' },
          { name: '🟠 Pomarańczowy', value: 'FF6B00' },
          { name: '⚪ Biały', value: 'FFFFFF' },
        )
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('ping')
        .setDescription('Pinguj rolę (opcjonalnie)')
        .addChoices(
          { name: '🔔 @Powiadomienia', value: 'powiadomienia' },
          { name: '👥 @Mieszkaniec', value: 'mieszkaniec' },
          { name: 'Brak pingu', value: 'none' },
        )
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isAdmin(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Administrator+ może wysyłać ogłoszenia.', ephemeral: true });
    }

    const tytul = interaction.options.getString('tytul');
    const tresc = interaction.options.getString('tresc');
    const colorHex = interaction.options.getString('kolor') ?? '5865F2';
    const pingChoice = interaction.options.getString('ping') ?? 'none';

    // Znajdź kanał docelowy
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
    const targetCh = interaction.options.getChannel('kanal') ??
      interaction.guild.channels.cache.find(c =>
        c.isTextBased() &&
        norm(c.name).includes('ogloszenia') &&
        !norm(c.name).includes('sesji') &&
        !norm(c.name).includes('staffu') &&
        !norm(c.name).includes('staff')
      );

    if (!targetCh) {
      return interaction.reply({ content: '❌ Nie znaleziono kanału docelowego. Podaj kanał ręcznie.', ephemeral: true });
    }

    // Rozwiąż ping
    let pingContent = '';
    if (pingChoice !== 'none') {
      const role = interaction.guild.roles.cache.find(r =>
        r.name.toLowerCase().includes(pingChoice)
      );
      if (role) pingContent = `${role}`;
    }

    const embed = new EmbedBuilder()
      .setColor(parseInt(colorHex, 16))
      .setTitle(`📢 ${tytul}`)
      .setDescription(tresc)
      .setAuthor({ name: `Ogłoszenie od: ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
      .setFooter({ text: 'AURORA Greenville RP — Ogłoszenia' })
      .setTimestamp();

    try {
      await targetCh.send({ content: pingContent || undefined, embeds: [embed] });
      await interaction.reply({
        content: `✅ Ogłoszenie wysłane na ${targetCh}!`,
        ephemeral: true,
      });
      logger.info(`/announce: ${interaction.user.tag} wysłał ogłoszenie na #${targetCh.name}`);
    } catch (e) {
      await interaction.reply({ content: `❌ Nie udało się wysłać ogłoszenia: ${e.message}`, ephemeral: true });
    }
  },
};
