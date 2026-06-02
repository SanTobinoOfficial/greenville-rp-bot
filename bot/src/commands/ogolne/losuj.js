// Komenda /losuj — losowe wybranie jednej opcji z podanej listy
// Uzupełnienie zestawu RP: /roll (kostka) · /try (próba) · /losuj (wybór z listy)
// Przydatne na sesjach, eventach i przy decyzjach IC wymagających neutralnego arbitra
// Dostępna dla: wszyscy zweryfikowani gracze

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const MAX_OPTIONS = 15;
const MIN_OPTIONS = 2;

// ── Parsuj string → tablica opcji ────────────────────────────────────────────
function parseOptions(raw) {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('losuj')
    .setDescription('Wylosuj jedną opcję z listy — wynik widoczny publicznie')
    .addStringOption(opt =>
      opt
        .setName('opcje')
        .setDescription(`Lista opcji rozdzielona przecinkami (min. ${MIN_OPTIONS}, max. ${MAX_OPTIONS}), np. "Jan, Anna, Tomasz"`)
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(500)
    )
    .addStringOption(opt =>
      opt
        .setName('pytanie')
        .setDescription('Co rozstrzygasz? (np. "Kto zaczyna?" — wyświetlane w tytule)')
        .setRequired(false)
        .setMaxLength(120)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const rawOpcje = interaction.options.getString('opcje');
    const pytanie  = interaction.options.getString('pytanie')?.trim() ?? null;

    const opcje = parseOptions(rawOpcje);

    if (opcje.length < MIN_OPTIONS) {
      return interaction.editReply({
        content: `❌ Podaj co najmniej **${MIN_OPTIONS}** opcje rozdzielone przecinkami.`,
      });
    }

    if (opcje.length > MAX_OPTIONS) {
      return interaction.editReply({
        content: `❌ Maksymalnie **${MAX_OPTIONS}** opcji naraz. Podano: ${opcje.length}.`,
      });
    }

    // Sprawdź czy opcje są unikalne (ostrzeżenie, nie błąd)
    const duplicates = opcje.length !== new Set(opcje.map(o => o.toLowerCase())).size;

    // ── Pobierz imię IC gracza (fallback: nick Discord) ──────────────────────
    const userDb = await prisma.user
      .findUnique({
        where: { discordId: interaction.user.id },
        include: { character: true },
      })
      .catch(() => null);

    const char   = userDb?.character;
    const icName = char
      ? `${char.firstName} ${char.lastName}`
      : (interaction.member?.displayName ?? interaction.user.username);

    // ── Losowanie ─────────────────────────────────────────────────────────────
    const winnerIndex = Math.floor(Math.random() * opcje.length);
    const winner      = opcje[winnerIndex];

    // ── Formatuj listę opcji — zaznacz zwycięzcę ─────────────────────────────
    const listaOpcji = opcje
      .map((o, i) =>
        i === winnerIndex
          ? `**→ ${o}** 🏆`
          : `${o}`
      )
      .join('\n');

    // ── Buduj embed ───────────────────────────────────────────────────────────
    const title = pytanie
      ? `🎰 Losowanie: ${pytanie}`
      : '🎰 Losowanie';

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(title)
      .addFields(
        {
          name:   '🏆 Wylosowano',
          value:  `## ${winner}`,
          inline: false,
        },
        {
          name:   `📋 Wszystkie opcje (${opcje.length})`,
          value:  listaOpcji,
          inline: false,
        },
      )
      .setFooter({
        text:    `Losował/a: ${icName} • ${interaction.channel.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    if (duplicates) {
      embed.addFields({
        name:   '⚠️ Uwaga',
        value:  'Lista zawiera powtarzające się opcje — wynik może być nierównomierny.',
        inline: false,
      });
    }

    // ── Log ───────────────────────────────────────────────────────────────────
    logger.info(
      `/losuj | ${interaction.user.tag} (${icName}) | ` +
      `opcje: [${opcje.join(', ')}] | wylosowano: "${winner}"` +
      (pytanie ? ` | pytanie: "${pytanie}"` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
