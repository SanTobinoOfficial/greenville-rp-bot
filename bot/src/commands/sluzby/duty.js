// Komenda /duty — toggle wejścia/wyjścia ze służby
// Zmienia rolę on-duty, loguje czas służby w DutyLog
// Dostępna dla: posiadaczy roli służby

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

const SERVICE_CONFIG = {
  policja:       { role: 'Policja',        onDutyRole: 'Policja On-Duty',       emoji: '🚔', color: 0x003087 },
  ems:           { role: 'EMS',            onDutyRole: 'EMS On-Duty',           emoji: '🚑', color: 0xED4245 },
  straz:         { role: 'Straż Pożarna',  onDutyRole: 'Straż On-Duty',         emoji: '🚒', color: 0xFEE75C },
  dot:           { role: 'DOT',            onDutyRole: 'DOT On-Duty',           emoji: '🚧', color: 0xFF7F00 },
  straz_miejska: { role: 'Straż Miejska',  onDutyRole: 'Straż Miejska On-Duty', emoji: '🛡️', color: 0x2ECC71 },
  taksowkarz:    { role: 'Taksówkarz',     onDutyRole: 'Taksówkarz On-Duty',    emoji: '🚕', color: 0xF1C40F },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duty')
    .setDescription('Wejdź lub wyjdź ze służby')
    .addStringOption(opt =>
      opt.setName('sluzba')
        .setDescription('Wybierz służbę')
        .setRequired(true)
        .addChoices(
          { name: '🚔 Policja',        value: 'policja' },
          { name: '🚑 EMS',            value: 'ems' },
          { name: '🚒 Straż Pożarna',  value: 'straz' },
          { name: '🚧 DOT',            value: 'dot' },
          { name: '🛡️ Straż Miejska',  value: 'straz_miejska' },
          { name: '🚕 Taksówkarz',     value: 'taksowkarz' },
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const serviceKey = interaction.options.getString('sluzba');
    const config = SERVICE_CONFIG[serviceKey];
    if (!config) return interaction.editReply({ content: '❌ Nieznana służba.' });

    const member = interaction.member;

    // Sprawdź czy gracz ma rolę tej służby
    const hasServiceRole = member.roles.cache.some(r => r.name === config.role);
    if (!hasServiceRole) {
      return interaction.editReply({
        content: `❌ Nie jesteś członkiem służby **${config.role}**. Złóż podanie aby dołączyć.`,
      });
    }

    // Sprawdź/utwórz rolę on-duty
    let onDutyRole = interaction.guild.roles.cache.find(r => r.name === config.onDutyRole);
    if (!onDutyRole) {
      try {
        onDutyRole = await interaction.guild.roles.create({
          name: config.onDutyRole,
          color: config.color,
          reason: 'Auto-create: duty system',
        });
      } catch (err) {
        logger.error(`Błąd tworzenia roli ${config.onDutyRole}:`, err.message);
        return interaction.editReply({ content: '❌ Nie udało się stworzyć roli on-duty. Sprawdź uprawnienia bota.' });
      }
    }

    const isOnDuty = member.roles.cache.has(onDutyRole.id);

    // Zapis do bazy
    let userDb = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!userDb) {
      userDb = await prisma.user.create({
        data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
      });
    }

    await prisma.dutyLog.create({
      data: {
        userId:  userDb.id,
        service: serviceKey.toUpperCase(),
        action:  isOnDuty ? 'OFF_DUTY' : 'ON_DUTY',
      },
    });

    const embed = new EmbedBuilder()
      .setColor(config.color)
      .setTimestamp()
      .setFooter({ text: 'Greenville RP — System Służb' });

    if (isOnDuty) {
      // Wyjście ze służby
      await member.roles.remove(onDutyRole);
      embed
        .setTitle(`${config.emoji} Wyjście ze służby — ${config.role}`)
        .setDescription(`<@${interaction.user.id}> zakończył/a służbę.`)
        .setColor(COLORS.error);
    } else {
      // Wejście na służbę
      await member.roles.add(onDutyRole);
      embed
        .setTitle(`${config.emoji} Wejście na służbę — ${config.role}`)
        .setDescription(`<@${interaction.user.id}> rozpoczął/a służbę.`);
    }

    // Log na kanale służby
    const logChannel = interaction.guild.channels.cache.find(
      c => c.name.includes('duty') || c.name.includes('służba') || c.name.includes('logi-sluzby')
    );
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [embed] }).catch(() => null);
    }

    await interaction.editReply({
      content: isOnDuty
        ? `${config.emoji} Wyszedłeś/aś ze służby **${config.role}**.`
        : `${config.emoji} Jesteś teraz **ON DUTY** — ${config.role}!`,
    });
  },
};
