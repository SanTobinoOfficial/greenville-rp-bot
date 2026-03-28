// Tworzenie struktury serwera Discord
// Tworzy wszystkie role, kategorie i kanały zgodnie ze specyfikacją

const { ChannelType, PermissionFlagsBits, OverwriteType } = require('discord.js');
const logger = require('../utils/logger');

// ==================== ROLE ====================

const ROLES_CONFIG = [
  // Nazwa, kolor hex (jako integer), hoisted
  { name: 'Owner',           color: 0xFFD700, hoist: true,  position: 11 },
  { name: 'Co-Owner',        color: 0xFF6B00, hoist: true,  position: 10 },
  { name: 'Administrator',   color: 0xE74C3C, hoist: true,  position: 9  },
  { name: 'Moderator',       color: 0xE67E22, hoist: true,  position: 8  },
  { name: 'Helper',          color: 0xF1C40F, hoist: true,  position: 7  },
  { name: 'Host',            color: 0x9B59B6, hoist: true,  position: 6  },
  { name: 'HR',              color: 0x3498DB, hoist: true,  position: 5  },
  { name: 'Mieszkaniec',     color: 0x2ECC71, hoist: false, position: 4  },
  { name: 'Booster',         color: 0xFF73FA, hoist: false, position: 3  },
  { name: 'Wspierający',     color: 0xA855F7, hoist: false, position: 3  },
  { name: 'Policja',         color: 0x3B82F6, hoist: false, position: 2  },
  { name: 'Straż Pożarna',   color: 0xEF4444, hoist: false, position: 2  },
  { name: 'EMS',             color: 0x10B981, hoist: false, position: 2  },
  { name: 'DOT',             color: 0xF59E0B, hoist: false, position: 2  },
  { name: 'Straż Miejska',   color: 0x6366F1, hoist: false, position: 2  },
  { name: 'Taksówkarz',      color: 0xEAB308, hoist: false, position: 2  },
  { name: 'Kat. AM',         color: 0x94A3B8, hoist: false, position: 1  },
  { name: 'Kat. A1',         color: 0x94A3B8, hoist: false, position: 1  },
  { name: 'Kat. A2',         color: 0x94A3B8, hoist: false, position: 1  },
  { name: 'Kat. A',          color: 0x94A3B8, hoist: false, position: 1  },
  { name: 'Kat. B',          color: 0x94A3B8, hoist: false, position: 1  },
  { name: 'Kat. C',          color: 0x94A3B8, hoist: false, position: 1  },
  { name: 'Kat. D',          color: 0x94A3B8, hoist: false, position: 1  },
  { name: 'Niezweryfikowany',color: 0x71717A, hoist: false, position: 0  },
];

// ==================== KANAŁY ====================

// Każdy kanał to obiekt z: name, type, topic, nsfw, userLimit, permissionOverwrites, rateLimitPerUser
// type: 'text' | 'voice' | 'category'

