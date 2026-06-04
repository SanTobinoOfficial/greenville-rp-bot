// Komenda /npc — dialog lub akcja postaci niezależnej (Host+)
// Host ogłasza kwestię lub akcję NPC bez ujawniania własnego nicku OOC.
// Uzupełnienie zestawu: /scena (nagłówek) · /narracja (opis) · /npc (głos NPC)
// Dostępna dla: Host+

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasRole, ROLES, noPermissionReply } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Typy wpisów NPC ────────────────────────────────────────────────────────────
const TYP_CONFIG = {
  mowi: {
    label:     'mówi',
    buildDesc: (imie, tresc) => `**${imie}:** *„${tresc}"*`,
    color:     0x5865F2,
  },
  robi: {
    label:     'wykonuje akcję',
    buildDesc: (imie, tresc) => `*${imie} ${tresc}*`,
    color:     0x9B59B6,
  },
  mysli: {
    label:     'myśli',
    buildDesc: (imie, tresc) => `*${imie} myśli: „${tresc}"*`,
    color:     0x7289DA,
  },
};

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('npc')
    .setDescription('Wygeneruj kwestię lub akcję NPC — widoczne publicznie na kanale (Host+)')
    .addStringOption(opt =>
      opt
        .setName('imie')
        .setDescription('Imię lub nazwa NPC (np. "Jan Kowalski", "Nieznajomy w kapturze", "Dyspozytor")')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(60)
    )
    .addStringOption(opt =>
      opt
        .setName('tresc')
        .setDescription('Kwestia dialogowa lub opis akcji NPC')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(400)
    )
    .addStringOption(opt =>
      opt
        .setName('typ')
        .setDescription('Typ wpisu NPC (domyślnie: mówi)')
        .setRequired(false)
        .addChoices(
          { name: '💬 Mówi — kwestia dialogowa',  value: 'mowi'  },
          { name: '🎭 Robi — akcja (jak /me)',      value: 'robi'  },
          { name: '💭 Myśli — monolog wewnętrzny', value: 'mysli' },
        )
    ),

  async execute(interaction, client, prisma) {
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member || !hasRole(member, ROLES.HOST)) {
      return interaction.reply(noPermissionReply('Host'));
    }

    await interaction.deferReply({ ephemeral: false });

    const imie   = interaction.options.getString('imie').trim();
    const tresc  = interaction.options.getString('tresc').trim();
    const typKey = interaction.options.getString('typ') ?? 'mowi';
    const typ    = TYP_CONFIG[typKey];

    if (!typ) {
      return interaction.editReply({ content: '❌ Nieznany typ wpisu NPC.' });
    }

    const embed = new EmbedBuilder()
      .setColor(typ.color)
      .setDescription(typ.buildDesc(imie, tresc))
      .setFooter({
        text:    `NPC • ${interaction.user.tag} • ${interaction.channel.name} • /npc`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    logger.info(
      `/npc | ${interaction.user.tag} | NPC: "${imie}" | typ: ${typ.label} | ` +
      `"${tresc.slice(0, 60)}${tresc.length > 60 ? '…' : ''}"`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
