// Komenda /blokada-drogi — IC zamknięcie drogi / strefa wyłączona z ruchu
// Służby (Policja, DOT, Straż Pożarna, Straż Miejska) mogą ogłosić IC zamknięcie odcinka drogi.
// Gracze mogą sprawdzić aktywne blokady, służby mogą je otwierać.
// In-memory — blokady wygasają automatycznie po 2h lub po ręcznym otwarciu.
// Dostępna dla: służby mundurowe + Staff (zamknij/otworz); Mieszkaniec+ (lista)

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embed');
const { isVerified, isStaff, ROLES } = require('../../utils/permissions');
const logger = require('../../utils/logger');

// ── Konfiguracja służb uprawnionych do blokowania dróg ───────────────────────
const UPRAWNIONE_SLUZBY = [
  { role: ROLES.POLICJA,       label: 'Policja',       emoji: '🚔', color: 0x003087 },
  { role: ROLES.DOT,           label: 'DOT',           emoji: '🚧', color: 0xFF7F00 },
  { role: ROLES.STRAZ,         label: 'Straż Pożarna', emoji: '🚒', color: 0xFEE75C },
  { role: ROLES.STRAZ_MIEJSKA, label: 'Straż Miejska', emoji: '🛡️', color: 0x2ECC71 },
];

// ── Powody blokady ─────────────────────────────────────────────────────────────
const POWODY = {
  wypadek:      { label: 'Wypadek drogowy',          emoji: '🚗' },
  scena_crime:  { label: 'Miejsce zdarzenia (scena)', emoji: '🚨' },
  pozar:        { label: 'Akcja straży pożarnej',    emoji: '🔥' },
  roboty:       { label: 'Roboty drogowe (DOT)',      emoji: '🦺' },
  patrol:       { label: 'Punkt kontrolny / patrol', emoji: '🛑' },
  inne:         { label: 'Inne',                      emoji: '📌' },
};

// ── In-memory store: id → blokada ─────────────────────────────────────────────
const blokady = new Map();
let nextId = 1;

const TTL_MS       = 2 * 60 * 60 * 1000;  // 2 godziny
const COOLDOWN_MS  = 30_000;               // 30 sekund między dodawaniem blokad
const cooldowns    = new Map();

function purgeExpired() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, b] of blokady) {
    if (b.createdAt < cutoff) blokady.delete(id);
  }
}

// Normalizuje string dla porównania nazw kanałów
const norm = s =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

// Szuka kanału ogłoszeń dot/drogowych
function findRoadChannel(guild) {
  const hints = ['dot-czat', 'drogowy', 'traffic', 'blokady', 'ruch-drogowy', 'dot'];
  return guild.channels.cache.find(
    c => c.isTextBased() && hints.some(h => norm(c.name).includes(norm(h)))
  ) ?? null;
}

async function getIcName(prisma, discordId, fallbackMember) {
  try {
    const u = await prisma.user.findUnique({
      where:   { discordId },
      include: { character: true },
    });
    if (u?.character) return `${u.character.firstName} ${u.character.lastName}`;
  } catch { /* cisza */ }
  return fallbackMember?.displayName ?? fallbackMember?.user?.username ?? 'Nieznana postać';
}

// Wykryj służbę wywołującego spośród uprawnionych
function getService(member) {
  return UPRAWNIONE_SLUZBY.find(s => member.roles.cache.some(r => r.name === s.role)) ?? null;
}

