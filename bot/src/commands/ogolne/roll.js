// Komenda /roll — rzut kostką RP
// Rozstrzyga sytuacje IC przez losowy wynik widoczny publicznie dla wszystkich
// Wynik zawiera imię IC postaci gracza, typ kostki, każdy wylosowany wynik
// oraz ocenę (krytyczny sukces / porażka / dobry / słaby)
// Dostępna dla: wszystkich zweryfikowanych graczy

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Konfiguracja kostek ───────────────────────────────────────────────────────
const DICE_CONFIG = {
  d4:   { sides: 4,   emoji: '🔷', label: 'k4'   },
  d6:   { sides: 6,   emoji: '🎲', label: 'k6'   },
  d8:   { sides: 8,   emoji: '🔶', label: 'k8'   },
  d10:  { sides: 10,  emoji: '🔵', label: 'k10'  },
  d12:  { sides: 12,  emoji: '🟣', label: 'k12'  },
  d20:  { sides: 20,  emoji: '⚪', label: 'k20'  },
  d100: { sides: 100, emoji: '🎯', label: 'k100' },
};

// ── Rzut jedną kostką ─────────────────────────────────────────────────────────
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

// ── Ocena wyniku na skali kostki → etykieta i kolor embeda ───────────────────
// Dla rzutu 1 kostką obsługuje "natural max" i "natural min" (nat 20 / nat 1)
function evaluateResult(total, maxPossible, minPossible, sides, count) {
  const isCritMax = count === 1 && total === sides;  // nat max (np. 20 na k20)
  const isCritMin = count === 1 && total === 1;       // nat min (1 na każdej)

  if (isCritMax) return { label: '🌟 KRYTYCZNY SUKCES!', color: COLORS.gold    };
  if (isCritMin) return { label: '💀 KRYTYCZNA PORAŻKA!', color: COLORS.error  };

  const range   = maxPossible - minPossible;
  const percent = range === 0 ? 1 : (total - minPossible) / range;

  if (percent >= 0.85) return { label: '✅ Znakomity wynik',       color: COLORS.success };
  if (percent >= 0.60) return { label: '🟡 Dobry wynik',           color: COLORS.warning };
  if (percent >= 0.35) return { label: '🟠 Przeciętny wynik',      color: 0xFF7F00        };
  return                      { label: '❌ Bardzo słaby wynik',     color: COLORS.error   };
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Rzuć kostką RP — wynik widoczny publicznie dla całego kanału')
    .addStringOption(opt =>
      opt.setName('kostka')
        .setDescription('Rodzaj kostki')
        .setRequired(true)
        .addChoices(
          { name: '🔷 k4   (4 ściany)',    value: 'd4'   },
          { name: '🎲 k6   (6 ścian)',     value: 'd6'   },
          { name: '🔶 k8   (8 ścian)',     value: 'd8'   },
          { name: '🔵 k10  (10 ścian)',    value: 'd10'  },
          { name: '🟣 k12  (12 ścian)',    value: 'd12'  },
          { name: '⚪ k20  (20 ścian)',    value: 'd20'  },
          { name: '🎯 k100 (percentowa)',  value: 'd100' },
        )
    )
    .addIntegerOption(opt =>
      opt.setName('ilosc')
        .setDescription('Ile kostek rzucić? (1–10, domyślnie: 1)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('kontekst')
        .setDescription('Co rozstrzygasz? (np. "Próba otwarcia zamka" — widoczne dla wszystkich)')
        .setMaxLength(150)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    // Publiczny rzut — wynik musi być widoczny dla wszystkich graczy na kanale
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą rzucać kostkami RP.',
      });
    }

    const diceKey  = interaction.options.getString('kostka');
    const count    = interaction.options.getInteger('ilosc') ?? 1;
    const kontekst = interaction.options.getString('kontekst')?.trim() ?? null;
    const dice     = DICE_CONFIG[diceKey];

    // Sanity check (nie powinien wystąpić z choices, ale warto zabezpieczyć)
    if (!dice) {
      return interaction.editReply({ content: '❌ Nieznany rodzaj kostki.' });
    }

    // Pobierz imię IC postaci gracza (fallback: nick Discord)
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

    // ── Rzuć kostkami ─────────────────────────────────────────────────────────
    const results  = Array.from({ length: count }, () => rollDie(dice.sides));
    const total    = results.reduce((a, b) => a + b, 0);
    const minPoss  = count;           // minimum: count × 1
    const maxPoss  = count * dice.sides; // maximum: count × sides

    // ── Oceń wynik ────────────────────────────────────────────────────────────
    const evaluation = evaluateResult(total, maxPoss, minPoss, dice.sides, count);

    // ── Sformatuj wyniki kostek ───────────────────────────────────────────────
    // Pojedyncza kostka: duży wynik w centrum; wiele kostek: lista + suma
    const diceDisplay = count === 1
      ? `# ${results[0]}`
      : results.map((r, i) => `Kostka ${i + 1}: **${r}**`).join('\n');

    // ── Buduj embed ───────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(evaluation.color)
      .setTitle(
        `${dice.emoji} Rzut ${count > 1 ? `${count}×` : ''}${dice.label.toUpperCase()} — ${evaluation.label}`
      )
      .setFooter({
        text: `${icName} • ${interaction.channel.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    // Kontekst rzutu (opcjonalny)
    if (kontekst) {
      embed.setDescription(`*„${kontekst}"*`);
    }

    // Pole z wynikami
    embed.addFields({
      name: count > 1 ? `🎲 Wyniki (${count} kostek)` : '🎲 Wynik',
      value: diceDisplay,
      inline: true,
    });

    // Suma tylko przy wielu kostkach
    if (count > 1) {
      embed.addFields({
        name: '➕ Suma',
        value: `**${total}** / ${maxPoss}`,
        inline: true,
      });
    }

    // Zakres możliwych wyników
    embed.addFields({
      name: '📊 Zakres',
      value: `${minPoss} – ${maxPoss}`,
      inline: true,
    });

    // ── Log ───────────────────────────────────────────────────────────────────
    logger.info(
      `/roll | ${interaction.user.tag} (${icName}) | ` +
      `${count}×${diceKey} | wynik: ${total}` +
      (kontekst ? ` | kontekst: "${kontekst}"` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
