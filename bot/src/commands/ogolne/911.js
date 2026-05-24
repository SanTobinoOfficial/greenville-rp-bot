// Komenda /911 — Zgłoszenie alarmowe RP
// Pozwala zweryfikowanemu graczowi wezwać służby RP przez numer alarmowy.
// Tworzy wpis CadCall w bazie, pinguje rolę On-Duty i wysyła embed do kanału dyspozytorni.
// Odpowiedź do wywołującego jest ephemeral — tożsamość dzwoniącego nie pojawia się publicznie.
// Dostępna dla: Mieszkaniec+ (zweryfikowany gracz)

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Konfiguracja wzywanych służb ───────────────────────────────────────────────
const SERVICE_CONFIG = {
  policja: {
    label:      'Policja',
    emoji:      '🚔',
    nature:     'Wezwanie Policji',
    onDutyRole: 'Policja On-Duty',
    baseRole:   'Policja',
    channelHints: ['dyspozytornia', 'policja-czat'],
    color:      0x003087,
  },
  ems: {
    label:      'EMS — Pogotowie',
    emoji:      '🚑',
    nature:     'Wezwanie EMS',
    onDutyRole: 'EMS On-Duty',
    baseRole:   'EMS',
    channelHints: ['dyspozytornia', 'ems-czat'],
    color:      0xED4245,
  },
  straz: {
    label:      'Straż Pożarna',
    emoji:      '🚒',
    nature:     'Wezwanie Straży Pożarnej',
    onDutyRole: 'Straż On-Duty',
    baseRole:   'Straż Pożarna',
    channelHints: ['dyspozytornia', 'straz-czat'],
    color:      0xFEE75C,
  },
  straz_miejska: {
    label:      'Straż Miejska',
    emoji:      '🛡️',
    nature:     'Wezwanie Straży Miejskiej',
    onDutyRole: 'Straż Miejska On-Duty',
    baseRole:   'Straż Miejska',
    channelHints: ['dyspozytornia', 'sm-czat'],
    color:      0x2ECC71,
  },
  dot: {
    label:      'DOT',
    emoji:      '🚧',
    nature:     'Wezwanie DOT',
    onDutyRole: 'DOT On-Duty',
    baseRole:   'DOT',
    channelHints: ['dyspozytornia', 'dot-czat'],
    color:      0xFF7F00,
  },
};

// ── Priorytety wezwań ─────────────────────────────────────────────────────────
const PRIORITY_MAP = {
  niski:  { label: 'NISKI',   cadValue: 'LOW',    emoji: '🟢', color: 0x57F287 },
  sredni: { label: 'ŚREDNI',  cadValue: 'MEDIUM', emoji: '🟡', color: 0xFEE75C },
  wysoki: { label: 'WYSOKI',  cadValue: 'HIGH',   emoji: '🔴', color: 0xED4245 },
};

