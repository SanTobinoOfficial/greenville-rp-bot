// Komenda /ostrzezenia — historia ostrzeżeń gracza (Staff)
// Wyświetla aktywne i nieaktywne warny z paginacją

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');

const CASE_EMOJI = {
  WARN:   '⚠️',
  BAN:    '🔨',
  KICK:   '👢',
  MUTE:   '🔇',
  UNBAN:  '✅',
  UNMUTE: '🔊',
};

const STATUS_EMOJI = {
  ACTIVE:   '🔴',
  EXPIRED:  '⚫',
  REMOVED:  '🗑️',
  APPEALED: '📝',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ostrzezenia')
    .setDescription('Historia ostrzeżeń i kar gracza (Staff+)')
    .addUserOption(opt =>
      opt.setName('gracz')
        .setDescription('Gracz do sprawdzenia')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('typ')
        .setDescription('Filtruj po typie kary')
        .addChoices(
          { name: '⚠️ Wszystkie', value: 'ALL' },
          { name: '⚠️ Ostrzeżenia', value: 'WARN' },
          { name: '🔨 Bany', value: 'BAN' },
          { name: '👢 Kicke', value: 'KICK' },
          { name: '🔇 Mute', value: 'MUTE' },
        )
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('tylko-aktywne')
        .setDescription('Pokaż tylko aktywne kary (domyślnie: wszystkie)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Tylko Staff może sprawdzać ostrzeżenia.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser    = interaction.options.getUser('gracz');
    const typ           = interaction.options.getString('typ') ?? 'ALL';
    const tylkoAktywne  = interaction.options.getBoolean('tylko-aktywne') ?? false;

    const dbUser = await prisma.user.findUnique({
      where: { discordId: targetUser.id },
    });

    if (!dbUser) {
      return interaction.editReply({ content: `❌ Gracz <@${targetUser.id}> nie jest w bazie danych.` });
    }

    // Buduj warunek filtrowania
    const where = {
      targetId: dbUser.id,
      ...(typ !== 'ALL' ? { type: typ } : {}),
      ...(tylkoAktywne ? { status: 'ACTIVE' } : {}),
    };

    const cases = await prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 25,
      include: { moderator: { select: { discordId: true, discordUsername: true } } },
    });

    // Statystyki
    const totalWarns  = await prisma.case.count({ where: { targetId: dbUser.id, type: 'WARN' } });
    const activeWarns = await prisma.case.count({ where: { targetId: dbUser.id, type: 'WARN', status: 'ACTIVE' } });
    const totalBans   = await prisma.case.count({ where: { targetId: dbUser.id, type: 'BAN' } });
    const totalCases  = await prisma.case.count({ where: { targetId: dbUser.id } });

    const embed = new EmbedBuilder()
      .setColor(activeWarns > 0 ? 0xFEE75C : 0x5865F2)
      .setTitle(`📋 Historia Kar — ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
      .addFields(
        { name: '📊 Statystyki', value:
            `Wszystkich kar: **${totalCases}**\n` +
            `Warnów: **${totalWarns}** (aktywnych: **${activeWarns}**)\n` +
            `Banów: **${totalBans}**`,
          inline: false
        }
      )
      .setFooter({ text: `ID: ${targetUser.id} | Wyświetlono ${cases.length} ostatnich kar` })
      .setTimestamp();

    if (cases.length === 0) {
      embed.setDescription('✅ Brak wpisanych kar dla tego gracza.');
    } else {
      const caseLines = cases.map(c => {
        const typeEmoji   = CASE_EMOJI[c.type]   ?? '❓';
        const statusEmoji = STATUS_EMOJI[c.status] ?? '❓';
        const createdTs   = Math.floor(c.createdAt.getTime() / 1000);
        const expiredInfo = c.expiresAt
          ? ` | Wygasa: <t:${Math.floor(c.expiresAt.getTime() / 1000)}:R>`
          : '';
        const modName = c.moderator?.discordUsername ?? 'Nieznany';

        return (
          `${statusEmoji} ${typeEmoji} **#${c.caseNumber}** — <t:${createdTs}:D>\n` +
          `┗ ${c.reason.slice(0, 80)}${c.reason.length > 80 ? '…' : ''} | Mod: ${modName}${expiredInfo}`
        );
      });

      // Podziel na kawałki jeśli za dużo (limit embed field ~1024 znaków)
      const chunks = [];
      let chunk = '';
      for (const line of caseLines) {
        if ((chunk + '\n' + line).length > 1000) {
          chunks.push(chunk);
          chunk = line;
        } else {
          chunk = chunk ? chunk + '\n' + line : line;
        }
      }
      if (chunk) chunks.push(chunk);

      for (let i = 0; i < Math.min(chunks.length, 3); i++) {
        embed.addFields({
          name: i === 0 ? '📜 Kary (najnowsze)' : '…ciąg dalszy',
          value: chunks[i],
          inline: false,
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
