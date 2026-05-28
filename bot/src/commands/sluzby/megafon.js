// Komenda /megafon — publiczne ogłoszenie przez megafon służbowy
// Dostępna tylko dla funkcjonariuszy On-Duty lub Staffu
// Uzupełnienie zestawu RP służb obok /duty i /patrol

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const SERVICE_CONFIG = [
  { onDutyRole: 'Policja On-Duty',       label: 'Policja',       emoji: '🚔', color: 0x003087 },
  { onDutyRole: 'EMS On-Duty',           label: 'EMS',           emoji: '🚑', color: 0xED4245 },
  { onDutyRole: 'Straż On-Duty',         label: 'Straż Pożarna', emoji: '🚒', color: 0xFEE75C },
  { onDutyRole: 'DOT On-Duty',           label: 'DOT',           emoji: '🚧', color: 0xFF7F00 },
  { onDutyRole: 'Straż Miejska On-Duty', label: 'Straż Miejska', emoji: '🛡️', color: 0x2ECC71 },
  { onDutyRole: 'Taksówkarz On-Duty',    label: 'Taksówkarz',    emoji: '🚕', color: 0xF1C40F },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('megafon')
    .setDescription('Ogłoś coś przez megafon służbowy — widoczne publicznie na kanale (tylko On-Duty)')
    .addStringOption(opt =>
      opt.setName('tresc')
        .setDescription('Treść ogłoszenia przez megafon')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(200)
    )
    .addStringOption(opt =>
      opt.setName('kierunek')
        .setDescription('Kierunek lub obszar ogłoszenia (np. "pojazd przy sklepie", "rejon centrum")')
        .setMaxLength(100)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const member = interaction.member;

    // Znajdź aktywną służbę (On-Duty) funkcjonariusza
    const activeService = SERVICE_CONFIG.find(s =>
      member.roles.cache.some(r => r.name === s.onDutyRole)
    );

    if (!activeService && !isStaff(member)) {
      return interaction.editReply({
        content: '❌ Megafon dostępny tylko dla funkcjonariuszy **On-Duty**. Użyj `/duty`, aby wejść na służbę.',
      });
    }

    const service  = activeService ?? { label: 'Staff', emoji: '🛡️', color: 0x5865F2 };
    const tresc    = interaction.options.getString('tresc').trim();
    const kierunek = interaction.options.getString('kierunek')?.trim() ?? null;

    // Pobierz imię IC funkcjonariusza
    const userDb = await prisma.user
      .findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      })
      .catch(() => null);

    const char   = userDb?.character;
    const icName = char
      ? `${char.firstName} ${char.lastName}`
      : (member?.displayName ?? interaction.user.username);

    const embed = new EmbedBuilder()
      .setColor(service.color)
      .setTitle(`${service.emoji} MEGAFON — ${service.label}`)
      .setDescription(`## 📢 "${tresc}"`)
      .addFields(
        { name: '👮 Funkcjonariusz', value: icName,        inline: true },
        { name: '🏛️ Służba',         value: service.label, inline: true },
      )
      .setFooter({
        text: `${interaction.user.tag} • ${interaction.channel.name} • /megafon`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    if (kierunek) {
      embed.addFields({ name: '📍 Obszar', value: kierunek, inline: true });
    }

    logger.info(
      `/megafon | ${interaction.user.tag} (${icName}) | ${service.label} | "${tresc}"` +
      (kierunek ? ` | kierunek: ${kierunek}` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
