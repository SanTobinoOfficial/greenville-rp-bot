// Komenda /lookup — pełna historia moderacyjna gracza z bazy
// Dostępna dla: Moderator+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isMod, noPermissionReply } = require('../../utils/permissions');
const { COLORS } = require('../../utils/embed');

const TYPE_EMOJI = {
  WARN:   '⚠️',
  BAN:    '🔨',
  KICK:   '👢',
  MUTE:   '🔇',
  UNBAN:  '✅',
  UNMUTE: '🔊',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Pełna historia moderacyjna gracza (Moderator+)')
    .addUserOption(opt =>
      opt.setName('gracz').setDescription('Gracz do sprawdzenia').setRequired(true)
    )
    .addBooleanOption(opt =>
      opt.setName('wszystkie').setDescription('Pokaż też zakończone/usunięte kary (domyślnie tylko aktywne)').setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isMod(interaction.member)) {
      return interaction.editReply(noPermissionReply('Moderator+'));
    }

    const targetUser = interaction.options.getUser('gracz');
    const wszystkie  = interaction.options.getBoolean('wszystkie') ?? false;

    const targetDb = await prisma.user.findUnique({ where: { discordId: targetUser.id } });
    if (!targetDb) {
      return interaction.editReply({ content: '❌ Ten gracz nie jest zarejestrowany w systemie.' });
    }

    const [cases, fines, notes, arrests] = await Promise.all([
      prisma.case.findMany({
        where: {
          targetId: targetDb.id,
          ...(wszystkie ? {} : { status: 'ACTIVE' }),
        },
        include: { moderator: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.fine.findMany({
        where: { targetId: targetDb.id, ...(wszystkie ? {} : { active: true }) },
        include: { issuer: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.note.findMany({
        where: { targetId: targetDb.id },
        include: { author: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.arrest.findMany({
        where: { targetId: targetDb.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(`🔍 Lookup — ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setFooter({ text: wszystkie ? 'AURORA Greenville RP — Pełna historia' : 'AURORA Greenville RP — Aktywne kary' })
      .setTimestamp();

    // Cases
    if (cases.length > 0) {
      embed.addFields({
        name: `⚖️ Kary moderacyjne (${cases.length})`,
        value: cases.map(c =>
          `${TYPE_EMOJI[c.type] || '•'} **#${c.caseNumber}** ${c.type} — ${c.reason.slice(0, 60)}` +
          `\n  → przez @${c.moderator.discordUsername} • <t:${Math.floor(c.createdAt.getTime() / 1000)}:D>`
        ).join('\n'),
        inline: false,
      });
    } else {
      embed.addFields({ name: '⚖️ Kary moderacyjne', value: 'Brak', inline: false });
    }

    // Mandaty
    if (fines.length > 0) {
      embed.addFields({
        name: `📜 Mandaty (${fines.length})`,
        value: fines.map(f =>
          `• ${f.type} ${f.amount ? `— **${f.amount} zł**` : ''} — ${f.reason.slice(0, 60)}`
        ).join('\n'),
        inline: false,
      });
    }

    // Notatki
    if (notes.length > 0) {
      embed.addFields({
        name: `📝 Notatki staffu (${notes.length})`,
        value: notes.map(n =>
          `• @${n.author.discordUsername}: ${n.content.slice(0, 80)}`
        ).join('\n'),
        inline: false,
      });
    }

    // Zatrzymania
    if (arrests.length > 0) {
      embed.addFields({
        name: `🚔 Zatrzymania (${arrests.length})`,
        value: arrests.map(a =>
          `• ${a.active ? '🔴 AKTYWNE' : '✅'} — ${a.reason.slice(0, 60)} • <t:${Math.floor(a.createdAt.getTime() / 1000)}:D>`
        ).join('\n'),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