// Normalizuje string (usuwa diakrytyki, zamienia ł, lowercase)
const norm = s =>
  s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('911')
    .setDescription('Zadzwoń na numer alarmowy — wezwij służby RP (Policja / EMS / Straż / DOT)')
    .addStringOption(opt =>
      opt.setName('sluzba')
        .setDescription('Jaką służbę wzywasz?')
        .setRequired(true)
        .addChoices(
          { name: '🚔 Policja',          value: 'policja'       },
          { name: '🚑 EMS — Pogotowie',   value: 'ems'           },
          { name: '🚒 Straż Pożarna',     value: 'straz'         },
          { name: '🛡️ Straż Miejska',     value: 'straz_miejska' },
          { name: '🚧 DOT',               value: 'dot'           },
        )
    )
    .addStringOption(opt =>
      opt.setName('lokalizacja')
        .setDescription('Podaj dokładną lokalizację zdarzenia (np. "Skrzyżowanie Main St & Oak Ave")')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(120)
    )
    .addStringOption(opt =>
      opt.setName('opis')
        .setDescription('Krótki opis zdarzenia (co się dzieje?)')
        .setRequired(true)
        .setMinLength(5)
        .setMaxLength(300)
    )
    .addStringOption(opt =>
      opt.setName('priorytet')
        .setDescription('Priorytet wezwania (domyślnie: ŚREDNI)')
        .setRequired(false)
        .addChoices(
          { name: '🟢 Niski',  value: 'niski'  },
          { name: '🟡 Średni', value: 'sredni' },
          { name: '🔴 Wysoki', value: 'wysoki' },
        )
    ),

  async execute(interaction, client, prisma) {
    // Odpowiedź ephemeral — dzwoniący nie ujawnia tożsamości publicznie
    await interaction.deferReply({ ephemeral: true });

    // Sprawdź weryfikację gracza
    if (!isVerified(interaction.member)) {
      return interaction.editReply({
        content: '❌ Tylko zweryfikowani mieszkańcy mogą wzywać służby.',
      });
    }

    const serviceKey  = interaction.options.getString('sluzba');
    const lokalizacja = interaction.options.getString('lokalizacja').trim();
    const opisInput   = interaction.options.getString('opis').trim();
    const prioKey     = interaction.options.getString('priorytet') ?? 'sredni';

    const svc  = SERVICE_CONFIG[serviceKey];
    const prio = PRIORITY_MAP[prioKey];

    // Sanity check (shouldn't happen due to Discord choices, but guard anyway)
    if (!svc || !prio) {
      return interaction.editReply({ content: '❌ Nieprawidłowe dane wezwania.' });
    }

    // ── Pobierz imię IC gracza ────────────────────────────────────────────────
    const userDb = await prisma.user.findUnique({
      where: { discordId: interaction.user.id },
      include: { character: true },
    }).catch(() => null);

    const char   = userDb?.character;
    const icName = char
      ? `${char.firstName} ${char.lastName}`
      : (interaction.member?.displayName ?? interaction.user.username);

    // ── Utwórz wezwanie w systemie CAD ───────────────────────────────────────
    let cadCall;
    try {
      cadCall = await prisma.cadCall.create({
        data: {
          nature:      svc.nature,
          location:    lokalizacja,
          description: opisInput,
          priority:    prio.cadValue,
          status:      'PENDING',
          reportedBy:  interaction.user.id,
        },
      });
    } catch (err) {
      logger.error(`911: Błąd tworzenia CadCall:`, err.message);
      return interaction.editReply({
        content: '❌ Wystąpił błąd podczas wysyłania wezwania. Spróbuj ponownie.',
      });
    }

    logger.info(
      `911 | CAD #${cadCall.number} | ${icName} (${interaction.user.tag}) | ` +
      `${svc.label} | ${prio.label} | Lok: ${lokalizacja}`
    );

    // ── Znajdź kanał dyspozytorni (pierwsza pasująca wskazówka) ──────────────
    const dispatchChannel = interaction.guild.channels.cache.find(c => {
      if (!c.isTextBased()) return false;
      const cn = norm(c.name);
      return svc.channelHints.some(hint => cn.includes(norm(hint)));
    });

    // ── Znajdź rolę do pingowania (On-Duty, a jako fallback — bazowa rola) ───
    const onDutyRole = interaction.guild.roles.cache.find(r => r.name === svc.onDutyRole);
    const baseRole   = onDutyRole
      ? null
      : interaction.guild.roles.cache.find(r => r.name === svc.baseRole);
    const pingRole   = onDutyRole ?? baseRole ?? null;

    // ── Buduj embed dla służb ─────────────────────────────────────────────────
    const callEmbed = new EmbedBuilder()
      .setColor(prio.color)
      .setTitle(`${svc.emoji} WEZWANIE 911 — ${svc.label} | CAD #${cadCall.number}`)
      .setDescription(
        `${prio.emoji} **Priorytet: ${prio.label}** ┃ 🔴 Status: **OCZEKUJE**`
      )
      .addFields(
        { name: '📍 Lokalizacja',        value: lokalizacja,                                    inline: false },
        { name: '📋 Opis zdarzenia',     value: opisInput,                                     inline: false },
        { name: '🕐 Czas zgłoszenia',    value: `<t:${Math.floor(Date.now() / 1000)}:T>`,     inline: true  },
        { name: '🆔 Numer CAD',          value: `\`#${cadCall.number}\``,                       inline: true  },
        { name: '👤 Zgłaszający (IC)',   value: icName,                                        inline: true  },
      )
      .setFooter({ text: 'AURORA Greenville RP — Dyspozytornia 911' })
      .setTimestamp();

    // ── Wyślij wezwanie na kanał służby ──────────────────────────────────────
    if (dispatchChannel) {
      await dispatchChannel.send({
        content: pingRole
          ? `<@&${pingRole.id}> 🚨 **NOWE WEZWANIE 911!**`
          : '🚨 **NOWE WEZWANIE 911!**',
        embeds: [callEmbed],
      }).catch(err =>
        logger.error(`911: Błąd wysyłki embeda na kanał ${dispatchChannel.name}:`, err.message)
      );
    } else {
      logger.warn(
        `911: Nie znaleziono kanału dyspozytorni dla "${serviceKey}" (szukano: ${svc.channelHints.join(', ')})`
      );
    }

    // ── Odpowiedź ephemeral do wywołującego ───────────────────────────────────
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle(`${svc.emoji} Wezwanie wysłane!`)
          .setDescription(
            [
              `✅ Twoje zgłoszenie **#${cadCall.number}** zostało odebrane przez dyspozytornię.`,
              `Służby zostały powiadomione. Pozostań na miejscu zdarzenia i czekaj na przybycie pomocy.`,
              ``,
              `> ⚠️ Fałszywe wezwania służb podlegają karom RP.`,
            ].join('\n')
          )
          .addFields(
            { name: '🔢 Numer CAD',   value: `\`#${cadCall.number}\``, inline: true  },
            { name: '📍 Lokalizacja', value: lokalizacja,              inline: true  },
            { name: `${prio.emoji} Priorytet`, value: prio.label,      inline: true  },
          )
          .setFooter({ text: 'AURORA Greenville RP — Numer alarmowy 911' })
          .setTimestamp(),
      ],
    });
  },
};
