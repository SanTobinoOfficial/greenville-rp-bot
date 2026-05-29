// Komenda /ad — ogłoszenie IC (in-character advertisement)
// Pozwala zweryfikowanym graczom publikować ogłoszenia IC: sprzedam, kupię, usługa, szukam
// Cooldown 10 minut między ogłoszeniami (in-memory, reset przy restarcie)
// Dostępna dla: wszyscy zweryfikowani mieszkańcy

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

const KATEGORIE = {
  sprzedam: { label: 'SPRZEDAM', emoji: '🏷️', color: 0x57F287 },
  kupie:    { label: 'KUPIĘ',    emoji: '🛒', color: 0x5865F2 },
  usluga:   { label: 'USŁUGA',   emoji: '🔧', color: 0xFEE75C },
  szukam:   { label: 'SZUKAM',   emoji: '🔍', color: 0xEB459E },
};

const COOLDOWN_MS = 10 * 60 * 1000;
const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ad')
    .setDescription('Opublikuj ogłoszenie IC — widoczne publicznie na kanale')
    .addStringOption(opt =>
      opt.setName('kategoria')
        .setDescription('Rodzaj ogłoszenia')
        .setRequired(true)
        .addChoices(
          { name: '🏷️ Sprzedam',  value: 'sprzedam' },
          { name: '🛒 Kupię',     value: 'kupie'    },
          { name: '🔧 Usługa',    value: 'usluga'   },
          { name: '🔍 Szukam',    value: 'szukam'   },
        )
    )
    .addStringOption(opt =>
      opt.setName('tresc')
        .setDescription('Treść ogłoszenia (co oferujesz / czego szukasz?)')
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(400)
    )
    .addStringOption(opt =>
      opt.setName('cena')
        .setDescription('Cena lub warunki (opcjonalnie, np. "do negocjacji")')
        .setMaxLength(80)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: false });

    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą publikować ogłoszenia IC.',
      });
    }

    // Sprawdź cooldown
    const now = Date.now();
    const lastUsed = cooldowns.get(interaction.user.id);
    if (lastUsed && now - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
      const min = Math.floor(remaining / 60);
      const sec = remaining % 60;
      return interaction.editReply({
        content: `⏳ Możesz opublikować kolejne ogłoszenie za **${min > 0 ? `${min} min ` : ''}${sec} sek**.`,
      });
    }

    // Pobierz imię IC postaci (fallback: nick Discord)
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

    const kategoriaKey = interaction.options.getString('kategoria');
    const tresc        = interaction.options.getString('tresc').trim();
    const cena         = interaction.options.getString('cena')?.trim() ?? null;
    const kat          = KATEGORIE[kategoriaKey];

    cooldowns.set(interaction.user.id, now);

    const embed = new EmbedBuilder()
      .setColor(kat.color)
      .setTitle(`${kat.emoji} [${kat.label}] Ogłoszenie IC`)
      .setDescription(tresc)
      .addFields({ name: '👤 Ogłoszeniodawca', value: icName, inline: true });

    if (cena) {
      embed.addFields({ name: '💵 Cena / Warunki', value: cena, inline: true });
    }

    embed
      .setFooter({
        text: `${interaction.user.tag} • ${interaction.channel.name}`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/ad | ${interaction.user.tag} (${icName}) | kat: ${kat.label} | "${tresc}"` +
      (cena ? ` | cena: "${cena}"` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
