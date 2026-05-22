// Komenda /maintenance — włącz/wyłącz tryb konserwacji serwera
// Dostępna dla: Co-Owner+

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

const COWNER_ROLES = ['Co-Owner', 'Owner'];
function isCOwner(member) {
  return member.roles.cache.some(r => COWNER_ROLES.includes(r.name)) ||
    member.permissions.has(PermissionFlagsBits.Administrator);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Włącz/wyłącz tryb konserwacji serwera (Co-Owner+)')
    .addBooleanOption(opt =>
      opt.setName('wlaczone')
        .setDescription('true = włącz maintenance | false = wyłącz')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('wiadomosc')
        .setDescription('Komunikat dla graczy (opcjonalnie)')
        .setMaxLength(300)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isCOwner(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Co-Owner+ może zmieniać tryb konserwacji.', ephemeral: true });
    }

    const enabled = interaction.options.getBoolean('wlaczone');
    const message = interaction.options.getString('wiadomosc') ?? 'Przerwa techniczna. Wrócimy wkrótce! 🔧';

    await prisma.settings.upsert({
      where: { id: 'global' },
      update: { maintenanceMode: enabled, maintenanceMessage: message },
      create: { id: 'global', maintenanceMode: enabled, maintenanceMessage: message },
    });

    const embed = new EmbedBuilder()
      .setColor(enabled ? 0xFEE75C : 0x57F287)
      .setTitle(enabled ? '🔧 Tryb konserwacji WŁĄCZONY' : '✅ Tryb konserwacji WYŁĄCZONY')
      .setDescription(enabled
        ? `Serwer jest teraz w trybie konserwacji.\n**Komunikat:** ${message}`
        : 'Serwer wrócił do normalnego działania.')
      .addFields(
        { name: '👮 Administrator', value: `<@${interaction.user.id}>`, inline: true },
        { name: '🕐 Czas', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Wyślij info na kanał ogłoszeń jeśli maintenance włączony
    if (enabled) {
      const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
      const oglCh = interaction.guild.channels.cache.find(
        c => c.isTextBased() && norm(c.name).includes('ogloszenia') && !norm(c.name).includes('sesji') && !norm(c.name).includes('staff')
      );
      if (oglCh) {
        await oglCh.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle('🔧 Przerwa techniczna')
              .setDescription(message)
              .setFooter({ text: 'AURORA Greenville RP — Maintenance' })
              .setTimestamp()
          ]
        }).catch(() => {});
      }
    }

    logger.info(`/maintenance: ${enabled ? 'WŁĄCZONO' : 'WYŁĄCZONO'} przez ${interaction.user.tag}`);
  },
};
