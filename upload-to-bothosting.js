// upload-to-bothosting.js — wgrywa pliki bota na panel.bot-hosting.net
// Uruchom: node upload-to-bothosting.js
// Opcje: node upload-to-bothosting.js --no-restart     (bez restartu)
//         node upload-to-bothosting.js --only api       (tylko jeden folder)

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Konfiguracja ──────────────────────────────────────────────────────────────
const API_KEY    = process.env.BOT_HOSTING_KEY  || 'ptlc_UrMXR2v4L2p';
const SERVER_ID  = process.env.BOT_HOSTING_SID  || '81f3f88a';
const PANEL_HOST = 'panel.bot-hosting.net';

const args = process.argv.slice(2);
const NO_RESTART  = args.includes('--no-restart');
const ONLY_FILTER = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

// ── Pliki do wgrania: [ścieżka lokalna, ścieżka na serwerze] ────────────────
const ALL_FILES = [
  // API serwer — rozbudowany o komendy z dashboardu
  ['bot/src/api/server.js',                            '/src/api/server.js'],

  // Weryfikacja — rozbudowany formularz + AI detection
  ['bot/src/utils/aiDetector.js',                      '/src/utils/aiDetector.js'],
  ['bot/src/buttons/verification/startVerification.js','/src/buttons/verification/startVerification.js'],
  ['bot/src/modals/verification/verificationModal.js', '/src/modals/verification/verificationModal.js'],

  // Modals — podania o pracę z AI detection
  ['bot/src/modals/jobs/jobModal.js',                  '/src/modals/jobs/jobModal.js'],

  // Komendy moderacyjne
  ['bot/src/commands/moderacja/warn.js',               '/src/commands/moderacja/warn.js'],
  ['bot/src/commands/moderacja/ban.js',                '/src/commands/moderacja/ban.js'],
  ['bot/src/commands/moderacja/kick.js',               '/src/commands/moderacja/kick.js'],
  ['bot/src/commands/moderacja/mute.js',               '/src/commands/moderacja/mute.js'],
  ['bot/src/commands/moderacja/case.js',               '/src/commands/moderacja/case.js'],
  ['bot/src/commands/moderacja/historia.js',           '/src/commands/moderacja/historia.js'],
  ['bot/src/commands/moderacja/clearwarns.js',         '/src/commands/moderacja/clearwarns.js'],
  ['bot/src/commands/moderacja/lookup.js',             '/src/commands/moderacja/lookup.js'],
  ['bot/src/commands/moderacja/notatka.js',            '/src/commands/moderacja/notatka.js'],
  ['bot/src/commands/moderacja/przypadki.js',          '/src/commands/moderacja/przypadki.js'],
  ['bot/src/commands/moderacja/sprawdz-dowod.js',      '/src/commands/moderacja/sprawdz-dowod.js'],

  // Komendy mandatów
  ['bot/src/commands/mandaty/mandat.js',               '/src/commands/mandaty/mandat.js'],
  ['bot/src/commands/mandaty/cofnij-mandat.js',        '/src/commands/mandaty/cofnij-mandat.js'],
  ['bot/src/commands/mandaty/historia-mandatow.js',    '/src/commands/mandaty/historia-mandatow.js'],
  ['bot/src/commands/mandaty/wyczysc-mandat.js',       '/src/commands/mandaty/wyczysc-mandat.js'],

  // Komendy służb
  ['bot/src/commands/sluzby/duty.js',                  '/src/commands/sluzby/duty.js'],
  ['bot/src/commands/sluzby/patrol.js',                '/src/commands/sluzby/patrol.js'],
  ['bot/src/commands/sluzby/zatrzymaj.js',             '/src/commands/sluzby/zatrzymaj.js'],
  ['bot/src/commands/sluzby/zwolnij.js',               '/src/commands/sluzby/zwolnij.js'],
  ['bot/src/commands/sluzby/sprawdz-tablice.js',       '/src/commands/sluzby/sprawdz-tablice.js'],

  // Komendy sesji
  ['bot/src/commands/sesje/sesja.js',                  '/src/commands/sesje/sesja.js'],
  ['bot/src/commands/sesje/sesja-start.js',            '/src/commands/sesje/sesja-start.js'],
  ['bot/src/commands/sesje/sesja-koniec.js',           '/src/commands/sesje/sesja-koniec.js'],
  ['bot/src/commands/sesje/peacetime.js',              '/src/commands/sesje/peacetime.js'],

  // Inne komendy
  ['bot/src/commands/postac/dowod.js',                 '/src/commands/postac/dowod.js'],
  ['bot/src/commands/postac/profil.js',                '/src/commands/postac/profil.js'],
  ['bot/src/commands/prawo-jazdy/wydaj-prawo-jazdy.js','/src/commands/prawo-jazdy/wydaj-prawo-jazdy.js'],
  ['bot/src/commands/ogolne/pomoc.js',                 '/src/commands/ogolne/pomoc.js'],
  ['bot/src/commands/ogolne/zglos.js',                 '/src/commands/ogolne/zglos.js'],

  // Eventy
  ['bot/src/events/guildMemberAdd.js',                 '/src/events/guildMemberAdd.js'],
  ['bot/src/events/guildMemberRemove.js',              '/src/events/guildMemberRemove.js'],
  ['bot/src/events/interactionCreate.js',              '/src/events/interactionCreate.js'],
  ['bot/src/events/ready.js',                          '/src/events/ready.js'],

  // Main
  ['bot/src/index.js',                                 '/src/index.js'],
];

