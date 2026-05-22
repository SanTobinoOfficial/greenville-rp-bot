// refresh-job-channels.js
// Creates:
// 1. "Właściciel Firmy" role
// 2. All civilian job channel categories + channels
// 3. Dyspozytornia channel (missing)

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

const STAFF_NAMES = ['Helper','HR','Host','Moderator','Administrator','Co-Owner','Owner'];

function buildPerms(guild, roleNames) {
  const VIEW = PermissionsBitField.Flags.ViewChannel;
  const SEND = PermissionsBitField.Flags.SendMessages;
  const CONNECT = PermissionsBitField.Flags.Connect;
  const overrides = [{ id: guild.roles.everyone.id, deny: [VIEW, SEND, CONNECT] }];
  for (const name of roleNames) {
    const role = guild.roles.cache.find(r => r.name === name);
    if (role) overrides.push({ id: role.id, allow: [VIEW, SEND] });
  }
  return overrides;
}

function buildVoicePerms(guild, roleNames) {
  const VIEW = PermissionsBitField.Flags.ViewChannel;
  const SEND = PermissionsBitField.Flags.SendMessages;
  const CONNECT = PermissionsBitField.Flags.Connect;
  const overrides = [{ id: guild.roles.everyone.id, deny: [VIEW, SEND, CONNECT] }];
  for (const name of roleNames) {
    const role = guild.roles.cache.find(r => r.name === name);
    if (role) overrides.push({ id: role.id, allow: [VIEW, CONNECT] });
  }
  return overrides;
}

async function ensureCategory(guild, name, roleNames) {
  let cat = guild.channels.cache.find(c => c.name === name && c.type === ChannelType.GuildCategory);
  if (!cat) {
    cat = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: buildPerms(guild, roleNames),
    });
    log(`Created category: ${name}`);
    await delay(400);
  } else {
    log(`Category exists: ${name}`);
  }
  return cat;
}

async function ensureTextChannel(guild, name, catId, roleNames, topic) {
  const exists = guild.channels.cache.find(c => c.name === name && c.parentId === catId);
  if (!exists) {
    await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: catId,
      topic: topic || '',
      permissionOverwrites: buildPerms(guild, roleNames),
    });
    log(`  + #${name}`);
    await delay(400);
  }
}

async function ensureVoiceChannel(guild, name, catId, roleNames) {
  const exists = guild.channels.cache.find(c => c.name === name && c.parentId === catId);
  if (!exists) {
    await guild.channels.create({
      name,
      type: ChannelType.GuildVoice,
      parent: catId,
      permissionOverwrites: buildVoicePerms(guild, roleNames),
    });
    log(`  + 🔊 ${name}`);
    await delay(400);
  }
}

