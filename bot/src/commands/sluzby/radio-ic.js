// Komenda /radio-ic — transmisja radiowa IC dla służb
// Wysyła krótką wiadomość radiową na kanał wewnętrzny służby.
// Różnica od /megafon: megafon jest publiczny (słyszą go cywile na kanale),
// radio-ic trafia wyłącznie do kanału wewnętrznego danej służby — komunikacja między funkcjonariuszami.
// Dostępna dla: funkcjonariusze On-Duty lub Staff

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isStaff } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// Cooldown 30 sekund na gracza (nie blokuje, ale zapobiega spamowi na kanale służby)
const cooldowns = new Map();
const COOLDOWN_MS = 30_000;

const SERVICE_CONFIG = [
  {
    onDutyRole:   'Policja On-Duty',
    label:        'Policja',
    emoji:        '🚔',
    color:        0x003087,
    channelHints: ['policja-czat', 'policja-radio', 'dyspozytorni'],
  },
  {
    onDutyRole:   'EMS On-Duty',
    label:        'EMS',
    emoji:        '🚑',
    color:        0xED4245,
    channelHints: ['ems-czat', 'ems-radio', 'dyspozytorni'],
  },
  {
    onDutyRole:   'Straż On-Duty',
    label:        'Straż Pożarna',
    emoji:        '🚒',
    color:        0xFEE75C,
    channelHints: ['straz-czat', 'straz-radio'],
  },
  {
    onDutyRole:   'DOT On-Duty',
    label:        'DOT',
    emoji:        '🚧',
    color:        0xFF7F00,
    channelHints: ['dot-czat', 'dot-radio'],
  },
  {
    onDutyRole:   'Straż Miejska On-Duty',
    label:        'Straż Miejska',
    emoji:        '🛡️',
    color:        0x2ECC71,
    channelHints: ['sm-czat', 'sm-radio', 'straz-miejska'],
  },
  {
    onDutyRole:   'Taksówkarz On-Duty',
    label:        'Taksówkarz',
    emoji:        '🚕',
    color:        0xF1C40F,
    channelHints: ['taksowka', 'taxi', 'ogolny'],
  },
  {
    onDutyRole:   'NPS On-Duty',
    label:        'NPS',
    emoji:        '🌲',
    color:        0x228B22,
    channelHints: ['nps-czat', 'nps-radio'],
  },
];

const norm = s =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

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
    // fallback poniżej
  }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznany';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('radio-ic')
    .setDescription('Wyślij transmisję radiową IC do kanału wewnętrznego służby (tylko On-Duty)')
    .addStringOption(opt =>
      opt.setName('tresc')
        .setDescription('Treść transmisji radiowej (np. "Jestem przy Centrum, proszę o backup")')
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(250)
    )
    .addStringOption(opt =>
      opt.setName('sygnatura')
        .setDescription('Sygnatura jednostki (np. "P-1", "EMS-3") — domyślnie Twoje imię IC')
        .setRequired(false)
        .setMinLength(1)
        .setMaxLength(30)
    ),

  async execute(interaction, client, prisma) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;

    // Wykryj aktywną służbę na podstawie roli On-Duty
    const activeService = SERVICE_CONFIG.find(s =>
      member.roles.cache.some(r => r.name === s.onDutyRole)
    );

    if (!activeService && !isStaff(member)) {
      return interaction.editReply({
        content:
          '❌ Radio IC dostępne tylko dla funkcjonariuszy **On-Duty**.\n' +
          'Użyj `/duty`, aby wejść na służbę, a następnie spróbuj ponownie.',
      });
    }

    const service = activeService ?? { label: 'Staff', emoji: '🛡️', color: 0x5865F2, channelHints: ['ogolny'] };

    // Sprawdź cooldown
    const userId = interaction.user.id;
    const lastUsed = cooldowns.get(userId);
    if (lastUsed && Date.now() - lastUsed < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - lastUsed)) / 1000);
      return interaction.editReply({
        content: `⏳ Odczekaj **${remaining} sek.** przed kolejną transmisją radiową.`,
      });
    }

    const tresc     = interaction.options.getString('tresc').trim();
    const icName    = await getIcName(prisma, userId, member);
    const sygnatura = (interaction.options.getString('sygnatura') ?? icName).trim();

    // Znajdź kanał wewnętrzny służby
    const serviceChannel = interaction.guild.channels.cache.find(c => {
      if (!c.isTextBased()) return false;
      const cn = norm(c.name);
      return service.channelHints.some(hint => cn.includes(norm(hint)));
    });

    const ts = Math.floor(Date.now() / 1000);

    const radioEmbed = new EmbedBuilder()
      .setColor(service.color)
      .setTitle(`${service.emoji} RADIO IC — ${service.label}`)
      .setDescription(
        `📡 \`[${sygnatura}]\` **— odbiór —** \`[DISPATCH]\`\n\n` +
        `*"${tresc}"*`
      )
      .addFields(
        { name: '👮 Funkcjonariusz', value: icName,               inline: true },
        { name: '📻 Sygnatura',      value: `\`${sygnatura}\``,   inline: true },
        { name: '🕐 Czas',           value: `<t:${ts}:T>`,        inline: true },
      )
      .setFooter({
        text: `${interaction.user.tag} • /radio-ic • AURORA Greenville RP`,
        iconURL: interaction.user.displayAvatarURL({ size: 32 }),
      })
      .setTimestamp();

    // Wyślij na kanał wewnętrzny służby
    let channelSent = false;
    if (serviceChannel) {
      await serviceChannel.send({ embeds: [radioEmbed] }).catch(err => {
        logger.warn(`/radio-ic: nie udało się wysłać na ${serviceChannel.name}: ${err.message}`);
      });
      channelSent = true;
    }

    // Jeśli kanał służby nie istnieje lub komenda użyta właśnie na nim — wyślij też bezpośrednio
    if (!serviceChannel || serviceChannel.id === interaction.channelId) {
      await interaction.channel.send({ embeds: [radioEmbed] }).catch(() => null);
    }

    // Zarejestruj cooldown po udanym wysłaniu
    cooldowns.set(userId, Date.now());

    logger.info(
      `/radio-ic | ${interaction.user.tag} (${icName}) | [${sygnatura}] | ${service.label} | ` +
      `"${tresc.slice(0, 80)}${tresc.length > 80 ? '…' : ''}"` +
      (channelSent ? ` → #${serviceChannel.name}` : ' → brak kanału służby')
    );

    await interaction.editReply({
      content: channelSent
        ? `✅ Transmisja radiowa wysłana na <#${serviceChannel.id}>.\n` +
          `**[${sygnatura}]**: *"${tresc}"*`
        : `✅ Transmisja radiowa wysłana.\n` +
          `⚠️ Nie znaleziono dedykowanego kanału radiowego dla **${service.label}** — wiadomość trafiła na bieżący kanał.\n` +
          `**[${sygnatura}]**: *"${tresc}"*`,
    });
  },
};
