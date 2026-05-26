// Komenda /szept — Szept IC (prywatna wiadomość RP)
// Uzupełnienie zestawu RP: /me (akcja) · /do (otoczenie) · /try (próba) · /roll (kostka) · /szept (szept)
//
// Jak działa:
//   1. Na kanale publicznym pojawia się dyskretny embed informujący TYLKO o tym,
//      że postać szepnęła do innej — treść NIE jest ujawniana publicznie.
//   2. Cel szeptu otrzymuje DM z pełną treścią + informacją od kogo.
//   3. Nadawca otrzymuje ephemeral potwierdzenie wysłania (lub błąd, jeśli DM zablokowane).
//
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Pomocnicza: pobierz imię IC gracza ───────────────────────────────────────
async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const userDb = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (userDb?.character) {
      return `${userDb.character.firstName} ${userDb.character.lastName}`;
    }
  } catch {
    // Cisza — fallback poniżej
  }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('szept')
    .setDescription('Szepnij IC do innej postaci — treść widoczna tylko dla celu (DM)')
    .addUserOption(opt =>
      opt
        .setName('cel')
        .setDescription('Do kogo szepczesz? (gracz na serwerze)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('tresc')
        .setDescription('Co szepczesz? (widoczne tylko dla celu)')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(300)
    ),

  async execute(interaction, client, prisma) {
    // Ephemeral reply — nadawca widzi tylko potwierdzenie
    await interaction.deferReply({ ephemeral: true });

    // Weryfikacja gracza
    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const targetUser = interaction.options.getUser('cel');
    const tresc      = interaction.options.getString('tresc').trim();

    // Blokady — nie można szeptać do siebie ani do bota
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({
        content: '❌ Nie możesz szeptać do samego siebie.',
      });
    }
    if (targetUser.bot) {
      return interaction.editReply({
        content: '❌ Nie można szeptać do bota.',
      });
    }

    // Sprawdź czy cel jest na tym serwerze
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.editReply({
        content: '❌ Ten gracz nie jest na serwerze.',
      });
    }

    // ── Pobierz imiona IC obu graczy ─────────────────────────────────────────
    const [senderIcName, targetIcName] = await Promise.all([
      getIcName(prisma, interaction.user.id, interaction.member),
      getIcName(prisma, targetUser.id, targetMember),
    ]);

    // ── Embed publiczny — tylko sygnał, że szept miał miejsce ────────────────
    // Treść NIE jest ujawniana; kanał widzi tylko „A szepce do B"
    const publicEmbed = new EmbedBuilder()
      .setColor(0x4B4458) // Ciemny fiolet — subtelny, wyróżnia się od /me i /do
      .setDescription(
        `🤫 *__${senderIcName}__ pochyla się i szepce coś do ucha __${targetIcName}__...*`
      )
      .setFooter({
        text: `${interaction.user.tag} → ${targetUser.tag} • ${interaction.channel.name} • /szept`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    // Wyślij publiczny embed na kanał (bez treści szeptu)
    await interaction.channel.send({ embeds: [publicEmbed] }).catch(err =>
      logger.warn(`/szept: Nie udało się wysłać publicznego embeda: ${err.message}`)
    );

    // ── DM do celu — pełna treść szeptu ─────────────────────────────────────
    const dmEmbed = new EmbedBuilder()
      .setColor(0x4B4458)
      .setTitle('🤫 Ktoś do Ciebie szepnął')
      .setDescription(`*„${tresc}"*`)
      .addFields(
        {
          name: '🗣️ Od postaci',
          value: `**${senderIcName}** (<@${interaction.user.id}>)`,
          inline: true,
        },
        {
          name: '📍 Kanał',
          value: `<#${interaction.channel.id}>`,
          inline: true,
        },
        {
          name: '🕐 Czas',
          value: `<t:${Math.floor(Date.now() / 1000)}:T>`,
          inline: true,
        },
      )
      .setThumbnail(interaction.user.displayAvatarURL({ size: 64 }))
      .setFooter({ text: 'AURORA Greenville RP — Szept IC | Treść tylko dla Ciebie' })
      .setTimestamp();

    let dmSent = false;
    try {
      await targetUser.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch {
      // DM zablokowane przez gracza — nie przerywamy, tylko informujemy nadawcę
      logger.warn(`/szept: Nie udało się wysłać DM do ${targetUser.tag} (zablokowane DM)`);
    }

    // ── Ephemeral potwierdzenie dla nadawcy ───────────────────────────────────
    const confirmEmbed = new EmbedBuilder()
      .setColor(dmSent ? COLORS.success : COLORS.warning)
      .setTitle(dmSent ? '✅ Szept wysłany' : '⚠️ Szept wysłany (DM zablokowane)')
      .addFields(
        { name: '🎭 Twoja postać',   value: senderIcName,        inline: true },
        { name: '🎭 Cel szeptu',     value: targetIcName,         inline: true },
        { name: '💬 Treść szeptu',   value: `*„${tresc}"*`,       inline: false },
      );

    if (!dmSent) {
      confirmEmbed.setDescription(
        '⚠️ Gracz ma zablokowane wiadomości prywatne — treść szeptu do niego nie dotarła.\n' +
        'Spróbuj użyć `/sms` lub porozmawiaj z nim bezpośrednio.'
      );
    }

    confirmEmbed
      .setFooter({ text: 'AURORA Greenville RP — Szept IC' })
      .setTimestamp();

    logger.info(
      `/szept | ${interaction.user.tag} (${senderIcName}) → ${targetUser.tag} (${targetIcName}) ` +
      `| DM: ${dmSent ? 'OK' : 'ZABLOKOWANE'} | "${tresc.slice(0, 60)}${tresc.length > 60 ? '…' : ''}"`
    );

    await interaction.editReply({ embeds: [confirmEmbed] });
  },
};
