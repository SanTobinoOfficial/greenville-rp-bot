// refresh-roles-channels.js
// Adds Security Guard and Park Ranger roles + their channel categories to the live server.
// Removes Straz Miejska role and its channels.
// Safe to run on existing server — does NOT wipe all channels/roles.

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
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const delay = ms => new Promise(r => setTimeout(r, ms));
const log = msg => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${msg}`);

client.once('ready', async () => {
  log(`Zalogowano jako ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    log(`Serwer: ${guild.name}`);

    // ── 1. Remove Straz Miejska role ──────────────────────────────────────────
    const smRole = guild.roles.cache.find(r => r.name === 'Straż Miejska');
    if (smRole) {
      await smRole.delete('Replaced by Security Guard + Park Ranger').catch(() => {});
      log('Deleted role: Straż Miejska');
    } else {
      log('Role Straż Miejska not found (already removed?)');
    }

    await delay(500);

    // ── 2. Create Security Guard role ─────────────────────────────────────────
    let sgRole = guild.roles.cache.find(r => r.name === 'Security Guard');
    if (!sgRole) {
      sgRole = await guild.roles.create({
        name: 'Security Guard',
        color: 0x4B5563,
        hoist: false,
        mentionable: true,
        reason: 'Greenville RP — Security Guard role',
      });
      log('Created role: Security Guard');
    } else {
      log('Role Security Guard already exists');
    }
    await delay(500);

    // ── 3. Create Park Ranger role ────────────────────────────────────────────
    let prRole = guild.roles.cache.find(r => r.name === 'Park Ranger');
    if (!prRole) {
      prRole = await guild.roles.create({
        name: 'Park Ranger',
        color: 0x16A34A,
        hoist: false,
        mentionable: true,
        reason: 'Greenville RP — Park Ranger role',
      });
      log('Created role: Park Ranger');
    } else {
      log('Role Park Ranger already exists');
    }
    await delay(500);

    // ── 4. Remove old Straz Miejska channels ──────────────────────────────────
    const smChannelNames = ['💬│sm-czat', '🛡️ Dyżur SM', '🛡️ ──── Straż Miejska ────'];
    for (const ch of guild.channels.cache.values()) {
      if (smChannelNames.includes(ch.name) || ch.name.includes('Straż Miejska')) {
        await ch.delete('Replaced by Security Guard + Park Ranger channels').catch(() => {});
        log(`Deleted channel: ${ch.name}`);
        await delay(400);
      }
    }

    const VIEW    = PermissionsBitField.Flags.ViewChannel;
    const SEND    = PermissionsBitField.Flags.SendMessages;
    const CONNECT = PermissionsBitField.Flags.Connect;

    const STAFF_NAMES = ['Helper', 'HR', 'Host', 'Moderator', 'Administrator', 'Co-Owner', 'Owner'];
    const staffRoles = STAFF_NAMES.map(n => guild.roles.cache.find(r => r.name === n)).filter(Boolean);

    const servicePerms = (serviceRole) => {
      const overrides = [
        { id: guild.roles.everyone.id, deny: [VIEW] },
        { id: serviceRole.id, allow: [VIEW, SEND] },
      ];
      for (const sr of staffRoles) {
        overrides.push({ id: sr.id, allow: [VIEW, SEND] });
      }
      return overrides;
    };

    const servicePermsVoice = (serviceRole) => {
      const overrides = [
        { id: guild.roles.everyone.id, deny: [VIEW, CONNECT] },
        { id: serviceRole.id, allow: [VIEW, CONNECT] },
      ];
      for (const sr of staffRoles) {
        overrides.push({ id: sr.id, allow: [VIEW, CONNECT] });
      }
      return overrides;
    };

    // ── 5. Create Security Guard category + channels ──────────────────────────
    let sgCat = guild.channels.cache.find(c => c.name === '🔐 ──── Security Guard ────' && c.type === ChannelType.GuildCategory);
    if (!sgCat) {
      sgCat = await guild.channels.create({
        name: '🔐 ──── Security Guard ────',
        type: ChannelType.GuildCategory,
        permissionOverwrites: servicePerms(sgRole),
        reason: 'Security Guard category',
      });
      log('Created category: 🔐 ──── Security Guard ────');
    } else {
      log('Category Security Guard already exists');
    }
    await delay(400);

    const sgChannels = [
      { name: '💬│security-czat',    type: ChannelType.GuildText,  topic: 'Czat Security Guard — wewnętrzna komunikacja' },
      { name: '📋│raporty-security', type: ChannelType.GuildText,  topic: 'Raporty zdarzeń i interwencji' },
      { name: '🔐 Dyżur Security',   type: ChannelType.GuildVoice, topic: null },
    ];
    for (const def of sgChannels) {
      const exists = guild.channels.cache.find(c => c.name === def.name && c.parentId === sgCat.id);
      if (!exists) {
        const opts = {
          name: def.name,
          type: def.type,
          parent: sgCat.id,
          permissionOverwrites: def.type === ChannelType.GuildVoice
            ? servicePermsVoice(sgRole)
            : servicePerms(sgRole),
          reason: 'Security Guard channels',
        };
        if (def.topic) opts.topic = def.topic;
        await guild.channels.create(opts);
        log(`  Created: ${def.name}`);
        await delay(400);
      } else {
        log(`  Already exists: ${def.name}`);
      }
    }

    // ── 6. Create Park Ranger category + channels ─────────────────────────────
    let prCat = guild.channels.cache.find(c => c.name === '🌲 ──── Park Ranger ────' && c.type === ChannelType.GuildCategory);
    if (!prCat) {
      prCat = await guild.channels.create({
        name: '🌲 ──── Park Ranger ────',
        type: ChannelType.GuildCategory,
        permissionOverwrites: servicePerms(prRole),
        reason: 'Park Ranger category',
      });
      log('Created category: 🌲 ──── Park Ranger ────');
    } else {
      log('Category Park Ranger already exists');
    }
    await delay(400);

    const prChannels = [
      { name: '💬│ranger-czat',   type: ChannelType.GuildText,  topic: 'Czat Park Ranger — wewnętrzna komunikacja' },
      { name: '📋│raporty-parku', type: ChannelType.GuildText,  topic: 'Raporty z patroli i incydentów w parku' },
      { name: '🌲 Dyżur Ranger',  type: ChannelType.GuildVoice, topic: null },
    ];
    for (const def of prChannels) {
      const exists = guild.channels.cache.find(c => c.name === def.name && c.parentId === prCat.id);
      if (!exists) {
        const opts = {
          name: def.name,
          type: def.type,
          parent: prCat.id,
          permissionOverwrites: def.type === ChannelType.GuildVoice
            ? servicePermsVoice(prRole)
            : servicePerms(prRole),
          reason: 'Park Ranger channels',
        };
        if (def.topic) opts.topic = def.topic;
        await guild.channels.create(opts);
        log(`  Created: ${def.name}`);
        await delay(400);
      } else {
        log(`  Already exists: ${def.name}`);
      }
    }

    log('\n🎉 Roles and channels updated!');
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
