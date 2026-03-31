// Komenda /notatka — notatki moderacyjne o graczu
// Subkomendy: dodaj | lista | usun
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notatka')
    .setDescription('Notatki moderacyjne o graczu (Moderator+)')
    .addSubcommand(sub =>
      sub.setName('dodaj')
        .setDescription('Dodaj notatkę o graczu')
        .addUserOption(opt =>
          opt.setName('gracz').setDescription('Gracz').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('tresc').setDescription('Treść notatki').setRequired(true).setMaxLength(500)
        )
    )
    .addSubcommand(sub =>
      sub.setName('lista')
        .setDescription('Wyświetl notatki o graczu')
        .addUserOption(opt =>
          opt.setName('gracz').setDescription('Gracz').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('usun')
        .setDescription('Usuń notatkę po ID')
        .addStringOption(opt =>
          opt.setName('id').setDescription('ID notatki (z /notatka lista)').setRequired(true)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isMod(interaction.member)) {
      return interaction.editReply(noPermissionReply('Moderator+'));
    }

    const sub = interaction.options.getSubcommand();

    // ── DODAJ ──────────────────────────────────────────────
    if (sub === 'dodaj') {
      const targetUser = interaction.options.getUser('gracz');
      const tresc = interaction.options.getString('tresc');

      let authorDb = await prisma.user.findUnique({ where: { discordId: interaction.user.id } });
      if (!authorDb) {
        authorDb = await prisma.user.create({
          data: { discordId: interaction.user.id, discordUsername: interaction.user.tag },
        });
      }

      let targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
      if (!targetDb) {
        targetDb = await prisma.user.create({
          data: { discordId: targetUser.id, discordUsername: targetUser.tag },
        });
      }

      const note = await prisma.note.create({
        data: {
          targetId: targetDb.id,
          authorId:  authorDb.id,
          content:   tresc,
        },
      });

      logger.info(`Notatka ${note.id} dodana dla ${targetUser.tag} przez ${interaction.user.tag}`);

      await interaction.editReply({
        content: `✅ Notatka dodana dla <@${targetUser.id}>.\n> **ID:** \`${note.id.slice(-8)}\`\n> ${tresc}`,
      });
    }

    // ── LISTA ─────────────────────────────────────────────
    else if (sub === 'lista') {
      const targetUser = interaction.options.getUser('gracz');

      const targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
      if (!targetDb) {
        return interaction.editReply({ content: '❌ Ten gracz nie jest zarejestrowany w systemie.' });
      }

      const notes = await prisma.note.findMany({
        where: { targetId: targetDb.id },
        include: { author: true },
        orderBy: { createdAt: 'desc' },
        take: 15,
      });

      if (notes.length === 0) {
        return interaction.editReply({ content: `ℹ️ Brak notatek dla <@${targetUser.id}>.` });
      }

      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(`📝 Notatki — ${targetUser.tag}`)
        .setDescription(
          notes.map(n =>
            `**\`${n.id.slice(-8)}\`** • <t:${Math.floor(n.createdAt.getTime() / 1000)}:D> • @${n.author.discordUsername}\n> ${n.content}`
          ).join('\n\n')
        )
        .setFooter({ text: `${notes.length} notatek | Greenville RP` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }

    // ── USUŃ ──────────────────────────────────────────────
    else if (sub === 'usun') {
      const shortId = interaction.options.getString('id');

      // Wyszukaj po końcówce ID
      const notes = await prisma.note.findMany({
        where: { id: { endsWith: shortId } },
      });

      if (notes.length === 0) {
        return interaction.editReply({ content: `❌ Nie znaleziono notatki o ID kończącym się na \`${shortId}\`.` });
      }

      const note = notes[0];
      await prisma.note.delete({ where: { id: note.id } });

      await interaction.editReply({ content: `✅ Notatka \`${note.id.slice(-8)}\` została usunięta.` });
    }
  },
};