function buildChannelStructure(roles, everyoneRole) {
  const staffRoles = ['Helper', 'HR', 'Host', 'Moderator', 'Administrator', 'Co-Owner', 'Owner'];

  const getStaffIds = () => staffRoles.map(n => roles[n]).filter(Boolean);

  // Uprawnienia tylko dla staffu (niewidoczne dla reszty)
  const staffOnly = () => [
    {
      id: everyoneRole.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    ...getStaffIds().map(r => ({
      id: r.id,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    })),
  ];

  // Tylko do odczytu dla wszystkich
  const readOnly = () => [
    {
      id: everyoneRole.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.SendMessages],
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    },
  ];

  // Tylko staff może pisać
  const staffWrite = () => [
    {
      id: everyoneRole.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.SendMessages],
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    },
    ...getStaffIds().map(r => ({
      id: r.id,
      type: OverwriteType.Role,
      allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel],
    })),
  ];

  // Tylko Booster i Wspierający
  const boosterOnly = () => {
    const perms = [
      {
        id: everyoneRole.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ];
    if (roles['Booster']) perms.push({
      id: roles['Booster'].id, type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    });
    if (roles['Wspierający']) perms.push({
      id: roles['Wspierający'].id, type: OverwriteType.Role,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    });
    return perms;
  };

  // Tylko zweryfikowani (Mieszkaniec+)
  const verifiedOnly = () => {
    const verifiedRoles = ['Mieszkaniec', 'Booster', 'Wspierający', ...staffRoles];
    return [
      {
        id: everyoneRole.id,
        type: OverwriteType.Role,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      ...verifiedRoles.map(n => roles[n]).filter(Boolean).map(r => ({
        id: r.id, type: OverwriteType.Role,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      })),
    ];
  };

  // Kanał głosowy tylko do odczytu (statystyki)
  const voiceReadOnly = () => [
    {
      id: everyoneRole.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.Connect],
      allow: [PermissionFlagsBits.ViewChannel],
    },
  ];

  return [
    // ============ STATYSTYKI ============
    {
      name: '📊 ──── Statystyki ────',
      type: 'category',
      children: [
        { name: '👥│Mieszkańcy: 0', type: 'voice', permissionOverwrites: voiceReadOnly() },
        { name: '🤖│Boty: 0',       type: 'voice', permissionOverwrites: voiceReadOnly() },
      ],
    },

    // ============ WERYFIKACJA ============
    {
      name: '✅ ──── Weryfikacja ────',
      type: 'category',
      children: [
        { name: '📋│weryfikacja', type: 'text', topic: 'Weryfikacja nicku Roblox i quiz' },
      ],
    },

    // ============ INFORMACJE ============
    {
      name: '❗ ──── Informacje ────',
      type: 'category',
      children: [
        { name: '❗│regulamin',                 type: 'text', permissionOverwrites: readOnly() },
        { name: '📖│pojęcia-rp',               type: 'text', permissionOverwrites: readOnly() },
        { name: '✈️│przyloty',                 type: 'text', permissionOverwrites: readOnly() },
        { name: '🛫│odloty',                   type: 'text', permissionOverwrites: readOnly() },
        { name: '📢│ogłoszenia',               type: 'text', permissionOverwrites: staffWrite() },
        { name: '🚗│przecieki-i-aktualizacje', type: 'text', permissionOverwrites: staffWrite() },
        { name: '🔑│kody',                     type: 'text', permissionOverwrites: staffWrite() },
        { name: '💎│sekrety',                  type: 'text', permissionOverwrites: verifiedOnly() },
        { name: '📜│mandaty',                  type: 'text', permissionOverwrites: readOnly() },
      ],
    },

    // ============ KANAŁY TEKSTOWE ============
    {
      name: '💬 ──── Kanały tekstowe ────',
      type: 'category',
      children: [
        { name: '💬│czat-ogólny',            type: 'text' },
        { name: '🎮│roblox-chat',            type: 'text' },
        { name: '🚗│rejestrowanie-samochodu',type: 'text' },
        { name: '🪪│dowód-osobisty',         type: 'text' },
        { name: '💼│podanie-o-pracę',        type: 'text' },
        { name: '📸│zdjecia-z-rp',           type: 'text' },
        { name: '💡│sugestie',               type: 'text' },
        { name: '💜│boosterzy',              type: 'text', permissionOverwrites: boosterOnly() },
        { name: '😡│skargi-pytania',         type: 'text' },
        { name: '📱│telefon',                type: 'text' },
        { name: '🔒│chat-priv',              type: 'text', permissionOverwrites: verifiedOnly() },
      ],
    },

    // ============ KANAŁY GŁOSOWE ============
    {
      name: '🔊 ──── Kanały głosowe ────',
      type: 'category',
      children: [
        { name: 'Ogólne',               type: 'voice' },
        { name: 'Kanał 2 osobowy [1]',  type: 'voice', userLimit: 2 },
        { name: 'Kanał 2 osobowy [2]',  type: 'voice', userLimit: 2 },
        { name: 'Kanał 3 osobowy [1]',  type: 'voice', userLimit: 3 },
        { name: 'Kanał 3 osobowy [2]',  type: 'voice', userLimit: 3 },
        { name: 'Kanał 4 osobowy',      type: 'voice', userLimit: 4 },
        { name: 'Kanał 5 osobowy',      type: 'voice', userLimit: 5 },
        { name: '🎵 RMF MAXX',          type: 'voice' },
      ],
    },

    // ============ LOGI ============
    {
      name: '📝 ──── Logi ────',
      type: 'category',
      permissionOverwrites: staffOnly(),
      children: [
        { name: '🤖│logi-rover' },
        { name: '🔊│logi-głosowe' },
        { name: '👥│logi-członków' },
        { name: '✏️│logi-nicków' },
        { name: '🗑️│logi-wiadomości' },
        { name: '🔨│logi-moderacji' },
        { name: '📋│logi-ról' },
        { name: '🎫│logi-ticketów' },
        { name: '🚗│logi-pojazdów' },
        { name: '🪪│logi-weryfikacji' },
        { name: '😂│komedy', type: 'text', permissionOverwrites: staffOnly() },
      ].map(c => ({ type: 'text', permissionOverwrites: staffOnly(), ...c })),
    },

    // ============ ROLEPLAY ============
    {
      name: '🎭 ──── Roleplay ────',
      type: 'category',
      children: [
        { name: '🚔│ogłoszenia-roleplay',  type: 'text', permissionOverwrites: staffWrite() },
        { name: '🚗│rejestracja-pojazdów', type: 'text' },
        { name: '🪪│prawo-jazdy',          type: 'text' },
        { name: '📋│wyniki-egzaminów',     type: 'text', permissionOverwrites: readOnly() },
      ],
    },

    // ============ SESJE RP ============
    {
      name: '🎪 ──── Sesje RP ────',
      type: 'category',
      children: [
        { name: '📢│sesje-ogłoszenia',  type: 'text' },
        { name: '✅│zapisy-na-sesję',   type: 'text' },
      ],
    },

    // ============ PRACE ============
    {
      name: '💼 ──── Prace ────',
      type: 'category',
      children: [
        { name: '📋│informacje-prace-publiczne',  type: 'text', permissionOverwrites: readOnly() },
        { name: '📝│podania-prace-publiczne',      type: 'text' },
        { name: '📋│informacje-prace-prywatne',   type: 'text', permissionOverwrites: readOnly() },
        { name: '📝│podania-prace-prywatne',       type: 'text' },
      ],
    },

    // ============ POMOC ============
    {
      name: '🆘 ──── Pomoc ────',
      type: 'category',
      children: [
        { name: '❓│faq',     type: 'text', permissionOverwrites: readOnly() },
        { name: '🎫│ticket', type: 'text' },
      ],
    },

    // ============ STAFF ============
    {
      name: '─── STAFF ───',
      type: 'category',
      permissionOverwrites: staffOnly(),
      children: [
        { name: '📖│regulamin-staffu' },
        { name: '📢│ogłoszenia-staffu' },
        { name: '🤖│autorole' },
        { name: '💬│chat-hr' },
        { name: '💬│admin-chat' },
        { name: '💬│mod-chat' },
        { name: '🚗│pojazdy-służbowe' },
        { name: '📋│egzaminy' },
        { name: '🤖│automod' },
        { name: '👑│informacje-dla-hostów' },
        { name: '👑│host-chat' },
        { name: '⚠️│warny-i-bany' },
        { name: '📝│logi-staffu' },
      ].map(c => ({ type: 'text', permissionOverwrites: staffOnly(), ...c })),
    },
  ];
}

