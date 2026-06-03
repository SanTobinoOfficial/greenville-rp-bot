// Komenda /sesja-dm — wysyła DM do wszystkich graczy zapisanych na sesję
// Personalizowane przypomnienie trafia bezpośrednio do każdego uczestnika
// Dostępna dla: Host+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { hasRole, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Zapobiega spamowi — 1 zestaw DM na sesję co 30 minut (resetuje się przy restarcie bota)
const dmCooldowns = new Map(); // sessionId → timestamp ostatnich DM
const COOLDOWN_MS = 30 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sesja-dm')
    .setDescription('Wyślij DM-powiadomienia do wszystkich zapisanych graczy (Host+)')
    .addStringOption(opt =>
      opt
        .setName('wiadomosc')
        .setDescription('Dodatkowa wiadomość od hosta (opcjonalne, maks. 300 znaków)')
        .setRequired(false)
        .setMaxLength(300)
    ),

  async execute(interaction, client, prisma) {
    if (!hasRole(interaction.member, ROLES.HOST)) {
      return interaction.reply({
        content: '❌ Brak uprawnień — wymagana rola **Host** lub wyższa.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const extraMessage = interaction.options.getString('wiadomosc');

    // Pobierz najbliższą aktywną lub nadchodzącą sesję z listą zapisanych
    let session;
    try {
      session = await prisma.session.findFirst({
        where: { status: { in: ['UPCOMING', 'ONGOING'] } },
        orderBy: { date: 'asc' },
        include: {
          signups: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { discordId: true, discordUsername: true } },
            },
          },
        },
      });
    } catch (err) {
      logger.error('sesja-dm: błąd bazy:', err.message);
      return interaction.editReply({ content: '❌ Błąd podczas pobierania sesji z bazy danych.' });
    }

    if (!session) {
      return interaction.editReply({
        content: '❌ Brak aktywnej ani nadchodzącej sesji RP. Utwórz nową sesję komendą `/sesja`.',
      });
    }

    if (session.signups.length === 0) {
      return interaction.editReply({ content: '❌ Nikt nie jest jeszcze zapisany na tę sesję.' });
    }

    // Sprawdź cooldown per-sesja
    const lastSent = dmCooldowns.get(session.id);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      const remainingMin = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 60_000);
      return interaction.editReply({
        content: `⏳ DM dla tej sesji zostały już niedawno wysłane. Odczekaj jeszcze **${remainingMin} min** przed ponownym użyciem.`,
      });
    }

    const sessionUnix = Math.floor(session.date.getTime() / 1000);
    const isOngoing   = session.status === 'ONGOING';
    const sessionShort = session.id.slice(0, 8).toUpperCase();

    // Embed który trafi do każdego gracza na DM
    const dmEmbed = new EmbedBuilder()
      .setColor(isOngoing ? COLORS.success : COLORS.primary)
      .setTitle(isOngoing ? '🟢 Sesja RP trwa — dołącz teraz!' : '⏰ Przypomnienie: sesja RP zbliża się!')
      .setDescription(
        isOngoing
          ? 'Sesja RP, na którą się zapisałeś/aś, **właśnie trwa**! Czas dołączyć do zabawy.'
          : `Sesja RP, na którą się zapisałeś/aś, **zaczyna się wkrótce**!\n\n📅 <t:${sessionUnix}:F>\n🕐 <t:${sessionUnix}:R>`
      )
      .addFields(
        { name: '👥 Zapisani',   value: `${session.signups.length} / ${session.maxPlayers}`, inline: true },
        { name: '👤 Host',       value: `<@${interaction.user.id}>`,                         inline: true },
      )
      .setFooter({ text: `AURORA Greenville RP — Sesja ID: ${sessionShort}` })
      .setTimestamp();

    if (session.description) {
      const desc = session.description.length > 300
        ? session.description.slice(0, 297) + '…'
        : session.description;
      dmEmbed.addFields({ name: '📝 Opis sesji', value: desc, inline: false });
    }

    if (extraMessage) {
      dmEmbed.addFields({ name: '💬 Wiadomość od hosta', value: extraMessage, inline: false });
    }

    // Ustaw cooldown przed wysyłką (by uniknąć podwójnego wywołania przy powolnej sieci)
    dmCooldowns.set(session.id, Date.now());

    // Wysyłaj DM równolegle do wszystkich zapisanych
    let sentCount   = 0;
    let failedCount = 0;

    await Promise.allSettled(
      session.signups.map(async signup => {
        try {
          const discordUser = await client.users.fetch(signup.user.discordId).catch(() => null);
          if (!discordUser) { failedCount++; return; }
          await discordUser.send({ embeds: [dmEmbed] });
          sentCount++;
        } catch {
          failedCount++;
        }
      })
    );

    logger.info(
      `sesja-dm | ${interaction.user.tag} | sesja ${sessionShort} | ` +
      `status=${session.status} sent=${sentCount} failed=${failedCount}`
    );

    const resultEmbed = new EmbedBuilder()
      .setColor(failedCount === 0 ? COLORS.success : COLORS.warning)
      .setTitle('📬 DM wysłane')
      .setDescription('Spersonalizowane przypomnienia o sesji zostały wysłane do zapisanych graczy.')
      .addFields(
        { name: '✅ Dostarczono',      value: `**${sentCount}**`,                                        inline: true },
        { name: '❌ Niedostarczono',   value: `**${failedCount}** *(DM wyłączone lub gracz opuścił serwer)*`, inline: true },
      )
      .setFooter({ text: `AURORA Greenville RP • Sesja ID: ${sessionShort}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [resultEmbed] });
  },
};
