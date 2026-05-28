// Komenda /wymien-numer — IC wymiana numeru telefonu między graczami
// Uzupełnienie systemu telefonicznego: /sms · /zadzwon · /mój-numer · /wymien-numer
//
// Jak działa:
//   1. Na kanale publicznym pojawia się embed informujący o wymianie numerów IC.
//   2. Obydwoje graczy dostaje DM z imieniem IC i numerem drugiej osoby.
//   3. Nadawca dostaje ephemeral potwierdzenie (lub ostrzeżenie o zablokowanych DM).
//
// Wymagania: oboje gracze muszą być zweryfikowani i mieć numer telefonu RP.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Pomocnicza: pobierz imię IC i numer telefonu gracza ─────────────────────
async function getPlayerInfo(prisma, discordId, fallbackMember) {
  try {
    const userDb = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    const icName = userDb?.character
      ? `${userDb.character.firstName} ${userDb.character.lastName}`
      : (fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać');
    return { icName, phoneNumber: userDb?.phoneNumber ?? null };
  } catch {
    return {
      icName: fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać',
      phoneNumber: null,
    };
  }
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('wymien-numer')
    .setDescription('Wymień numer telefonu IC z innym graczem — widoczne publicznie na kanale')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Komu dajesz swój numer telefonu?')
        .setRequired(true)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const targetUser = interaction.options.getUser('gracz');

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({ content: '❌ Nie możesz wymieniać numeru z samym sobą.' });
    }
    if (targetUser.bot) {
      return interaction.editReply({ content: '❌ Nie można wymieniać numeru z botem.' });
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return interaction.editReply({ content: '❌ Ten gracz nie jest na serwerze.' });
    }

    // ── Pobierz dane obu graczy równolegle ───────────────────────────────────
    const [senderInfo, targetInfo] = await Promise.all([
      getPlayerInfo(prisma, interaction.user.id, interaction.member),
      getPlayerInfo(prisma, targetUser.id, targetMember),
    ]);

    if (!senderInfo.phoneNumber) {
      return interaction.editReply({
        content: '❌ Nie masz zarejestrowanego numeru telefonu RP. Zweryfikuj się w **#weryfikacja**.',
      });
    }
    if (!targetInfo.phoneNumber) {
      return interaction.editReply({
        content: `❌ **${targetInfo.icName}** nie ma zarejestrowanego numeru telefonu RP i nie może przyjąć kontaktu.`,
      });
    }

    // ── Embed publiczny — scena IC wymiany numerów ────────────────────────────
    const publicEmbed = new EmbedBuilder()
      .setColor(0x25D366) // Zielony systemu telefonicznego
      .setDescription(
        `📲 *__${senderInfo.icName}__ wręcza __${targetInfo.icName}__ swoją wizytówkę z numerem telefonu.*`
      )
      .setFooter({
        text: `${interaction.user.tag} → ${targetUser.tag} • ${interaction.channel.name} • /wymien-numer`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    await interaction.channel.send({ embeds: [publicEmbed] }).catch(err =>
      logger.warn(`/wymien-numer: Nie udało się wysłać publicznego embeda: ${err.message}`)
    );

    // ── DM do obu graczy — pełne dane kontaktowe IC ───────────────────────────
    const buildContactDm = (receiverIcName, giverIcName, giverPhone, giverDiscordTag) =>
      new EmbedBuilder()
        .setColor(0x25D366)
        .setTitle('📱 Nowy kontakt IC — AURORA Greenville RP')
        .setDescription(`**${giverIcName}** wręczył/a Ci swój numer telefonu.`)
        .addFields(
          { name: '🎭 Postać',           value: giverIcName,                       inline: true },
          { name: '📞 Numer telefonu',   value: `\`${giverPhone}\``,               inline: true },
          { name: '👤 Gracz (Discord)',  value: `<@${interaction.user.id}> (${giverDiscordTag})`, inline: false },
          { name: '📍 Kanał spotkania',  value: `<#${interaction.channel.id}>`,    inline: true },
          { name: '🕐 Czas',            value: `<t:${Math.floor(Date.now() / 1000)}:T>`, inline: true },
        )
        .setFooter({ text: 'AURORA Greenville RP — System Telefoniczny | Możesz teraz napisać /sms' })
        .setTimestamp();

    // DM do celu: dostaje numer nadawcy
    let targetDmSent = false;
    try {
      await targetUser.send({
        embeds: [buildContactDm(
          targetInfo.icName,
          senderInfo.icName,
          senderInfo.phoneNumber,
          interaction.user.tag
        )],
      });
      targetDmSent = true;
    } catch {
      logger.warn(`/wymien-numer: Nie udało się wysłać DM do ${targetUser.tag} (zablokowane DM)`);
    }

    // DM do nadawcy: dostaje numer celu (wzajemna wymiana)
    let senderDmSent = false;
    try {
      await interaction.user.send({
        embeds: [buildContactDm(
          senderInfo.icName,
          targetInfo.icName,
          targetInfo.phoneNumber,
          targetUser.tag
        )],
      });
      senderDmSent = true;
    } catch {
      logger.warn(`/wymien-numer: Nie udało się wysłać DM do ${interaction.user.tag} (zablokowane DM)`);
    }

    // ── Ephemeral potwierdzenie dla nadawcy ───────────────────────────────────
    const allDmOk = targetDmSent && senderDmSent;
    const confirmEmbed = new EmbedBuilder()
      .setColor(allDmOk ? COLORS.success : COLORS.warning)
      .setTitle(allDmOk ? '✅ Numery wymienione' : '⚠️ Wymiana częściowa')
      .addFields(
        { name: '🎭 Twoja postać',     value: senderInfo.icName,      inline: true },
        { name: '🎭 Postać celu',      value: targetInfo.icName,      inline: true },
        { name: '📞 Twój numer IC',    value: `\`${senderInfo.phoneNumber}\``, inline: true },
        { name: '📞 Numer celu IC',    value: `\`${targetInfo.phoneNumber}\``, inline: true },
      )
      .setFooter({ text: 'AURORA Greenville RP — System Telefoniczny' })
      .setTimestamp();

    if (!allDmOk) {
      const blockedWho = !targetDmSent && !senderDmSent
        ? 'Obu graczy'
        : !targetDmSent
          ? `**${targetInfo.icName}**`
          : 'Ciebie';
      confirmEmbed.setDescription(
        `⚠️ ${blockedWho} ma zablokowane wiadomości prywatne — część powiadomień nie dotarła.\n` +
        'Możesz skorzystać z `/sms` lub sprawdzić numer używając `/numer-info`.'
      );
    }

    logger.info(
      `/wymien-numer | ${interaction.user.tag} (${senderInfo.icName}, ${senderInfo.phoneNumber}) ` +
      `→ ${targetUser.tag} (${targetInfo.icName}, ${targetInfo.phoneNumber}) ` +
      `| DM gracz: ${targetDmSent ? 'OK' : 'BRAK'}, DM nadawca: ${senderDmSent ? 'OK' : 'BRAK'}`
    );

    await interaction.editReply({ embeds: [confirmEmbed] });
  },
};
