// Komenda /zatrzymaj — zatrzymanie gracza przez Policję
// Dodaje wpis do Arrest, pinguje gracza, loguje do kanału
// Dostępna dla: Policja On-Duty | Policja | Staff+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('zatrzymaj')
    .setDescription('Zatrzymaj gracza (Policja)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do zatrzymania')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('powod')
        .setDescription('Powód zatrzymania')
        .setRequired(true)
        .setMaxLength(300)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    const member = interaction.member;
    const isPolicja = member.roles.cache.some(r => r.name === ROLES.POLICJA || r.name === 'Policja On-Duty');

    if (!isPolicja && !isStaff(member)) {
      return interaction.editReply({ content: '❌ Tylko Policja lub Staff może używać tej komendy.' });
    }

    const targetUser = interaction.options.getUser('gracz');
    const powod = interaction.options.getString('powod');

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz zatrzymać samego siebie.' });
    }
    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można zatrzymać bota.' });
    }

    // Pobierz/utwórz obu userów w DB
    let officerDb = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
    if (!officerDb) {
      officerDb = await prisma.user.create({
        data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
      });
    }

    let targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDb) {
      targetDb = await prisma.user.create({
        data: { discordId: targetUser.id, discordUsername: targetUser.tag },
      });
    }

    // Sprawdź czy już zatrzymany
    const existingArrest = await prisma.arrest.findFirst({
      where: { targetId: targetDb.id, active: true },
    });

    if (existingArrest) {
      return interaction.editReply({
        content: `❌ <@${targetUser.id}> jest już zatrzymany/a.`,
      });
    }

    // Utwórz zatrzymanie
    const arrest = await prisma.arrest.create({
      data: {
        targetId:  targetDb.id,
        officerId: officerDb.id,
        reason:    powod,
        active:    true,
      },
    });

    logger.info(`Zatrzymanie ${arrest.id}: ${targetUser.tag} przez ${interaction.user.tag} — ${powod}`);

    const embed = new EmbedBuilder()
      .setColor(COLORS.mod_ban)
      .setTitle('🚔 ZATRZYMANIE')
      .addFields(
        { name: '👤 Zatrzymany/a', value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
        { name: '🚔 Funkcjonariusz', value: `<@${interaction.user.id}>`, inline: true },
        { name: '📝 Powód', value: powod, inline: false },
        { name: '🕐 Czas', value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
        { name: '🆔 ID', value: `\`${arrest.id.slice(-8)}\``, inline: true },
      )
      .setFooter({ text: 'Greenville RP — Policja' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // DM do zatrzymanego
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.mod_ban)
            .setTitle('🚔 Zostałeś/aś zatrzymany/a')
            .addFields(
              { name: '📝 Powód', value: powod },
              { name: '🚔 Funkcjonariusz', value: `<@${interaction.user.id}>` },
            )
            .setFooter({ text: 'Greenville RP — Policja' })
            .setTimestamp(),
        ],
      });
    } catch {
      logger.warn(`Nie udało się wysłać DM do ${targetUser.tag} (zatrzymaj)`);
    }
  },
};