// ── Komenda ───────────────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('blokada-drogi')
    .setDescription('IC zamknięcie drogi — ogłaszaj, przeglądaj i otwieraj blokady drogowe')
    .addSubcommand(sub =>
      sub
        .setName('zamknij')
        .setDescription('Zarejestruj IC zamknięcie odcinka drogi (Policja / DOT / Straż / SM / Staff)')
        .addStringOption(opt =>
          opt
            .setName('lokalizacja')
            .setDescription('Dokładna lokalizacja blokady IC (np. "Main St & Oak Ave, obie jezdnie")')
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(150)
        )
        .addStringOption(opt =>
          opt
            .setName('powod')
            .setDescription('Powód zamknięcia drogi')
            .setRequired(true)
            .addChoices(
              { name: '🚗 Wypadek drogowy',          value: 'wypadek'     },
              { name: '🚨 Miejsce zdarzenia (scena)', value: 'scena_crime' },
              { name: '🔥 Akcja straży pożarnej',    value: 'pozar'       },
              { name: '🦺 Roboty drogowe (DOT)',      value: 'roboty'      },
              { name: '🛑 Punkt kontrolny / patrol', value: 'patrol'      },
              { name: '📌 Inne',                      value: 'inne'        },
            )
        )
        .addStringOption(opt =>
          opt
            .setName('szczegoly')
            .setDescription('Dodatkowe informacje o blokadzie (opcjonalnie, maks. 200 zn.)')
            .setRequired(false)
            .setMaxLength(200)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('otworz')
        .setDescription('Usuń blokadę drogową — droga wolna (Policja / DOT / Straż / SM / Staff)')
        .addIntegerOption(opt =>
          opt
            .setName('id')
            .setDescription('Numer ID blokady (widoczny w /blokada-drogi lista)')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Wyświetl wszystkie aktywne IC blokady drogowe')
    ),

  async execute(interaction, client, prisma) {
    purgeExpired();

    const sub      = interaction.options.getSubcommand();
    const userId   = interaction.user.id;
    const member   = interaction.member;
    const service  = getService(member);
    const staffOk  = isStaff(member);

    // ── LISTA — dostępna dla wszystkich Mieszkaniec+ ──────────────────────────
    if (sub === 'lista') {
      if (!isVerified(member)) {
        return interaction.reply({
          content: '❌ Tylko zweryfikowani mieszkańcy mogą przeglądać blokady.',
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: false });

      const active = [...blokady.values()].sort((a, b) => a.createdAt - b.createdAt);

      if (active.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setTitle('🛣️ Blokady drogowe IC — Brak aktywnych')
              .setDescription('Wszystkie drogi są wolne. Brak aktywnych blokad IC.\n\n*Służby mogą zarejestrować blokadę przez `/blokada-drogi zamknij`.*')
              .setFooter({ text: 'AURORA Greenville RP — Zarządzanie Ruchem IC' })
              .setTimestamp(),
          ],
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0xFF7F00)
        .setTitle(`🚧 Aktywne Blokady Drogowe IC — ${active.length}`);

      for (const b of active) {
        const powodData = POWODY[b.powodKey] ?? POWODY.inne;
        const expiresTs = Math.floor((b.createdAt + TTL_MS) / 1000);
        const createdTs = Math.floor(b.createdAt / 1000);

        embed.addFields({
          name:  `${powodData.emoji} #${b.id} — ${powodData.label}`,
          value: [
            `📍 **Lokalizacja:** ${b.lokalizacja}`,
            `${b.serviceEmoji} **Służba:** ${b.serviceLabel}`,
            `👤 **Oficer IC:** ${b.icName}`,
            b.szczegoly ? `📝 **Szczegóły:** ${b.szczegoly}` : null,
            `⏳ **Wygasa:** <t:${expiresTs}:R> · Ogłoszono <t:${createdTs}:R>`,
          ].filter(Boolean).join('\n'),
          inline: false,
        });
      }

      embed
        .setFooter({ text: 'AURORA Greenville RP — Zarządzanie Ruchem IC | /blokada-drogi otworz id:<numer>' })
        .setTimestamp();

      logger.info(`/blokada-drogi lista | ${interaction.user.tag} | ${active.length} aktywnych`);

      return interaction.editReply({ embeds: [embed] });
    }

    // ── ZAMKNIJ i OTWORZ — tylko uprawnione służby lub Staff ─────────────────
    if (!service && !staffOk) {
      return interaction.reply({
        content:
          '❌ Tylko uprawnione służby (Policja, DOT, Straż Pożarna, Straż Miejska) ' +
          'lub Staff mogą zarządzać blokadami drogowymi IC.',
        ephemeral: true,
      });
    }

    // ── ZAMKNIJ ───────────────────────────────────────────────────────────────
    if (sub === 'zamknij') {
      // Cooldown
      const lastUsed = cooldowns.get(userId) ?? 0;
      const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
      if (remaining > 0) {
        return interaction.reply({
          content: `⏳ Odczekaj jeszcze **${Math.ceil(remaining / 1000)}s** przed zarejestrowaniem kolejnej blokady.`,
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const lokalizacja = interaction.options.getString('lokalizacja').trim();
      const powodKey    = interaction.options.getString('powod');
      const szczegoly   = interaction.options.getString('szczegoly')?.trim() ?? null;
      const powodData   = POWODY[powodKey] ?? POWODY.inne;

      // Wyznacz służbę dla embeda
      const svcLabel = service ? service.label : 'Staff';
      const svcEmoji = service ? service.emoji : '🛡️';
      const svcColor = service ? service.color : 0x5865F2;

      const icName = await getIcName(prisma, userId, member);
      const id     = nextId++;
      const now    = Date.now();

      cooldowns.set(userId, now);

      blokady.set(id, {
        id,
        discordId:    userId,
        icName,
        serviceLabel: svcLabel,
        serviceEmoji: svcEmoji,
        lokalizacja,
        powodKey,
        szczegoly,
        createdAt:    now,
      });

      const expiresTs = Math.floor((now + TTL_MS) / 1000);
      const createdTs = Math.floor(now / 1000);

      // Embed publiczny — do kanału DOT/drogowego
      const publicEmbed = new EmbedBuilder()
        .setColor(svcColor)
        .setTitle(`🚧 BLOKADA DROGI IC — #${id}`)
        .setDescription(`**⚠️ Odcinek drogi zamknięty — dostosuj trasę!**`)
        .addFields(
          { name: `${powodData.emoji} Powód`,       value: powodData.label, inline: true  },
          { name: `${svcEmoji} Służba`,             value: svcLabel,        inline: true  },
          { name: '📍 Lokalizacja',                  value: lokalizacja,     inline: false },
          { name: '👤 Oficer IC',                   value: icName,          inline: true  },
          { name: '⏳ Szacowane wygaśnięcie',       value: `<t:${expiresTs}:R>`, inline: true },
        );

      if (szczegoly) {
        publicEmbed.addFields({ name: '📝 Szczegóły', value: szczegoly, inline: false });
      }

      publicEmbed
        .setFooter({ text: `AURORA Greenville RP — ID #${id} | Otwarcie: /blokada-drogi otworz id:${id}` })
        .setTimestamp();

      const roadChannel = findRoadChannel(interaction.guild);
      if (roadChannel) {
        await roadChannel.send({ embeds: [publicEmbed] }).catch(err =>
          logger.warn(`/blokada-drogi zamknij: błąd wysyłki do kanału ${roadChannel.name}: ${err.message}`)
        );
      }

      logger.info(
        `/blokada-drogi zamknij | ${interaction.user.tag} (${icName}) | #${id} | ` +
        `${svcLabel} | powód: ${powodData.label} | lok: "${lokalizacja}"` +
        (szczegoly ? ` | szcz: "${szczegoly.slice(0, 60)}"` : '')
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(svcColor)
            .setTitle('🚧 Blokada drogowa IC zarejestrowana')
            .setDescription(
              roadChannel
                ? `Blokada **#${id}** ogłoszona na <#${roadChannel.id}>.`
                : `Blokada **#${id}** zarejestrowana. Użyj \`/blokada-drogi lista\` aby zobaczyć aktywne blokady.`
            )
            .addFields(
              { name: '🆔 Numer',               value: `**#${id}**`,          inline: true  },
              { name: `${powodData.emoji} Powód`, value: powodData.label,      inline: true  },
              { name: '📍 Lokalizacja',           value: lokalizacja,           inline: false },
              { name: '⏳ Wygasa',                value: `<t:${expiresTs}:R>`, inline: true  },
              { name: '🕐 Zarejestrowano',        value: `<t:${createdTs}:T>`, inline: true  },
            )
            .setFooter({ text: `Usuń przez /blokada-drogi otworz id:${id} • AURORA Greenville RP` })
            .setTimestamp(),
        ],
      });
    }

    // ── OTWORZ ────────────────────────────────────────────────────────────────
    if (sub === 'otworz') {
      await interaction.deferReply({ ephemeral: true });

      const id     = interaction.options.getInteger('id');
      const blokada = blokady.get(id);

      if (!blokada) {
        return interaction.editReply({
          content:
            `❌ Blokada **#${id}** nie istnieje lub już wygasła (TTL: 2h).\n` +
            'Użyj `/blokada-drogi lista` aby zobaczyć aktywne numery.',
        });
      }

      const isOwner   = blokada.discordId === userId;
      const canRemove = isOwner || staffOk;

      if (!canRemove) {
        return interaction.editReply({
          content:
            `❌ Blokadę **#${id}** może usunąć tylko oficer, który ją zarejestrował ` +
            `(**${blokada.icName}**) lub Staff.`,
        });
      }

      blokady.delete(id);

      const powodData = POWODY[blokada.powodKey] ?? POWODY.inne;

      const roadChannel = findRoadChannel(interaction.guild);
      if (roadChannel) {
        await roadChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(COLORS.success)
              .setTitle(`✅ BLOKADA #${id} — Droga Otwarta`)
              .setDescription('Odcinek drogi został otwarty — ruch drogowy może być wznowiony.')
              .addFields(
                { name: `${powodData.emoji} Powód blokady`, value: powodData.label,       inline: true  },
                { name: '📍 Lokalizacja',                   value: blokada.lokalizacja,   inline: false },
              )
              .setFooter({ text: 'AURORA Greenville RP — Zarządzanie Ruchem IC' })
              .setTimestamp(),
          ],
        }).catch(err =>
          logger.warn(`/blokada-drogi otworz: błąd wysyłki do kanału ${roadChannel.name}: ${err.message}`)
        );
      }

      logger.info(
        `/blokada-drogi otworz | ${interaction.user.tag} | #${id} | ` +
        `${isOwner ? 'właściciel' : 'STAFF'} | lok: "${blokada.lokalizacja}"`
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle(`✅ Blokada #${id} — Droga otwarta`)
            .setDescription('Blokada drogowa IC została usunięta.')
            .addFields(
              { name: '🆔 Numer',              value: `**#${id}**`,           inline: true  },
              { name: `${powodData.emoji} Powód`, value: powodData.label,     inline: true  },
              { name: '📍 Lokalizacja',          value: blokada.lokalizacja,  inline: false },
            )
            .setFooter({ text: 'AURORA Greenville RP — Zarządzanie Ruchem IC' })
            .setTimestamp(),
        ],
      });
    }
  },
};
