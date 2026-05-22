// refresh-discord-full.js
// 1. Deletes economy channels from live Discord
// 2. Creates ⚖️ Zasady & Kary category with taryfikator channel
// 3. Creates all missing job roles (71 new roles)

const path = require('path');
const dotenv = require('dotenv');
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '../.env'),
  path.join(process.cwd(), '.env'),
];
for (const p of envPaths) {
  const res = dotenv.config({ path: p });
  if (!res.error && process.env.DISCORD_TOKEN) break;
}

const { Client, GatewayIntentBits, ChannelType, PermissionsBitField } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const delay = ms => new Promise(r => setTimeout(r, ms));
const log = msg => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${msg}`);

// All job roles to create (from finalize script output)
const JOB_ROLES = [
  'Dyspozytornia', 'Burger Knight', 'Burgerhaus', "Hunty's Pizza Palace",
  'Home Barn American Grill', "Bill's Diner", 'Fiesta-Rodeo', "Ol' Texas",
  'The Red Chopstick', 'Taco Castillo', 'Timberwolf Drive In', 'Ice Cream Station',
  'Superwich', 'Holey Smokes', 'British Fish & Chips', 'Brookmere Brew',
  'Caffeine Street', "Kat's Kafe", "Leo's Cafe", 'Bobahaus', 'Crispi Cookies',
  'Bread Shack', 'The Grind', 'Bulk Priced Food Shoppe', "Connor's", 'Farnsworths',
  'GVPS', 'Just Buy', 'Quick Dollar', "Visitor's", 'Nerd Squad', 'Verwire',
  'Denver Atwood', 'NextStop', 'Brookmere Autos', 'Celestial Dealership',
  'Ron Rivers Auto Group', 'Roadmap Dealership', "Gary's Collision",
  'Ignition Motor Parts', 'Tires+', 'TruckPlanet', "Dom's Service", 'Rapid Wash',
  'Credit Union', 'Fox Mountain', 'Allen Insurance', 'DMV',
  'Greenville Town Hall', 'Horton Village Hall', 'Heist Crew', 'Sahara Delivery',
  'School Bus Driver', 'GV Transit Bus Driver', 'The Twist', 'Greenville Theater',
  'Visit 24/7 Motel', 'Teacher', 'Driving Experience Center', 'Daycare',
  'Librarian', 'Heritage Animal Hospital', 'Lifeguard', 'Factory Pulse',
  'Farmer', 'Enderson Cleaners', 'HeenerG', 'Beyond Beauty',
  'Gas Station Clerk', 'Student', 'Karate Wisconsin',
];

client.once('ready', async () => {
  log(`Zalogowano jako ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    log(`Serwer: ${guild.name}`);

    // ── 1. Delete economy channels ──────────────────────────────────────────
    const econNames = ['💰│ekonomia-info', '💰 ──── Ekonomia ────'];
    for (const ch of guild.channels.cache.values()) {
      if (econNames.some(n => ch.name === n || ch.name.includes('ekonomia'))) {
        await ch.delete('Economy removed').catch(() => {});
        log(`Deleted economy channel: ${ch.name}`);
        await delay(400);
      }
    }

    // ── 2. Create ⚖️ Zasady & Kary category if not exists ─────────────────
    const VIEW = PermissionsBitField.Flags.ViewChannel;
    const SEND = PermissionsBitField.Flags.SendMessages;
    const STAFF = ['Helper','HR','Host','Moderator','Administrator','Co-Owner','Owner'];
    const staffRoles = STAFF.map(n => guild.roles.cache.find(r => r.name === n)).filter(Boolean);

    const readOnlyPerms = [
      { id: guild.roles.everyone.id, allow: [VIEW], deny: [SEND] },
      ...staffRoles.map(r => ({ id: r.id, allow: [VIEW, SEND] })),
    ];

    let zasadyCat = guild.channels.cache.find(c => c.name === '⚖️ ──── Zasady & Kary ────' && c.type === ChannelType.GuildCategory);
    if (!zasadyCat) {
      zasadyCat = await guild.channels.create({
        name: '⚖️ ──── Zasady & Kary ────',
        type: ChannelType.GuildCategory,
        reason: 'Economy removed — taryfikator new category',
      });
      log('Created category: ⚖️ ──── Zasady & Kary ────');
      await delay(400);
    }

    // Move taryfikator channel into this category if it exists
    const tarCh = guild.channels.cache.find(c => c.name === '⚖️│taryfikator');
    if (tarCh) {
      await tarCh.setParent(zasadyCat.id, { lockPermissions: false }).catch(() => {});
      log('Moved taryfikator to new category');
    } else {
      await guild.channels.create({
        name: '⚖️│taryfikator',
        type: ChannelType.GuildText,
        parent: zasadyCat.id,
        topic: 'Taryfikator kar Discord i RP — pełna lista sankcji',
        permissionOverwrites: readOnlyPerms,
        reason: 'Taryfikator channel',
      });
      log('Created #taryfikator');
    }
    await delay(400);

    // ── 3. Create all missing job roles ────────────────────────────────────
    const existingRoleNames = new Set(guild.roles.cache.map(r => r.name));
    let created = 0;
    for (const roleName of JOB_ROLES) {
      if (!existingRoleNames.has(roleName)) {
        try {
          const color = roleName === 'Heist Crew' ? 0xEF4444 : 0x94A3B8;
          await guild.roles.create({
            name: roleName,
            color,
            hoist: false,
            mentionable: true,
            reason: 'Job role — Greenville RP',
          });
          log(`  Created role: ${roleName}`);
          created++;
          await delay(350);
        } catch (e) {
          log(`  WARN: Could not create role ${roleName}: ${e.message}`);
        }
      } else {
        log(`  Exists: ${roleName}`);
      }
    }
    log(`Created ${created} new job roles`);

    log('\n🎉 Discord fully updated!');
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
