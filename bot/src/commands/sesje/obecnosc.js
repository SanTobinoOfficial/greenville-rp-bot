// Komenda /obecnosc — lista obecności w aktywnej sesji RP
// Rozwiązuje lukę między listą zapisanych a rzeczywistą frekwencją:
//   Gracze meldują się sami → Host/Staff widzi kto faktycznie dołączył do sesji.
//
// Subkomendy:
//   /obecnosc meldunek  — gracz rejestruje swoją obecność na aktywnej sesji
//   /obecnosc lista     — Host/Staff widzi tabelę: zapisani vs. zamelduję
//   /obecnosc reset     — Host czyści meldunki (np. po przypadkowym restarcie)
//
// In-memory: meldunki resetują się po restarcie bota.
// Dostępna dla: Mieszkaniec+ (meldunek), Host+ (lista/reset)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, hasRole } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// sessionId → Map<discordId, { icName, discordTag, checkedInAt }>
const checkIns = new Map();

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const u = await prisma.user.findUnique({
      where: { discordId },
      include: { character: true },
    });
    if (u?.character) return `${u.character.firstName} ${u.character.lastName}`;
  } catch {}
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

async function getOngoingSession(prisma) {
  return prisma.session.findFirst({
    where: { status: 'ONGOING' },
    include: { signups: { include: { user: true } } },
    orderBy: { startedAt: 'desc' },
  }).catch(() => null);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('obecnosc')
    .setDescription('Lista obecności aktywnej sesji RP')
    .addSubcommand(sub =>
      sub
        .setName('meldunek')
        .setDescription('Zamelduj swoją obecność na trwającej sesji RP')
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Pokaż listę obecności sesji (Host+)')
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Wyczyść meldunki bieżącej sesji (Host+)')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą korzystać z tej komendy.',
      });
    }

    const sub = interaction.options.getSubcommand();

    // ── MELDUNEK ──────────────────────────────────────────────────────────────
    if (sub === 'meldunek') {
      const session = await getOngoingSession(prisma);

      if (!session) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📋 Brak aktywnej sesji')
              .setDescription('Żadna sesja nie jest teraz w trakcie.\nMożesz zameldować się gdy Host użyje `/sesja-start`.')
              .setFooter({ text: 'AURORA Greenville RP — Obecność' })
              .setTimestamp(),
          ],
        });
      }

      if (!checkIns.has(session.id)) checkIns.set(session.id, new Map());
      const sessionMap = checkIns.get(session.id);

      if (sessionMap.has(interaction.user.id)) {
        const prev = sessionMap.get(interaction.user.id);
        const ts = Math.floor(prev.checkedInAt / 1000);
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.warning)
              .setTitle('⚠️ Już zameldowany/a')
              .setDescription(`Jesteś już zameldowany/a jako **${prev.icName}**.\nMeldunek: <t:${ts}:T>`)
              .setFooter({ text: 'AURORA Greenville RP — Obecność' })
              .setTimestamp(),
          ],
        });
      }

      const icName = await getIcName(prisma, interaction.user.id, interaction.member);
      const now = Date.now();
      sessionMap.set(interaction.user.id, {
        icName,
        discordTag: interaction.user.tag,
        checkedInAt: now,
      });

      const ts = Math.floor(now / 1000);

      logger.info(
        `/obecnosc meldunek | ${interaction.user.tag} (${icName}) | sesja ${session.id} | ` +
        `${sessionMap.size}. meldunek`
      );

      // Krótka wiadomość publiczna na kanale (nie ephemeral) — widoczna dla graczy
      await interaction.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setDescription(`✅ **${icName}** zameldował/a się na sesji. *(${sessionMap.size}. gracz)*`)
            .setFooter({
              text: `${interaction.user.tag} • /obecnosc meldunek`,
              iconURL: interaction.user.displayAvatarURL({ size: 32 }),
            })
            .setTimestamp(),
        ],
      }).catch(() => {});

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('✅ Zameldowano pomyślnie')
            .addFields(
              { name: '🎭 Postać',    value: icName,              inline: true },
              { name: '🕐 Godzina',   value: `<t:${ts}:T>`,       inline: true },
              { name: '👥 Łącznie',   value: `${sessionMap.size} zameldowanych`, inline: true },
            )
            .setFooter({ text: 'AURORA Greenville RP — Obecność' })
            .setTimestamp(),
        ],
      });
    }

    // ── LISTA ─────────────────────────────────────────────────────────────────
    if (sub === 'lista') {
      if (!hasRole(interaction.member, 'Host')) {
        return interaction.editReply({
          content: '❌ Tylko Host+ może przeglądać listę obecności.',
        });
      }

      const session = await getOngoingSession(prisma);

      if (!session) {
        return interaction.editReply({ content: '❌ Żadna sesja nie jest teraz w trakcie.' });
      }

      const sessionMap = checkIns.get(session.id) ?? new Map();
      const signups    = session.signups ?? [];

      const startTs = session.startedAt
        ? Math.floor(new Date(session.startedAt).getTime() / 1000)
        : null;

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📋 Lista obecności — aktywna sesja')
        .addFields(
          {
            name: '📊 Statystyki',
            value: [
              `> Zapisanych: **${signups.length}**`,
              `> Zameldowanych: **${sessionMap.size}**`,
              startTs ? `> Sesja trwa od: <t:${startTs}:R>` : '',
            ].filter(Boolean).join('\n'),
            inline: false,
          }
        );

      // Zameldowani ─────────────────────────────────────────────────────────
      if (sessionMap.size > 0) {
        const lines = [...sessionMap.entries()].map(([did, d]) => {
          const ts = Math.floor(d.checkedInAt / 1000);
          return `✅ **${d.icName}** (<@${did}>) — <t:${ts}:T>`;
        });
        embed.addFields({
          name: `✅ Zameldowani (${sessionMap.size})`,
          value: lines.slice(0, 20).join('\n') + (lines.length > 20 ? `\n*…i ${lines.length - 20} więcej*` : ''),
          inline: false,
        });
      } else {
        embed.addFields({
          name: '✅ Zameldowani (0)',
          value: '*Nikt jeszcze się nie zameldował.*',
          inline: false,
        });
      }

      // Zapisani, ale niezameldowani ─────────────────────────────────────────
      const checkedInIds = new Set(sessionMap.keys());
      const noShow = signups.filter(s => !checkedInIds.has(s.user.discordId));

      if (noShow.length > 0) {
        const lines = noShow.map(s => `⏳ <@${s.user.discordId}>`);
        embed.addFields({
          name: `⏳ Zapisani, ale niezameldowani (${noShow.length})`,
          value: lines.slice(0, 20).join('\n') + (lines.length > 20 ? `\n*…i ${lines.length - 20} więcej*` : ''),
          inline: false,
        });
      }

      embed
        .setFooter({ text: `AURORA Greenville RP — Obecność | Sesja: ${session.id.slice(0, 8)}` })
        .setTimestamp();

      logger.info(
        `/obecnosc lista | ${interaction.user.tag} | sesja ${session.id} | ` +
        `${sessionMap.size}/${signups.length}`
      );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    if (sub === 'reset') {
      if (!hasRole(interaction.member, 'Host')) {
        return interaction.editReply({
          content: '❌ Tylko Host+ może resetować listę obecności.',
        });
      }

      const session = await getOngoingSession(prisma);

      if (!session) {
        return interaction.editReply({ content: '❌ Żadna sesja nie jest teraz w trakcie.' });
      }

      const prev = checkIns.get(session.id)?.size ?? 0;
      checkIns.delete(session.id);

      logger.info(
        `/obecnosc reset | ${interaction.user.tag} | sesja ${session.id} | usunięto ${prev} meldunków`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Lista obecności zresetowana')
            .setDescription(
              `Usunięto **${prev}** meldunków sesji.\n` +
              'Gracze mogą teraz zameldować się ponownie przez `/obecnosc meldunek`.'
            )
            .setFooter({ text: 'AURORA Greenville RP — Obecność' })
            .setTimestamp(),
        ],
      });
    }
  },
};
