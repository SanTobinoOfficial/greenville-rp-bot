// Creates all missing channels without a full server wipe
// Usage: node scripts/run-create-missing.js

require(require('path').join(__dirname, '../bot/node_modules/dotenv')).config({
  path: require('path').join(__dirname, '../bot/.env'),
});

const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } =
  require(require('path').join(__dirname, '../bot/node_modules/discord.js'));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Normalizer — Polish Unicode safe
function norm(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
}
function findCh(guild, fragment) {
  const n = norm(fragment);
  return guild.channels.cache.find(c => norm(c.name).includes(n));
}
function findCat(guild, fragment) {
  const n = norm(fragment);
  return guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && norm(c.name).includes(n)
  );
}

async function ensureChannel(guild, { name, fragment, parent, topic, perms }) {
  if (findCh(guild, fragment)) {
    console.log(`   ℹ️  #${fragment} already exists — skipping`);
    return;
  }
  const ch = await guild.channels.create({
    name,
    type: ChannelType.GuildText,
    ...(parent ? { parent } : {}),
    ...(topic  ? { topic  } : {}),
    ...(perms  ? { permissionOverwrites: perms } : {}),
    reason: 'Missing channel creation — run-create-missing.js',
  });
  console.log(`   ✅ Created #${ch.name}`);
}

async function main() {
  console.log('🔧 Creating missing channels...\n');

  client.once('ready', async () => {
    try {
      console.log(`✅ Bot logged in as ${client.user.tag}`);

      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID).catch(() => null);
      if (!guild) { console.error('❌ Guild not found'); process.exit(1); }

      await guild.channels.fetch();
      const everyone  = guild.roles.everyone;
      const staffRole = guild.roles.cache.find(r => r.name === 'Helper');

      const VIEW      = PermissionFlagsBits.ViewChannel;
      const SEND      = PermissionFlagsBits.SendMessages;
      const HIST      = PermissionFlagsBits.ReadMessageHistory;

      const readOnly = () => [
        { id: everyone.id, allow: [VIEW, HIST], deny: [SEND] },
      ];
      const staffOnly = () => [
        { id: everyone.id, deny: [VIEW] },
        ...(staffRole ? [{ id: staffRole.id, allow: [VIEW, SEND] }] : []),
      ];

      // ── 1. Informacje category — add #odloty ────────────────────────────────
      const infocat = findCat(guild, 'informacje');
      console.log(`\n📁 Informacje category: ${infocat ? infocat.name : 'NOT FOUND'}`);
      await ensureChannel(guild, {
        name: '🛫│odloty',
        fragment: 'odloty',
        parent: infocat,
        topic: 'Pożegnania opuszczających serwer',
        perms: readOnly(),
      });

      // ── 2. Logi category — add #logi-ról ────────────────────────────────────
      const logcat = findCat(guild, 'logi');
      console.log(`\n📁 Logi category: ${logcat ? logcat.name : 'NOT FOUND'}`);
      await ensureChannel(guild, {
        name: '📋│logi-ról',
        fragment: 'logi-r',
        parent: logcat,
        topic: 'Zmiany ról członków serwera',
        perms: staffOnly(),
      });

      // ── 3. Ekonomia category + channels ─────────────────────────────────────
      let ekonomiaCat = findCat(guild, 'ekonomia');
      console.log(`\n📁 Ekonomia category: ${ekonomiaCat ? ekonomiaCat.name : 'NOT FOUND — creating'}`);

      if (!ekonomiaCat) {
        ekonomiaCat = await guild.channels.create({
          name: '💰 ──── Ekonomia ────',
          type: ChannelType.GuildCategory,
          reason: 'Missing category creation',
        });
        console.log(`   ✅ Created category: ${ekonomiaCat.name}`);
      }

      await ensureChannel(guild, {
        name: '💰│ekonomia-info',
        fragment: 'ekonomia-info',
        parent: ekonomiaCat,
        topic: 'Informacje o systemie ekonomii RP',
        perms: readOnly(),
      });

      await ensureChannel(guild, {
        name: '⚖️│taryfikator',
        fragment: 'taryfikator',
        parent: ekonomiaCat,
        topic: 'Taryfikator kar Discord i RP',
        perms: readOnly(),
      });

      console.log('\n✅ All done!');
    } catch (e) {
      console.error('❌ Error:', e.message);
      console.error(e.stack);
      process.exitCode = 1;
    } finally {
      client.destroy();
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