// ── Utils ─────────────────────────────────────────────────────────────────────
function uploadFile(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(localPath)) {
      console.log(`⏭️  Pomijam (brak pliku): ${localPath}`);
      resolve({ skipped: true });
      return;
    }

    const content = fs.readFileSync(localPath);
    const encoded = encodeURIComponent(remotePath);
    const options = {
      hostname: PANEL_HOST,
      path: `/api/client/servers/${SERVER_ID}/files/write?file=${encoded}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'text/plain',
        'Content-Length': content.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        if (res.statusCode === 204 || res.statusCode === 200) {
          console.log(`✅ ${remotePath}`);
          resolve({ ok: true });
        } else {
          console.error(`❌ ${remotePath} — HTTP ${res.statusCode}: ${data.slice(0, 100)}`);
          resolve({ ok: false, status: res.statusCode });
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ ${remotePath} — Błąd sieci: ${err.message}`);
      resolve({ ok: false, error: err.message });
    });

    req.write(content);
    req.end();
  });
}

function sendPowerAction(action) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ signal: action });
    const options = {
      hostname: PANEL_HOST,
      path: `/api/client/servers/${SERVER_ID}/power`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('📤 Greenville RP Bot — Upload na bot-hosting.net');
  console.log('═'.repeat(50));
  console.log(`🔑 Server ID: ${SERVER_ID}`);
  if (ONLY_FILTER) console.log(`🔍 Filtr: tylko pliki zawierające "${ONLY_FILTER}"`);
  if (NO_RESTART)  console.log(`⏭️  Restart: wyłączony`);
  console.log('');

  const files = ONLY_FILTER
    ? ALL_FILES.filter(([local]) => local.includes(ONLY_FILTER))
    : ALL_FILES;

  console.log(`📁 Pliki do wgrania: ${files.length}`);
  console.log('');

  let ok = 0, failed = 0, skipped = 0;

  for (const [local, remote] of files) {
    const result = await uploadFile(local, remote);
    if (result.skipped) skipped++;
    else if (result.ok) ok++;
    else failed++;
  }

  console.log('');
  console.log('─'.repeat(50));
  console.log(`📊 Wyniki: ✅ ${ok} OK | ❌ ${failed} błędów | ⏭️ ${skipped} pominięto`);
  console.log('');

  if (NO_RESTART) {
    console.log('⏭️  Restart pominięty (--no-restart)');
    console.log('💡 Zrestartuj bota ręcznie w panelu: https://panel.bot-hosting.net');
    return;
  }

  if (failed > 0) {
    console.log('⚠️  Były błędy uploadów — pomijam restart');
    console.log('💡 Popraw błędy i uruchom ponownie lub zrestartuj ręcznie.');
    return;
  }

  console.log('🔄 Restartowanie bota...');
  try {
    const statusCode = await sendPowerAction('restart');
    if (statusCode === 204 || statusCode === 200) {
      console.log('✅ Bot zrestartowany pomyślnie!');
      console.log('');
      console.log('💡 Po restarcie, jeśli dodano nowe komendy slash, wejdź w konsolę bota i wpisz:');
      console.log('   node src/deploy-commands.js');
    } else {
      console.error(`❌ Restart nieudany (HTTP ${statusCode})`);
      console.log('💡 Zrestartuj bota ręcznie: https://panel.bot-hosting.net');
    }
  } catch (e) {
    console.error('❌ Błąd restartu:', e.message);
    console.log('💡 Zrestartuj bota ręcznie: https://panel.bot-hosting.net');
  }

  console.log('');
  console.log('✅ Gotowe!');
})();
