// Komenda /apeluj — odwołanie od decyzji moderacyjnej
// Dostępna dla: każdy zweryfikowany użytkownik (tylko własne case'y)
// Ustawia status case'a na APPEALED i powiadamia staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embed');

const APPEALABLE_TYPES = new Set(['WARN', 'BAN', 'MUTE', 'KICK']);

const TYPE_LABELS = {
  WARN: 'Ostrzeżenie',
  BAN:  'Ban',
  MUTE: 'Wyciszenie',
  KICK: 'Kick',
};

const STATUS_REASONS = {
  EXPIRED:  'wygasł i nie podlega już odwołaniu',
  REMOVED:  'został usunięty przez Staff',
  APPEALED: 'jest już w trakcie odwołania',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apeluj')
    .setDescription('Złóż odwołanie od decyzji moderacyjnej')
    .addIntegerOption(opt =>
      opt.setName('numer_case')
        .setDescription('Numer case od którego chcesz się odwołać')
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(opt =>
      opt.setName('uzasadnienie')
        .setDescription('Uzasadnienie odwołania — wyjaśnij dlaczego decyzja powinna zostać zmieniona')
        .setRequired(true)
        .setMinLength(20)
        .setMaxLength(1000)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const caseNumber    = interaction.options.getInteger('numer_case');
    const uzasadnienie  = interaction.options.getString('uzasadnienie');

    const targetCase = await prisma.case.findUnique({
      where: { caseNumber },
      include: { target: true, moderator: true },
    });

    if (!targetCase) {
      return interaction.editReply({ content: `❌ Case #${caseNumber} nie istnieje.` });
    }

    if (targetCase.target.discordId !== interaction.user.id) {
      return interaction.editReply({ content: '❌ Możesz odwoływać się tylko od własnych case\'ów.' });
    }

    if (!APPEALABLE_TYPES.has(targetCase.type)) {
      return interaction.editReply({
        content: `❌ Case'y typu **${targetCase.type}** nie podlegają odwołaniu.`,
      });
    }

    if (targetCase.status !== 'ACTIVE') {
      const reason = STATUS_REASONS[targetCase.status] || `ma status: ${targetCase.status}`;
      return interaction.editReply({ content: `❌ Nie możesz odwołać się od tego case'a — ${reason}.` });
    }

    await prisma.case.update({
      where: { id: targetCase.id },
      data:  { status: 'APPEALED' },
    });

    logger.info(`Odwołanie od Case #${caseNumber} złożone przez ${interaction.user.tag}`);

    const typeLabel = TYPE_LABELS[targetCase.type] || targetCase.type;
    const caseDateTs = Math.floor(new Date(targetCase.createdAt).getTime() / 1000);

    // Powiadomienie Staff w kanale moderacyjnym
    const staffEmbed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(`⚖️ Odwołanie od Case #${caseNumber}`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 Odwołujący się',        value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
        { name: '🛡️ Moderator który wydał', value: `<@${targetCase.moderator.discordId}>`,               inline: true },
        { name: '📋 Typ kary',              value: typeLabel,                                              inline: true },
        { name: '📝 Oryginalny powód',      value: targetCase.reason,                                     inline: false },
        { name: '⚖️ Uzasadnienie odwołania', value: uzasadnienie,                                         inline: false },
        { name: '📅 Data nałożenia kary',   value: `<t:${caseDateTs}:f>`,                                 inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — System odwołań | Rozpatrz odwołanie używając /unban lub /unmute' })
      .setTimestamp();

    await logger.botLog(prisma, client, interaction.guild.id, 'logi-moderacji', staffEmbed);

    // DM z potwierdzeniem dla użytkownika
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle('⚖️ Odwołanie złożone pomyślnie')
        .setDescription('Twoje odwołanie zostało przekazane do rozpatrzenia przez Staff. Otrzymasz odpowiedź przez DM po podjęciu decyzji.')
        .addFields(
          { name: '🔢 Case',                 value: `#${caseNumber} — ${typeLabel}`,  inline: true },
          { name: '📅 Data złożenia',         value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
          { name: '📝 Oryginalny powód kary', value: targetCase.reason,               inline: false },
          { name: '⚖️ Twoje uzasadnienie',    value: uzasadnienie,                    inline: false },
        )
        .setFooter({ text: 'AURORA Greenville RP — Cierpliwie poczekaj na decyzję Staffu' })
        .setTimestamp();
      await interaction.user.send({ embeds: [dmEmbed] });
    } catch {
      logger.warn(`Nie udało się wysłać DM do ${interaction.user.tag} (odwołanie)`);
    }

    await interaction.editReply({
      content: `✅ Odwołanie od Case #${caseNumber} zostało złożone. Staff zostanie poinformowany. Otrzymasz wiadomość DM po rozpatrzeniu.`,
    });
  },
};
