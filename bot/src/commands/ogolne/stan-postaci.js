// Komenda /stan-postaci — dynamiczny stan RP postaci
// Gracz ustawia aktualny stan swojej postaci (ranny, aresztowany, nieprzytomny itp.)
// Inne postacie mogą go sprawdzić — przydatne dla EMS, Policji i ogólnego RP.
// Dane przechowywane in-memory (jak /opis-postaci) — resetują się po restarcie.
// Dostępna dla: zweryfikowani gracze (Mieszkaniec+)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');
const { statusMap } = require('../../utils/characterStateStore');

// ── Predefiniowane stany RP ───────────────────────────────────────────────────
const STANY = {
  ok: {
    label:  'OK — Zdrowy/a',
    emoji:  '🟢',
    color:  COLORS.success,
    opis:   'Postać jest w pełni sprawna, bez obrażeń.',
  },
  ranny_lekko: {
    label:  'Lekko ranny/a',
    emoji:  '🟡',
    color:  0xFEE75C,
    opis:   'Postać ma drobne obrażenia — może poruszać się samodzielnie.',
  },
  ranny: {
    label:  'Ranny/a',
    emoji:  '🟠',
    color:  0xFF6B00,
    opis:   'Postać jest ranna — wymaga pomocy medycznej.',
  },
  ciezko_ranny: {
    label:  'Ciężko ranny/a',
    emoji:  '🔴',
    color:  COLORS.error,
    opis:   'Postać jest ciężko ranna — natychmiastowa interwencja EMS wymagana!',
  },
  nieprzytomny: {
    label:  'Nieprzytomny/a',
    emoji:  '⚫',
    color:  0x2C2F33,
    opis:   'Postać jest nieprzytomna — nie reaguje na bodźce.',
  },
  aresztowany: {
    label:  'Aresztowany/a',
    emoji:  '🔵',
    color:  0x003087,
    opis:   'Postać jest w areszcie lub pod eskortą policji.',
  },
  zatrzymany: {
    label:  'Zatrzymany/a',
    emoji:  '🟦',
    color:  0x5865F2,
    opis:   'Postać została zatrzymana przez służby do wyjaśnienia.',
  },
  niedostepny: {
    label:  'Niedostępny/a (AFK)',
    emoji:  '⚪',
    color:  COLORS.neutral,
    opis:   'Gracz jest chwilowo nieobecny — postać nie bierze udziału w RP.',
  },
};

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
    .setName('stan-postaci')
    .setDescription('Ustaw lub sprawdź aktualny stan RP postaci (ranny, aresztowany, OK itp.)')
    .addSubcommand(sub =>
      sub
        .setName('ustaw')
        .setDescription('Ustaw aktualny stan RP swojej postaci')
        .addStringOption(opt =>
          opt
            .setName('stan')
            .setDescription('Stan postaci')
            .setRequired(true)
            .addChoices(
              { name: '🟢 OK — Zdrowy/a',             value: 'ok'           },
              { name: '🟡 Lekko ranny/a',              value: 'ranny_lekko'  },
              { name: '🟠 Ranny/a',                    value: 'ranny'        },
              { name: '🔴 Ciężko ranny/a',             value: 'ciezko_ranny' },
              { name: '⚫ Nieprzytomny/a',             value: 'nieprzytomny' },
              { name: '🔵 Aresztowany/a',              value: 'aresztowany'  },
              { name: '🟦 Zatrzymany/a',               value: 'zatrzymany'   },
              { name: '⚪ Niedostępny/a (AFK)',         value: 'niedostepny'  },
            )
        )
        .addStringOption(opt =>
          opt
            .setName('szczegoly')
            .setDescription('Opcjonalne szczegóły (np. "złamana noga", "przy ul. Głównej")')
            .setMaxLength(200)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('sprawdz')
        .setDescription('Sprawdź aktualny stan RP innej postaci')
        .addUserOption(opt =>
          opt
            .setName('gracz')
            .setDescription('Czyj stan chcesz sprawdzić?')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('wyczysc')
        .setDescription('Usuń swój stan RP (powrót do braku statusu)')
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const sub    = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // ── USTAW ─────────────────────────────────────────────────────────────────
    if (sub === 'ustaw') {
      const stanKey    = interaction.options.getString('stan');
      const szczegoly  = interaction.options.getString('szczegoly')?.trim() ?? null;
      const stanData   = STANY[stanKey];

      if (!stanData) {
        return interaction.editReply({ content: '❌ Nieznany stan RP.' });
      }

      const icName  = await getIcName(prisma, userId, interaction.member);
      const isUpdate = statusMap.has(userId);

      statusMap.set(userId, {
        stanKey,
        stanData,
        szczegoly,
        icName,
        updatedAt: Date.now(),
      });

      logger.info(
        `/stan-postaci ustaw | ${interaction.user.tag} (${icName}) | ` +
        `${isUpdate ? 'aktualizacja' : 'nowy'} | stan: ${stanData.label}` +
        (szczegoly ? ` | szczegóły: "${szczegoly}"` : '')
      );

      const embed = new EmbedBuilder()
        .setColor(stanData.color)
        .setTitle(`${stanData.emoji} Stan RP ${isUpdate ? 'zaktualizowany' : 'ustawiony'}`)
        .setDescription(
          'Inni gracze mogą teraz sprawdzić Twój stan używając `/stan-postaci sprawdz`.'
        )
        .addFields(
          { name: '🎭 Postać',      value: icName,         inline: true  },
          { name: '📋 Stan',        value: stanData.label, inline: true  },
          { name: '📖 Opis stanu',  value: stanData.opis,  inline: false },
        );

      if (szczegoly) {
        embed.addFields({ name: '🔍 Szczegóły', value: szczegoly, inline: false });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Stan RP' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── SPRAWDZ ───────────────────────────────────────────────────────────────
    if (sub === 'sprawdz') {
      const targetUser = interaction.options.getUser('gracz');

      if (targetUser.bot) {
        return interaction.editReply({ content: '❌ Nie można sprawdzić stanu bota.' });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.editReply({ content: '❌ Ten gracz nie jest na tym serwerze.' });
      }

      const entry = statusMap.get(targetUser.id);

      if (!entry) {
        const targetIcName = await getIcName(prisma, targetUser.id, targetMember);

        logger.info(
          `/stan-postaci sprawdz | ${interaction.user.tag} → ${targetUser.tag} (${targetIcName}) | brak statusu`
        );

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.neutral)
              .setTitle('📋 Stan RP — brak statusu')
              .setDescription(
                `**${targetIcName}** nie ustawił/a swojego stanu RP.\n\n` +
                `*Gracz może ustawić stan używając \`/stan-postaci ustaw\`.*`
              )
              .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
              .setFooter({ text: 'AURORA Greenville RP — Stan RP' })
              .setTimestamp(),
          ],
        });
      }

      const updatedTs = Math.floor(entry.updatedAt / 1000);

      logger.info(
        `/stan-postaci sprawdz | ${interaction.user.tag} → ${targetUser.tag} (${entry.icName}) | stan: ${entry.stanData.label}`
      );

      const embed = new EmbedBuilder()
        .setColor(entry.stanData.color)
        .setTitle(`${entry.stanData.emoji} Stan RP — ${entry.icName}`)
        .setDescription(entry.stanData.opis)
        .addFields(
          { name: '🎭 Postać',          value: entry.icName,               inline: true  },
          { name: '📋 Stan',            value: entry.stanData.label,       inline: true  },
          { name: '🕐 Stan ustawiony',  value: `<t:${updatedTs}:R>`,       inline: true  },
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }));

      if (entry.szczegoly) {
        embed.addFields({ name: '🔍 Szczegóły', value: entry.szczegoly, inline: false });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Stan RP' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── WYCZYSC ───────────────────────────────────────────────────────────────
    if (sub === 'wyczysc') {
      if (!statusMap.has(userId)) {
        return interaction.editReply({
          content: '❌ Nie masz ustawionego stanu RP — nic do usunięcia.',
        });
      }

      const { icName, stanData } = statusMap.get(userId);
      statusMap.delete(userId);

      logger.info(`/stan-postaci wyczysc | ${interaction.user.tag} (${icName}) | był: ${stanData.label}`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('🗑️ Stan RP usunięty')
            .setDescription(
              `Stan RP postaci **${icName}** został usunięty.\n` +
              `Użyj \`/stan-postaci ustaw\` aby ustawić nowy.`
            )
            .addFields({ name: '📋 Poprzedni stan', value: stanData.label, inline: true })
            .setFooter({ text: 'AURORA Greenville RP — Stan RP' })
            .setTimestamp(),
        ],
      });
    }
  },
};
