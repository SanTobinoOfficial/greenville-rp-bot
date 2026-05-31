// Komenda /historia-sms — historia wiadomości SMS i połączeń IC
// Moje: własna historia (Mieszkaniec+) | gracza: historia innego gracza (Staff+)
// Dane z modelu SMS w bazie danych (persystentne, nie in-memory)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isStaff, isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MAX_ENTRIES = 20;
const CONTENT_LIMIT = 80;
const CHUNK_SIZE = 10;

function formatEntry(sms, myDbId) {
  const isOutgoing = sms.senderId === myDbId;
  const directionEmoji = isOutgoing ? '📤' : '📥';
  const typeEmoji = sms.type === 'CALL' ? '📞' : '💬';
  const otherNumber = isOutgoing
    ? (sms.receiver?.phoneNumber ?? '???')
    : (sms.sender?.phoneNumber ?? '???');

  const content = sms.type === 'CALL'
    ? '*(Połączenie telefoniczne)*'
    : sms.content.length > CONTENT_LIMIT
      ? sms.content.slice(0, CONTENT_LIMIT - 1) + '…'
      : sms.content;

  const ts = Math.floor(new Date(sms.createdAt).getTime() / 1000);
  return `${typeEmoji} ${directionEmoji} \`${otherNumber}\` — ${content}  <t:${ts}:R>`;
}

function buildHistoryEmbed(messages, myDbId, title, description, footerText, avatarUrl) {
  const lines = messages.map(sms => formatEntry(sms, myDbId));
  const chunks = [];
  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    let chunk = lines.slice(i, i + CHUNK_SIZE).join('\n');
    if (chunk.length > 1020) chunk = chunk.slice(0, 1017) + '…';
    chunks.push(chunk);
  }

  const embed = new EmbedBuilder()
    .setColor(0x25D366)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: footerText })
    .setTimestamp();

  if (avatarUrl) embed.setThumbnail(avatarUrl);

  chunks.forEach((chunk, ci) => {
    embed.addFields({
      name: chunks.length > 1 ? `📋 Historia (${ci + 1}/${chunks.length})` : '📋 Historia',
      value: chunk,
      inline: false,
    });
  });

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('historia-sms')
    .setDescription('Historia wiadomości SMS i połączeń IC')
    .addSubcommand(sub =>
      sub.setName('moje')
        .setDescription('Twoja historia SMS i połączeń (ostatnie 20 wpisów)')
    )
    .addSubcommand(sub =>
      sub.setName('gracza')
        .setDescription('Historia SMS innego gracza (Staff+)')
        .addUserOption(opt =>
          opt.setName('gracz')
            .setDescription('Gracz do sprawdzenia')
            .setRequired(true)
        )
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ── MOJE ──────────────────────────────────────────────────────────────────
    if (sub === 'moje') {
      if (!isVerified(interaction.member)) {
        return interaction.editReply({
          content: '❌ Tylko zweryfikowani mieszkańcy mogą sprawdzać historię SMS.',
        });
      }

      const userDb = await prisma.user.findUnique({
        where: { discordId: interaction.user.id },
        select: { id: true, phoneNumber: true },
      });

      if (!userDb?.phoneNumber) {
        return interaction.editReply({
          content: '❌ Nie masz przypisanego numeru telefonu. Najpierw zweryfikuj się w **#weryfikacja**.',
        });
      }

      const messages = await prisma.sMS.findMany({
        where: { OR: [{ senderId: userDb.id }, { receiverId: userDb.id }] },
        orderBy: { createdAt: 'desc' },
        take: MAX_ENTRIES,
        include: {
          sender:   { select: { phoneNumber: true } },
          receiver: { select: { phoneNumber: true } },
        },
      });

      if (messages.length === 0) {
        return interaction.editReply({ content: '📋 Brak historii SMS ani połączeń na tym numerze.' });
      }

      const embed = buildHistoryEmbed(
        messages,
        userDb.id,
        '📱 Historia SMS i Połączeń',
        `Numer: \`${userDb.phoneNumber}\` • Ostatnie ${messages.length} wpisów`,
        'AURORA Greenville RP — System Telefoniczny | Widoczna tylko dla Ciebie',
        null,
      );

      logger.info(`/historia-sms moje: ${interaction.user.tag} — ${messages.length} wpisów`);
      return interaction.editReply({ embeds: [embed] });
    }

    // ── GRACZA ────────────────────────────────────────────────────────────────
    if (sub === 'gracza') {
      if (!isStaff(interaction.member)) {
        return interaction.editReply({
          content: '❌ Tylko Staff może sprawdzać historię SMS innych graczy.',
        });
      }

      const targetUser = interaction.options.getUser('gracz');

      const userDb = await prisma.user.findUnique({
        where: { discordId: targetUser.id },
        select: { id: true, phoneNumber: true },
      });

      if (!userDb?.phoneNumber) {
        return interaction.editReply({
          content: `❌ Gracz <@${targetUser.id}> nie ma przypisanego numeru telefonu.`,
        });
      }

      const messages = await prisma.sMS.findMany({
        where: { OR: [{ senderId: userDb.id }, { receiverId: userDb.id }] },
        orderBy: { createdAt: 'desc' },
        take: MAX_ENTRIES,
        include: {
          sender:   { select: { phoneNumber: true } },
          receiver: { select: { phoneNumber: true } },
        },
      });

      if (messages.length === 0) {
        return interaction.editReply({
          content: `📋 Brak historii SMS ani połączeń dla gracza <@${targetUser.id}>.`,
        });
      }

      const embed = buildHistoryEmbed(
        messages,
        userDb.id,
        `📱 Historia SMS — ${targetUser.displayName}`,
        `Numer: \`${userDb.phoneNumber}\` • Ostatnie ${messages.length} wpisów`,
        `AURORA Greenville RP — sprawdził: ${interaction.user.tag}`,
        targetUser.displayAvatarURL(),
      );

      logger.info(`/historia-sms gracza: ${interaction.user.tag} sprawdził ${targetUser.tag} — ${messages.length} wpisów`);
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
