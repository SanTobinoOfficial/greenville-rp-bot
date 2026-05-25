// Komenda /try — próba wykonania czynności RP (sukces / porażka)
// Gracz opisuje co postać próbuje zrobić; wynik jest rozstrzygany losowo
// na podstawie wybranego poziomu trudności — widoczny publicznie dla kanału.
// Uzupełnienie zestawu RP: /me (akcja) · /do (otoczenie) · /roll (kostka) · /try (próba)
// Dostępna dla: wszyscy zweryfikowani gracze

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Poziomy trudności ─────────────────────────────────────────────────────────
const DIFFICULTY = {
  latwe: {
    label:       'ŁATWE',
    emoji:       '🟢',
    successRate: 0.75,   // 75% szans na sukces
    opis:        'Czynność rutynowa — większość osób by to zrobiła.',
  },
  srednie: {
    label:       'ŚREDNIE',
    emoji:       '🟡',
    successRate: 0.50,   // 50% szans na sukces
    opis:        'Czynność wymagająca uwagi — wynik niepewny.',
  },
  trudne: {
    label:       'TRUDNE',
    emoji:       '🟠',
    successRate: 0.25,   // 25% szans na sukces
    opis:        'Czynność ryzykowna — sukces jest wyjątkiem.',
  },
  ekstremalne: {
    label:       'EKSTREMALNE',
    emoji:       '🔴',
    successRate: 0.10,   // 10% szans na sukces
    opis:        'Na granicy możliwości — powodzenie prawie niemożliwe.',
  },
};

// ── Opisy wyników (losowane dla różnorodności narracji) ───────────────────────
const SUCCESS_FLAVORS = [
  'Udało się! Postać wykonuje czynność sprawnie i bez komplikacji.',
  'Sukces! Doświadczenie i refleks pozwoliły osiągnąć zamierzony cel.',
  'Cel osiągnięty — sytuacja rozwiązana pomyślnie.',
  'Zadziałało. Postać z powodzeniem realizuje zamierzenie.',
  'Trafnie i skutecznie — czynność zakończona sukcesem.',
  'Postać osiąga to, do czego dążyła. Nic jej nie stało na przeszkodzie.',
];

const FAILURE_FLAVORS = [
  'Niestety, coś poszło nie tak. Czynność kończy się niepowodzeniem.',
  'Porażka. Mimo starań, zamierzenie się nie udało.',
  'Tym razem nie wyszło — sytuacja wymaga innego podejścia.',
  'Nie udało się. Pech lub brak umiejętności sprawił, że czynność zawiodła.',
  'Niepowodzenie. Postać nie zdołała osiągnąć zamierzonego celu.',
  'Za mało. Wysiłek był niewystarczający, by przezwyciężyć trudność.',
];

/** Zwraca losowy element tablicy */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('try')
    .setDescription('Podejmij próbę wykonania czynności RP — wynik losowy, widoczny publicznie')
    .addStringOption(opt =>
      opt
        .setName('czynnosc')
        .setDescription('Co postać próbuje zrobić? (np. "otworzyć zamek wytrychem")')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(200)
    )
    .addStringOption(opt =>
      opt
        .setName('trudnosc')
        .setDescription('Poziom trudności próby (domyślnie: Średnie)')
        .setRequired(false)
        .addChoices(
          { name: '🟢 Łatwe        (75% szans na sukces)',  value: 'latwe'       },
          { name: '🟡 Średnie       (50% szans na sukces)', value: 'srednie'     },
          { name: '🟠 Trudne        (25% szans na sukces)', value: 'trudne'      },
          { name: '🔴 Ekstremalne   (10% szans na sukces)', value: 'ekstremalne' },
        )
    ),

  async execute(interaction, client, prisma) {
    // Publiczna odpowiedź — wynik próby widzą wszyscy na kanale
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą używać tej komendy.',
      });
    }

    const czynnosc   = interaction.options.getString('czynnosc').trim();
    const diffKey    = interaction.options.getString('trudnosc') ?? 'srednie';
    const difficulty = DIFFICULTY[diffKey];

    // Sanity check (nie powinien wystąpić przez Discord choices, ale warto zabezpieczyć)
    if (!difficulty) {
      return interaction.editReply({ content: '❌ Nieprawidłowy poziom trudności.' });
    }

    // ── Pobierz imię IC gracza ────────────────────────────────────────────────
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

    // ── Rozstrzygnij próbę ────────────────────────────────────────────────────
    const roll    = Math.random();                     // 0.000 – 0.999…
    const success = roll < difficulty.successRate;

    const resultLabel  = success ? '✅ SUKCES'   : '❌ PORAŻKA';
    const resultColor  = success ? COLORS.success : COLORS.error;
    const resultFlavor = success
      ? pickRandom(SUCCESS_FLAVORS)
      : pickRandom(FAILURE_FLAVORS);

    // Wynik rzutu wyświetlany jako procent (1–100), próg jako procent
    const rollPct      = Math.max(1, Math.round(roll * 100));
    const thresholdPct = Math.round(difficulty.successRate * 100);

    // ── Buduj embed ───────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(resultColor)
      .setTitle(`🎲 PRÓBA RP — ${resultLabel}`)
      .setDescription(`*${icName} próbuje: **${czynnosc}***`)
      .addFields(
        {
          name:   `${difficulty.emoji} Trudność: ${difficulty.label}`,
          value:  difficulty.opis,
          inline: true,
        },
        {
          name:   '🎯 Wynik rzutu',
          value:  `**${rollPct}** / 100\n*(próg sukcesu: ≤ ${thresholdPct})*`,
          inline: true,
        },
        {
          name:   success ? '✅ Rezultat' : '❌ Rezultat',
          value:  resultFlavor,
          inline: false,
        },
      )
      .setFooter({
        text:    `${interaction.user.tag} • ${interaction.channel.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    // ── Log ───────────────────────────────────────────────────────────────────
    logger.info(
      `/try | ${interaction.user.tag} (${icName}) | "${czynnosc}" | ` +
      `trudnosc: ${difficulty.label} | rzut: ${rollPct} (próg: ${thresholdPct}) | ` +
      `wynik: ${success ? 'SUKCES' : 'PORAŻKA'}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
