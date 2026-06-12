// Komenda /plakietka — legitymacja służbowa IC
// Generuje sformatowaną odznakę służbową dla funkcjonariusza/ratownika.
// Staff może sprawdzić legitymację innego gracza; opcja publiczna wyświetla embed
// wszystkim (użyteczne podczas zatrzymań — pokaż legitymację podejrzanemu).

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Zsynchronizowane z duty.js — te same nazwy ról służby i on-duty
const SERVICE_CONFIG = [
  {
    role:      'Policja',
    onDutyRole:'Policja On-Duty',
    prefix:    'PD',
    emoji:     '🚔',
    color:     0x003087,
    label:     'Policja Fox Valley',
    rankLabel: 'Funkcjonariusz',
  },
  {
    role:      'EMS',
    onDutyRole:'EMS On-Duty',
    prefix:    'EMS',
    emoji:     '🚑',
    color:     0xC0392B,
    label:     'EMS Fox Valley',
    rankLabel: 'Ratownik Medyczny',
  },
  {
    role:      'Straż Pożarna',
    onDutyRole:'Straż On-Duty',
    prefix:    'PF',
    emoji:     '🚒',
    color:     0xE67E22,
    label:     'Straż Pożarna',
    rankLabel: 'Strażak',
  },
  {
    role:      'DOT',
    onDutyRole:'DOT On-Duty',
    prefix:    'DOT',
    emoji:     '🚧',
    color:     0xFF7F00,
    label:     'DOT (Drogownictwo)',
    rankLabel: 'Inspektor DOT',
  },
  {
    role:      'Straż Miejska',
    onDutyRole:'Straż Miejska On-Duty',
    prefix:    'SM',
    emoji:     '🛡️',
    color:     0x2ECC71,
    label:     'Straż Miejska',
    rankLabel: 'Strażnik Miejski',
  },
];

// Deterministyczny numer odznaki — unikalny na służbę, bez przechowywania w DB.
// Używa ostatnich cyfr Discord snowflake'a (modulo 9000 + 1000 → zakres 1000–9999).
function generateBadge(discordId, prefix) {
  const n = Number(BigInt(discordId) % 9000n) + 1000;
  return `${prefix}-${n}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plakietka')
    .setDescription('Wyświetl służbową legitymację IC (Policja / EMS / Straż / DOT / SM)')
    .addUserOption(opt =>
      opt
        .setName('gracz')
        .setDescription('Legitymacja innego funkcjonariusza — tylko Staff')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt
        .setName('publiczna')
        .setDescription('Pokaż legitymację publicznie w kanale (np. podczas zatrzymania)')
        .setRequired(false)
    ),

  async execute(interaction, client, prisma) {
    const targetUser = interaction.options.getUser('gracz');
    const isPublic   = interaction.options.getBoolean('publiczna') ?? false;

    if (targetUser && !isStaff(interaction.member)) {
      return interaction.reply({
        content: '❌ Tylko Staff może sprawdzać legitymacje innych graczy.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: !isPublic });

    const discordId    = targetUser?.id ?? interaction.user.id;
    const targetMember = targetUser
      ? await interaction.guild.members.fetch(discordId).catch(() => null)
      : interaction.member;

    if (!targetMember) {
      return interaction.editReply({ content: '❌ Nie znaleziono tego gracza na serwerze.' });
    }

    // Pierwsza pasująca służba (kolejność = priorytet wyświetlania)
    const service = SERVICE_CONFIG.find(s =>
      targetMember.roles.cache.some(r => r.name === s.role)
    );

    if (!service) {
      const msg = targetUser
        ? `❌ Gracz **${targetMember.displayName}** nie jest członkiem żadnej służby.`
        : '❌ Nie jesteś członkiem żadnej służby. Złóż podanie przez `/lista-prac`.';
      return interaction.editReply({ content: msg });
    }

    // Dane z bazy (postać + praca)
    const dbUser = await prisma.user
      .findUnique({
        where:   { discordId },
        include: { character: true },
        select: {
          character:    true,
          currentJob:   true,
          jobAssignedAt:true,
        },
      })
      .catch(() => null);

    const character   = dbUser?.character ?? null;
    const badgeNumber = generateBadge(discordId, service.prefix);
    const stanowisko  = dbUser?.currentJob ?? service.rankLabel;
    const assignedTs  = dbUser?.jobAssignedAt
      ? `<t:${Math.floor(new Date(dbUser.jobAssignedAt).getTime() / 1000)}:D>`
      : '*brak danych*';
    const isOnDuty    = targetMember.roles.cache.some(r => r.name === service.onDutyRole);
    const statusVal   = isOnDuty ? '🟢 Na służbie' : '🔴 Poza służbą';

    const embed = new EmbedBuilder()
      .setColor(service.color)
      .setAuthor({
        name:    `${service.emoji} ${service.label} — Legitymacja Służbowa`,
        iconURL: targetMember.displayAvatarURL({ size: 64 }),
      })
      .setTitle('🪪 LEGITYMACJA SŁUŻBOWA')
      .addFields(
        {
          name:   '👤 Funkcjonariusz',
          value:  character
            ? `${character.firstName} ${character.lastName}`
            : `*(brak postaci — ${targetMember.displayName})*`,
          inline: true,
        },
        {
          name:   '🔢 Nr odznaki',
          value:  `\`${badgeNumber}\``,
          inline: true,
        },
        {
          name:   `${service.emoji} Służba`,
          value:  service.label,
          inline: true,
        },
        {
          name:   '💼 Stanowisko',
          value:  stanowisko,
          inline: true,
        },
        {
          name:   '📅 W służbie od',
          value:  assignedTs,
          inline: true,
        },
        {
          name:   '🔆 Status',
          value:  statusVal,
          inline: true,
        },
      )
      .setFooter({ text: `AURORA Greenville RP — Legitymacja ${badgeNumber}` })
      .setTimestamp();

    logger.info(
      `/plakietka | ${interaction.user.tag}` +
      (targetUser ? ` → ${targetMember.user.tag}` : '') +
      ` | ${service.label} | odznaka: ${badgeNumber} | publiczna: ${isPublic}`
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
