// Komenda /scena — strukturalny nagłówek nowej sceny RP (Host+)
// Formalne ogłoszenie nowej sceny z lokacją i porą dnia — widoczne dla wszystkich.
// Uzupełnienie zestawu: /narracja (freeform) · /scena (strukturalny header sceny)
// Dostępna dla: Host+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Konfiguracja pór dnia ─────────────────────────────────────────────────────
const PORY_DNIA = {
  swit: {
    label:  'Świt',
    emoji:  '🌅',
    color:  0xFB923C,
    flavor: 'Pierwsze promienie słońca oświetlają Greenville. Chłodna cisza przed nowym dniem.',
  },
  poranek: {
    label:  'Poranek',
    emoji:  '🌤️',
    color:  0xFCD34D,
    flavor: 'Miasto budzi się do życia. Ruch uliczny zaczyna się wzmagać.',
  },
  poludnie: {
    label:  'Południe',
    emoji:  '☀️',
    color:  0xFEF08A,
    flavor: 'Słońce w zenicie nad Greenville. Gorący, aktywny dzień na ulicach.',
  },
  popoludnie: {
    label:  'Popołudnie',
    emoji:  '🌇',
    color:  0xF97316,
    flavor: 'Ruch w centrum narasta. Mieszkańcy wracają z pracy i szukają rozrywki.',
  },
  wieczor: {
    label:  'Wieczór',
    emoji:  '🌆',
    color:  0x7C3AED,
    flavor: 'Niebo nad Greenville nabiera ciemnych barw. Latarnie zapalają się jedna po drugiej.',
  },
  noc: {
    label:  'Noc',
    emoji:  '🌙',
    color:  0x1E1B4B,
    flavor: 'Greenville skrywa się w ciemności. Miasto żyje własnym, nocnym rytmem.',
  },
};

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('scena')
    .setDescription('Ogłoś nową scenę RP — nagłówek lokacji i pory dnia (Host+)')
    .addStringOption(opt =>
      opt
        .setName('lokacja')
        .setDescription('Lokacja IC (np. "Komisariat Fox Valley Police — garaż")')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(100)
    )
    .addStringOption(opt =>
      opt
        .setName('pora_dnia')
        .setDescription('Pora dnia w scenie RP')
        .setRequired(true)
        .addChoices(
          { name: '🌅 Świt',       value: 'swit'       },
          { name: '🌤️ Poranek',    value: 'poranek'    },
          { name: '☀️ Południe',   value: 'poludnie'   },
          { name: '🌇 Popołudnie', value: 'popoludnie' },
          { name: '🌆 Wieczór',    value: 'wieczor'    },
          { name: '🌙 Noc',        value: 'noc'        },
        )
    )
    .addStringOption(opt =>
      opt
        .setName('opis')
        .setDescription('Dodatkowy opis atmosfery lub szczegółów sceny (opcjonalne)')
        .setMaxLength(500)
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    await interaction.deferReply({ ephemeral: false });

    const lokacja = interaction.options.getString('lokacja').trim();
    const poraKey = interaction.options.getString('pora_dnia');
    const opisOpt = interaction.options.getString('opis')?.trim() ?? null;
    const pora    = PORY_DNIA[poraKey];

    // Opis główny: jeśli podano własny — użyj go; w przeciwnym razie flavor text pory dnia
    const description = opisOpt
      ? `*${opisOpt}*`
      : `*${pora.flavor}*`;

    const embed = new EmbedBuilder()
      .setColor(pora.color)
      .setTitle('🎬 NOWA SCENA')
      .setDescription(description)
      .addFields(
        { name: '📍 Lokacja',               value: lokacja,     inline: true },
        { name: `${pora.emoji} Pora dnia`,   value: pora.label,  inline: true },
      )
      .setFooter({
        text: `Scena ogłoszona przez ${interaction.user.tag} • /scena`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/scena | ${interaction.user.tag} | lokacja: "${lokacja}" | pora: ${pora.label}` +
        (opisOpt ? ` | opis: "${opisOpt.slice(0, 60)}${opisOpt.length > 60 ? '…' : ''}"` : '')
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
