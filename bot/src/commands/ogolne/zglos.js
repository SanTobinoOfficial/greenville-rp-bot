// Komenda /zglos — szybkie zgłoszenie, tworzy ticket
// Dostępna dla: wszystkich zweryfikowanych graczy

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zglos')
    .setDescription('Zgłoś problem, cheater lub incydent RP')
    .addStringOption(opt =>
      opt.setName('opis')
        .setDescription('Krótki opis zgłoszenia')
        .setRequired(true)
        .setMaxLength(400)
    )
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Zgłaszany gracz (opcjonalnie)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('kategoria')
        .setDescription('Kategoria zgłoszenia')
        .setRequired(false)
        .addChoices(
          { name: '🚨 Cheater / Hacker',      value: 'CHEATER' },
          { name: '⚠️ Naruszenie regulaminu',  value: 'REGULAMIN' },
          { name: '🎭 Problem RP / FRP',       value: 'FRP' },
          { name: '🐛 Bug / Błąd bota',        value: 'BUG' },
          { name: '❓ Inne',                   value: 'INNE' },
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({ content: '❌ Tylko zweryfikowani mieszkańcy mogą składać zgłoszenia.' });
    }

    const opis = interaction.options.getString('opis');
    const targetUser = interaction.options.getUser('gracz');
    const kategoria = interaction.options.getString('kategoria') || 'INNE';

    const KATEGORIE_LABELS = {
      CHEATER:   '🚨 Cheater / Hacker',
      REGULAMIN: '⚠️ Naruszenie regulaminu',
      FRP:       '🎭 Problem RP / FRP',
      BUG:       '🐛 Bug / Błąd bota',
      INNE:      '❓ Inne',
    };

    // Znajdź kanał ticketów / zgłoszeń
    const ticketChannel = interaction.guild.channels.cache.find(
      c => (c.name.includes('zgłoszenia') || c.name.includes('raporty') || c.name.includes('staff-only') || c.name.includes('logi-tickety'))
        && c.isTextBased()
    );

    // Zapisz ticket w bazie
    let userDb = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!userDb) {
      userDb = await prisma.user.create({
        data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId:    userDb.id,
        channelId: ticketChannel?.id || 'quick-report',
        category:  `Zgłoszenie — ${KATEGORIE_LABELS[kategoria]}`,
        status:    'OPEN',
      },
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`📋 Zgłoszenie #${ticket.ticketNumber}`)
      .addFields(
        { name: '👤 Zgłaszający',   value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
        { name: '📂 Kategoria',     value: KATEGORIE_LABELS[kategoria], inline: true },
        { name: '📝 Opis',          value: opis, inline: false },
      )
      .setFooter({ text: 'Greenville RP — Zgłoszenie' })
      .setTimestamp();

    if (targetUser) {
      embed.addFields({ name: '🎯 Zgłaszany gracz', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: false });
    }

    if (ticketChannel) {
      const staffRole = interaction.guild.roles.cache.find(r => r.name === 'Moderator' || r.name === 'Helper');
      await ticketChannel.send({
        content: staffRole ? `<@&${staffRole.id}>` : '',
        embeds: [embed],
      });
      logger.info(`Zgłoszenie #${ticket.ticketNumber} od ${interaction.user.tag}`);
    }

    await interaction.editReply({
      content: `✅ Zgłoszenie **#${ticket.ticketNumber}** zostało wysłane do staffu.\nOczekuj odpowiedzi w ciągu 24 godzin.`,
    });
  },
};
