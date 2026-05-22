// refresh-regulamin.js — odświeża #regulamin i #słownik-rp bez resetowania całego serwera
// Usuwa stare wiadomości bota i wysyła pełny regulamin (6 embedów)
// Użycie: node scripts/refresh-regulamin.js

// Szukaj .env w kilku możliwych lokalizacjach
const path = require('path');
const dotenv = require('dotenv');
const envPaths = [
  path.join(__dirname, '../../.env'),   // projekt root
  path.join(__dirname, '../.env'),       // bot/
  path.join(process.cwd(), '../.env'),   // jeśli uruchamiany z bot/scripts/
  path.join(process.cwd(), '.env'),      // jeśli uruchamiany z bot/
];
for (const p of envPaths) {
  const res = dotenv.config({ path: p });
  if (!res.error && process.env.DISCORD_TOKEN) break;
}

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { buildRegulaminEmbeds, buildPojeciaRpEmbed } = require('../src/setup/regulamin');

// Podmień URL po wgraniu zdjęcia pojazdu na Discord CDN / Imgur
const ADMIN_CAR_IMG = process.env.ADMIN_CAR_IMAGE_URL || null;

function buildAdminCarEmbed() {
  const e = new EmbedBuilder()
    .setColor(0xE74C3C)
    .setTitle('🔴 Pojazd Administracji — AURORA Greenville RP')
    .setDescription(
      '**Czerwony Durant Camion PPV**\n' +
      'Tablice: **Admin-[numer]**\n\n' +
      '> Pojazd używany **wyłącznie** przez członków Administracji serwera.\n' +
      '> Traktowany jak **radiowóz policyjny** — ucieczka i podszywanie się **zabronione**.\n\n' +
      '⛔ **Podszywanie się pod Administrację = PERMANENTNY BAN** ⛔'
    )
    .setFooter({ text: 'AURORA Greenville RP — Pojazdy Administracji' })
    .setTimestamp();
  if (ADMIN_CAR_IMG) e.setImage(ADMIN_CAR_IMG);
  return e;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const log = msg => console.log(`[${new Date().toTimeString().slice(0, 8)}] ${msg}`);

async function purgeAndSend(channel, embeds, label) {
  // Usuń stare wiadomości bota (maks. 100)
  try {
    const msgs = await channel.messages.fetch({ limit: 100 });
    const botMsgs = msgs.filter(m => m.author.id === client.user.id);
    if (botMsgs.size > 0) {
      for (const [, msg] of botMsgs) {
        await msg.delete().catch(() => {});
        await new Promise(r => setTimeout(r, 300));
      }
      log(`  🗑️  Usunięto ${botMsgs.size} starych wiadomości bota z ${label}`);
    }
  } catch (e) {
    log(`  ⚠️  Nie udało się wyczyścić ${label}: ${e.message}`);
  }

  // Wysyłaj jeden embed na wiadomość — Discord limit: 6000 znaków łącznie na wiadomość
  for (const embed of embeds) {
    await channel.send({ embeds: [embed] });
    await new Promise(r => setTimeout(r, 500));
  }
  log(`  ✅ ${label} — wysłano ${embeds.length} embed(ów)`);
}

client.once('ready', async () => {
  log(`Zalogowano jako ${client.user.tag}`);

  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const guild   = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    log(`Serwer: ${guild.name}`);

    const norm = name => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

    // #regulamin
    const regulaminCh = guild.channels.cache.find(
      c => c.isTextBased() && norm(c.name).includes('regulamin') && !norm(c.name).includes('staffu')
    );
    if (regulaminCh) {
      log(`Znaleziono: ${regulaminCh.name}`);
      const regEmbeds = [...buildRegulaminEmbeds(), buildAdminCarEmbed()];
      await purgeAndSend(regulaminCh, regEmbeds, '#regulamin');
    } else {
      log('⚠️  Nie znaleziono kanału #regulamin');
    }

    // #słownik-rp
    const slownikCh = guild.channels.cache.find(
      c => c.isTextBased() && (norm(c.name).includes('slownik') || norm(c.name).includes('pojecia'))
    );
    if (slownikCh) {
      log(`Znaleziono: ${slownikCh.name}`);
      await purgeAndSend(slownikCh, [buildPojeciaRpEmbed()], '#słownik-rp');
    } else {
      log('⚠️  Nie znaleziono kanału #słownik-rp');
    }

    log('\n🎉 Regulamin zaktualizowany!');
  } catch (e) {
    console.error('❌ Błąd:', e);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);