// ==================== GŁÓWNA FUNKCJA SETUP ====================

/**
 * Tworzy wszystkie role, kategorie i kanały na serwerze
 * @param {import('discord.js').Guild} guild
 * @param {Function} progress - callback aktualizacji paska postępu
 * @returns {{ roles: Object, channels: Object }}
 */
async function setupServer(guild, progress) {
  const createdRoles = {};
  const createdChannels = {};

  // --- Krok 1: Tworzenie ról ---
  progress('🎭 Tworzę role...');

  for (const roleCfg of ROLES_CONFIG) {
    try {
      // Sprawdź czy rola już istnieje
      let role = guild.roles.cache.find(r => r.name === roleCfg.name);
      if (!role) {
        role = await guild.roles.create({
          name: roleCfg.name,
          color: roleCfg.color,
          hoist: roleCfg.hoist,
          mentionable: false,
          reason: 'Greenville RP — Auto Setup',
        });
      }
      createdRoles[roleCfg.name] = role;
      logger.info(`Rola: ${roleCfg.name}`);
    } catch (err) {
      logger.error(`Błąd tworzenia roli ${roleCfg.name}:`, err.message);
    }
  }

  const everyoneRole = guild.roles.everyone;

  // --- Krok 2: Tworzenie kanałów ---
  const channelStructure = buildChannelStructure(createdRoles, everyoneRole);

  let categoryCount = 0;
  for (const cat of channelStructure) {
    categoryCount++;
    progress(`📁 Tworzę kategorię ${categoryCount}/${channelStructure.length}: ${cat.name}`);

    try {
      // Sprawdź czy kategoria już istnieje
      let category = guild.channels.cache.find(
        c => c.name === cat.name && c.type === ChannelType.GuildCategory
      );

      if (!category) {
        const catOptions = {
          name: cat.name,
          type: ChannelType.GuildCategory,
          reason: 'Greenville RP — Auto Setup',
        };
        if (cat.permissionOverwrites) {
          catOptions.permissionOverwrites = cat.permissionOverwrites;
        }
        category = await guild.channels.create(catOptions);
      }

      createdChannels[cat.name] = category;

      // Twórz kanały dzieci
      for (const child of (cat.children || [])) {
        try {
          const channelType = child.type === 'voice'
            ? ChannelType.GuildVoice
            : ChannelType.GuildText;

          let existing = guild.channels.cache.find(
            c => c.name === child.name && c.parentId === category.id
          );

          if (!existing) {
            const childOptions = {
              name: child.name,
              type: channelType,
              parent: category.id,
              topic: child.topic || undefined,
              userLimit: child.userLimit || undefined,
              reason: 'Greenville RP — Auto Setup',
            };

            if (child.permissionOverwrites) {
              childOptions.permissionOverwrites = child.permissionOverwrites;
            } else if (cat.permissionOverwrites) {
              childOptions.permissionOverwrites = cat.permissionOverwrites;
            }

            existing = await guild.channels.create(childOptions);
          }

          createdChannels[child.name] = existing;
          logger.info(`Kanał: ${child.name}`);
        } catch (err) {
          logger.error(`Błąd tworzenia kanału ${child.name}:`, err.message);
        }
      }
    } catch (err) {
      logger.error(`Błąd tworzenia kategorii ${cat.name}:`, err.message);
    }
  }

  progress('✅ Struktura serwera gotowa!');
  logger.info('Setup serwera zakończony pomyślnie');

  return { roles: createdRoles, channels: createdChannels };
}

module.exports = { setupServer, ROLES_CONFIG };