client.once('ready', async () => {
  log(`Zalogowano jako ${client.user.tag}`);
  try {
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    await guild.channels.fetch();
    await guild.roles.fetch();
    log(`Serwer: ${guild.name}`);

    // ── 1. Create Właściciel Firmy role ─────────────────────────────────────
    let wfRole = guild.roles.cache.find(r => r.name === 'Właściciel Firmy');
    if (!wfRole) {
      wfRole = await guild.roles.create({
        name: 'Właściciel Firmy',
        color: 0xF59E0B,
        hoist: true,
        mentionable: true,
        reason: 'Role for private job owners',
      });
      log('Created role: Właściciel Firmy');
      await delay(500);
    } else {
      log('Role Właściciel Firmy already exists');
    }

    // Helper: get all role names that should have access (job roles + staff + właściciel)
    const WF = 'Właściciel Firmy';

    // ── 2. Gastronomia ───────────────────────────────────────────────────────
    {
      const GASTRO_ALL = [WF,...STAFF_NAMES,'Burger Knight','Burgerhaus',"Hunty's Pizza Palace",'Home Barn American Grill',"Bill's Diner",'Fiesta-Rodeo',"Ol' Texas",'The Red Chopstick','Taco Castillo','Timberwolf Drive In','Ice Cream Station','Superwich','Holey Smokes','British Fish & Chips'];
      const cat = await ensureCategory(guild, '🍔 ──── Gastronomia ────', GASTRO_ALL);
      await ensureTextChannel(guild, '💬│gastronomia-ogólny', cat.id, GASTRO_ALL, 'Ogólny czat pracowników gastronomii');
      await ensureTextChannel(guild, '💬│burger-knight', cat.id, [WF,...STAFF_NAMES,'Burger Knight'], 'Kanał pracowników Burger Knight');
      await ensureTextChannel(guild, '💬│burgerhaus', cat.id, [WF,...STAFF_NAMES,'Burgerhaus'], 'Kanał pracowników Burgerhaus');
      await ensureTextChannel(guild, '💬│huntys-pizza', cat.id, [WF,...STAFF_NAMES,"Hunty's Pizza Palace"], "Kanał pracowników Hunty's Pizza Palace");
      await ensureTextChannel(guild, '💬│home-barn-grill', cat.id, [WF,...STAFF_NAMES,'Home Barn American Grill'], 'Kanał pracowników Home Barn American Grill');
      await ensureTextChannel(guild, '💬│fiesta-rodeo', cat.id, [WF,...STAFF_NAMES,'Fiesta-Rodeo'], 'Kanał pracowników Fiesta-Rodeo');
      await ensureTextChannel(guild, '💬│taco-castillo', cat.id, [WF,...STAFF_NAMES,'Taco Castillo'], 'Kanał pracowników Taco Castillo');
      await ensureTextChannel(guild, '💬│holey-smokes', cat.id, [WF,...STAFF_NAMES,'Holey Smokes'], 'Kanał pracowników Holey Smokes');
      await ensureTextChannel(guild, '💬│superwich', cat.id, [WF,...STAFF_NAMES,'Superwich'], 'Kanał pracowników Superwich');
      await ensureTextChannel(guild, '💬│british-fish-chips', cat.id, [WF,...STAFF_NAMES,'British Fish & Chips'], 'Kanał pracowników British Fish & Chips');
      await ensureTextChannel(guild, '💬│inne-gastro', cat.id, [WF,...STAFF_NAMES,"Bill's Diner","Ol' Texas",'The Red Chopstick','Timberwolf Drive In','Ice Cream Station'], "Bill's Diner / Ol' Texas / Red Chopstick / Timberwolf / Ice Cream");
    }

    // ── 3. Kawiarnie ─────────────────────────────────────────────────────────
    {
      const KAW_ALL = [WF,...STAFF_NAMES,'Brookmere Brew','Caffeine Street',"Kat's Kafe","Leo's Cafe",'Bobahaus','Crispi Cookies','Bread Shack','The Grind'];
      const cat = await ensureCategory(guild, '☕ ──── Kawiarnie ────', KAW_ALL);
      await ensureTextChannel(guild, '💬│kawiarnie-ogólny', cat.id, KAW_ALL, 'Ogólny czat pracowników kawiarni');
      await ensureTextChannel(guild, '💬│brookmere-brew', cat.id, [WF,...STAFF_NAMES,'Brookmere Brew'], 'Kanał pracowników Brookmere Brew');
      await ensureTextChannel(guild, '💬│caffeine-street', cat.id, [WF,...STAFF_NAMES,'Caffeine Street'], 'Kanał pracowników Caffeine Street');
      await ensureTextChannel(guild, '💬│the-grind', cat.id, [WF,...STAFF_NAMES,'The Grind'], 'Kanał pracowników The Grind');
      await ensureTextChannel(guild, '💬│inne-kawiarnie', cat.id, [WF,...STAFF_NAMES,"Kat's Kafe","Leo's Cafe",'Bobahaus','Crispi Cookies','Bread Shack'], "Kat's Kafe / Leo's Cafe / Bobahaus / Crispi Cookies / Bread Shack");
    }

    // ── 4. Handel ────────────────────────────────────────────────────────────
    {
      const HANDEL_ALL = [WF,...STAFF_NAMES,'Bulk Priced Food Shoppe',"Connor's",'Farnsworths','GVPS','Just Buy','Quick Dollar',"Visitor's",'Nerd Squad','Verwire','Denver Atwood','NextStop'];
      const cat = await ensureCategory(guild, '🛒 ──── Handel ────', HANDEL_ALL);
      await ensureTextChannel(guild, '💬│handel-ogólny', cat.id, HANDEL_ALL, 'Ogólny czat pracowników handlu');
      await ensureTextChannel(guild, '💬│gvps', cat.id, [WF,...STAFF_NAMES,'GVPS'], 'Kanał kurierów Greenville Postal Service');
      await ensureTextChannel(guild, '💬│connors', cat.id, [WF,...STAFF_NAMES,"Connor's"], "Kanał pracowników Connor's");
      await ensureTextChannel(guild, '💬│just-buy', cat.id, [WF,...STAFF_NAMES,'Just Buy'], 'Kanał pracowników Just Buy');
      await ensureTextChannel(guild, '💬│inne-handel', cat.id, [WF,...STAFF_NAMES,'Bulk Priced Food Shoppe','Farnsworths','Quick Dollar',"Visitor's",'Nerd Squad','Verwire','Denver Atwood','NextStop'], 'Pozostałe sklepy detaliczne');
    }

    // ── 5. Motoryzacja ───────────────────────────────────────────────────────
    {
      const MOTO_ALL = [WF,...STAFF_NAMES,'Brookmere Autos','Celestial Dealership','Ron Rivers Auto Group','Roadmap Dealership',"Gary's Collision",'Ignition Motor Parts','Tires+','TruckPlanet',"Dom's Service",'Rapid Wash'];
      const cat = await ensureCategory(guild, '🚗 ──── Motoryzacja ────', MOTO_ALL);
      await ensureTextChannel(guild, '💬│moto-ogólny', cat.id, MOTO_ALL, 'Ogólny czat pracowników motoryzacji');
      await ensureTextChannel(guild, '💬│dealerzy', cat.id, [WF,...STAFF_NAMES,'Brookmere Autos','Celestial Dealership','Ron Rivers Auto Group','Roadmap Dealership'], 'Czat dealerów samochodów');
      await ensureTextChannel(guild, '💬│warsztaty', cat.id, [WF,...STAFF_NAMES,"Gary's Collision",'Ignition Motor Parts','Tires+','TruckPlanet',"Dom's Service",'Rapid Wash'], 'Czat serwisów i warsztatów');
    }

    // ── 6. Transport Cywilny ─────────────────────────────────────────────────
    {
      const TRANS_ALL = [WF,...STAFF_NAMES,'Taksówkarz','Sahara Delivery','GV Transit Bus Driver','School Bus Driver'];
      const cat = await ensureCategory(guild, '🚕 ──── Transport Cywilny ────', TRANS_ALL);
      await ensureTextChannel(guild, '💬│taksówkarze', cat.id, [WF,...STAFF_NAMES,'Taksówkarz'], 'Kanał taksówkarzy');
      await ensureTextChannel(guild, '💬│sahara-delivery', cat.id, [WF,...STAFF_NAMES,'Sahara Delivery'], 'Kanał kurierów Sahara Delivery');
      await ensureTextChannel(guild, '💬│gv-transit', cat.id, [WF,...STAFF_NAMES,'GV Transit Bus Driver'], 'Kanał kierowców GV Transit');
      await ensureTextChannel(guild, '💬│school-bus', cat.id, [WF,...STAFF_NAMES,'School Bus Driver'], 'Kanał kierowców szkolnych');
    }

    // ── 7. Administracja & Finanse ───────────────────────────────────────────
    {
      const ADM_ALL = [WF,...STAFF_NAMES,'DMV','Greenville Town Hall','Horton Village Hall','Credit Union','Fox Mountain','Allen Insurance'];
      const cat = await ensureCategory(guild, '🏛️ ──── Administracja & Finanse ────', ADM_ALL);
      await ensureTextChannel(guild, '💬│admin-ogólny', cat.id, ADM_ALL, 'Ogólny czat administracji i finansów');
      await ensureTextChannel(guild, '💬│dmv', cat.id, [WF,...STAFF_NAMES,'DMV'], 'Kanał pracowników DMV');
      await ensureTextChannel(guild, '💬│town-hall', cat.id, [WF,...STAFF_NAMES,'Greenville Town Hall','Horton Village Hall'], 'Czat urzędników miejskich');
      await ensureTextChannel(guild, '💬│finanse', cat.id, [WF,...STAFF_NAMES,'Credit Union','Fox Mountain','Allen Insurance'], 'Czat pracowników banków i ubezpieczeń');
    }

    // ── 8. Edukacja & Zdrowie ────────────────────────────────────────────────
    {
      const EDU_ALL = [WF,...STAFF_NAMES,'Teacher','Driving Experience Center','Daycare','Librarian','Student','Karate Wisconsin','Heritage Animal Hospital','Lifeguard'];
      const cat = await ensureCategory(guild, '📚 ──── Edukacja & Zdrowie ────', EDU_ALL);
      await ensureTextChannel(guild, '💬│edukacja', cat.id, [WF,...STAFF_NAMES,'Teacher','Driving Experience Center','Daycare','Librarian','Student','Karate Wisconsin'], 'Czat pracowników edukacji');
      await ensureTextChannel(guild, '💬│zdrowie', cat.id, [WF,...STAFF_NAMES,'Heritage Animal Hospital','Lifeguard'], 'Czat służb zdrowia i lifeguardów');
    }

    // ── 9. Usługi & Przemysł ─────────────────────────────────────────────────
    {
      const USL_ALL = [WF,...STAFF_NAMES,'Enderson Cleaners','HeenerG','Beyond Beauty','Gas Station Clerk','Factory Pulse','Farmer'];
      const cat = await ensureCategory(guild, '⚙️ ──── Usługi & Przemysł ────', USL_ALL);
      await ensureTextChannel(guild, '💬│uslugi-ogólny', cat.id, USL_ALL, 'Ogólny czat pracowników usług i przemysłu');
      await ensureTextChannel(guild, '💬│heenerg', cat.id, [WF,...STAFF_NAMES,'HeenerG'], 'Kanał pracowników HeenerG');
      await ensureTextChannel(guild, '💬│inne-uslugi', cat.id, [WF,...STAFF_NAMES,'Enderson Cleaners','Beyond Beauty','Gas Station Clerk'], 'Cleaners / Beauty / Gas Station');
      await ensureTextChannel(guild, '💬│przemysl-rolnictwo', cat.id, [WF,...STAFF_NAMES,'Factory Pulse','Farmer'], 'Czat fabryki i farmy');
    }

    // ── 10. Rozrywka ─────────────────────────────────────────────────────────
    {
      const ROZ_ALL = [WF,...STAFF_NAMES,'The Twist','Greenville Theater','Visit 24/7 Motel'];
      const cat = await ensureCategory(guild, '🎭 ──── Rozrywka ────', ROZ_ALL);
      await ensureTextChannel(guild, '💬│rozrywka-ogólny', cat.id, ROZ_ALL, 'Ogólny czat pracowników rozrywki');
      await ensureTextChannel(guild, '💬│the-twist', cat.id, [WF,...STAFF_NAMES,'The Twist'], 'Kanał pracowników The Twist');
      await ensureTextChannel(guild, '💬│theater-motel', cat.id, [WF,...STAFF_NAMES,'Greenville Theater','Visit 24/7 Motel'], 'Theater i Motel');
    }

    // ── 11. Dyspozytornia ────────────────────────────────────────────────────
    {
      const DISP_ALL = [WF,...STAFF_NAMES,'Dyspozytornia','Policja','EMS','Straż Pożarna','DOT'];
      let cat = guild.channels.cache.find(c => c.name === '📡 ──── Dyspozytornia ────' && c.type === ChannelType.GuildCategory);
      if (!cat) {
        cat = await guild.channels.create({ name: '📡 ──── Dyspozytornia ────', type: ChannelType.GuildCategory, permissionOverwrites: buildPerms(guild, DISP_ALL) });
        log('Created category: 📡 ──── Dyspozytornia ────');
        await delay(400);
      }
      await ensureTextChannel(guild, '💬│dyspozytornia-czat', cat.id, DISP_ALL, 'Czat dyspozytorni — koordynacja służb');
      await ensureVoiceChannel(guild, '📡 Dyżur Dyspozytora', cat.id, DISP_ALL);
    }

    // ── 12. Heist Crew ───────────────────────────────────────────────────────
    {
      const HC_ALL = [WF,...STAFF_NAMES,'Heist Crew'];
      const cat = await ensureCategory(guild, '💀 ──── Heist Crew ────', HC_ALL);
      await ensureTextChannel(guild, '💬│heist-czat', cat.id, HC_ALL, 'Prywatny czat Heist Crew — tylko dla ekipy');
      await ensureVoiceChannel(guild, '🗓️ Planowanie Napadu', cat.id, HC_ALL);
    }

    // ── 13. Prywatne Prace (Właściciel Firmy) ────────────────────────────────
    {
      const PP_ALL = [WF,...STAFF_NAMES];
      const cat = await ensureCategory(guild, '🏢 ──── Prywatne Prace ────', PP_ALL);
      await ensureTextChannel(guild, '📋│oferty-prywatne', cat.id, PP_ALL, 'Oferty prywatnych prac — tylko Właściciele Firm');
      await ensureTextChannel(guild, '💬│właściciele-firm', cat.id, PP_ALL, 'Czat właścicieli firm');
      await ensureVoiceChannel(guild, '🏢 Spotkanie Firmowe', cat.id, PP_ALL);
    }

    log('\n🎉 Wszystkie kanały i role gotowe!');
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
