// Komenda /lista-zapisanych — lista graczy zapisanych na bieżącą/nadchodzącą sesję RP
// Embed pokazuje sign-up count, ale Host nie widzi KTO — ta komenda wypełnia tę lukę.
// Dostępna dla: Host+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lista-zapisanych')
    .setDescription('Wyświetl pełną listę graczy zapisanych na aktualną/nadchodzącą sesję RP')
    .addBooleanOption(opt =>
      opt
        .setName('prywatna')
        .setDescription('Czy odpowiedź ma być widoczna tylko dla Ciebie? (domyślnie: tak)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    // Sprawdź uprawnienia — tylko Host+ może zobaczyć listę
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    const ephemeral = interaction.options.getBoolean('prywatna') ?? true;
    await interaction.deferReply({ ephemeral });

    // Pobierz najbliższą sesję UPCOMING lub aktualnie trwającą ONGOING
    let session;
    try {
      session = await prisma.session.findFirst({
        where: { status: { in: ['UPCOMING', 'ONGOING'] } },
        orderBy: { date: 'asc' },
        include: {
          signups: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                include: { character: true },
              },
            },
          },
        },
      });
    } catch (err) {
      logger.error('lista-zapisanych: błąd zapytania do bazy:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania listy. Spróbuj ponownie.' });
    }

    // Brak aktywnej/nadchodzącej sesji
    if (!session) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.neutral)
            .setTitle('📋 Lista zapisanych — brak sesji')
            .setDescription(
              'Brak aktywnej ani nadchodzącej sesji RP.\n' +
              'Utwórz nową sesję za pomocą komendy `/sesja`.'
            )
            .setFooter({ text: 'AURORA Greenville RP — Lista zapisanych' })
            .setTimestamp(),
        ],
      });
    }

    const signups      = session.signups;
    const signupCount  = signups.length;
    const sessionShort = session.id.slice(0, 8).toUpperCase();
    const sessionUnix  = Math.floor(session.date.getTime() / 1000);
    const isOngoing    = session.status === 'ONGOING';

    // Pobierz nick hosta
    let hostDisplay = `\`${session.hostId}\``;
    try {
      const hostUser = await prisma.user.findUnique({
        where: { id: session.hostId },
        select: { discordId: true },
      });
      if (hostUser) hostDisplay = `<@${hostUser.discordId}>`;
    } catch {
      // fallback do ID
    }

    // Zbuduj listę graczy
    let listText;
    if (signupCount === 0) {
      listText = '*Nikt jeszcze się nie zapisał.*';
    } else {
      const lines = signups.map((signup, i) => {
        const u         = signup.user;
        const charName  = u.character
          ? `**${u.character.firstName} ${u.character.lastName}**`
          : '*(brak postaci)*';
        const robloxTag = u.robloxUsername
          ? `\`${u.robloxUsername}\``
          : '*(niezweryfikowany)*';
        const signedTs  = Math.floor(signup.createdAt.getTime() / 1000);
        return `\`${String(i + 1).padStart(2, ' ')}.\` <@${u.discordId}> — ${charName} | ${robloxTag} | <t:${signedTs}:R>`;
      });

      // Discord: opis embeda ≤ 4096 znaków
      const joined = lines.join('\n');
      listText = joined.length > 4000
        ? joined.slice(0, 3990) + '\n*…(lista przycięta — pobierz więcej danych z bazy)*'
        : joined;
    }

    // Pasek zapełnienia miejsc
    const filled = Math.round((signupCount / session.maxPlayers) * 10);
    const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);

    const statusLabel = isOngoing ? '🟢 Sesja trwa' : '🔵 Sesja nadchodząca';
    const embedColor  = isOngoing ? COLORS.success : COLORS.primary;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`📋 Lista zapisanych — ${statusLabel}`)
      .addFields(
        {
          name:   '📅 Termin sesji',
          value:  `<t:${sessionUnix}:F>  *(${isOngoing ? 'trwa od' : 'zaczyna się'} <t:${sessionUnix}:R>)*`,
          inline: false,
        },
        {
          name:   '🎙️ Host',
          value:  hostDisplay,
          inline: true,
        },
        {
          name:   '👥 Zapełnienie',
          value:  `**${signupCount} / ${session.maxPlayers}** \`[${bar}]\``,
          inline: true,
        },
      )
      .setDescription(listText)
      .setFooter({ text: `AURORA Greenville RP — Lista zapisanych | Sesja ID: ${sessionShort}` })
      .setTimestamp();

    if (session.description) {
      embed.addFields({
        name:   '📝 Opis sesji',
        value:  session.description.length > 200
          ? session.description.slice(0, 197) + '…'
          : session.description,
        inline: false,
      });
    }

    logger.info(
      `lista-zapisanych | ${interaction.user.tag} | sesja ${sessionShort} | ` +
      `${signupCount}/${session.maxPlayers} graczy | status: ${session.status}`
    );

    return interaction.editReply({ embeds: [embed] });
  },
};
