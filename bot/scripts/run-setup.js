// run-setup.js — jednorazowy skrypt inicjalizujący serwer
// Uruchamia to samo co komenda /setup, bez konieczności klikania w Discord
// Użycie: node scripts/run-setup.js

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { PrismaClient }    = require('@prisma/client');
const { setupServer }     = require('../src/setup/setupServer');
const { sendSetupEmbeds } = require('../src/setup/setupEmbeds');

const prisma = new PrismaClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

const log = (msg) => console.log(`[${new Date().toTimeString().slice(0,8)}] ${msg}`);

client.once('ready', async () => {
  log(`Zalogowano jako ${client.user.tag}`);

  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) { console.error('Brak DISCORD_GUILD_ID w .env'); process.exit(1); }

    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();
    log(`Serwer: ${guild.name} (${guild.memberCount} członków)`);

    await prisma.$connect();

    // Sprawdź czy setup był już wykonany
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (settings?.setupCompleted) {
      log('⚠️  Setup już był wykonany. Kontynuuję mimo to (force)...');
    }

    // ── Krok 1: Tworzenie struktury ────────────────────────────────
    log('🎭 Tworzenie ról i kanałów...');
    const { roles, channels } = await setupServer(guild, msg => log(`  ${msg}`));
    log(`✅ Struktura gotowa: ${Object.keys(roles).length} ról, ${Object.keys(channels).length} kanałów`);

    // ── Krok 2: Wysyłanie embedów ──────────────────────────────────
    log('📨 Wysyłanie embedów inicjalizujących...');
    await sendSetupEmbeds(guild, channels);
    log('✅ Embedy wysłane');

    // ── Krok 3: Domyślne pytania quizu ────────────────────────────
    const qCount = await prisma.quizQuestion.count();
    if (qCount === 0) {
      await prisma.quizQuestion.createMany({ data: DEFAULT_QUIZ_QUESTIONS });
      log(`✅ Dodano ${DEFAULT_QUIZ_QUESTIONS.length} domyślnych pytań quizu`);
    } else {
      log(`ℹ️  Quiz ma już ${qCount} pytań — pomijam`);
    }

    // ── Krok 4: Zapis ukończenia ───────────────────────────────────
    await prisma.settings.upsert({
      where:  { id: 'global' },
      update: { setupCompleted: true, guildId },
      create: { id: 'global', setupCompleted: true, guildId },
    });
    log('✅ Zapis do bazy — setupCompleted = true');

    log('\n🎉 SETUP ZAKOŃCZONY POMYŚLNIE!');
    log('Następne kroki:');
    log('  1. Uruchom bota: npm start (lub node src/index.js)');
    log('  2. Nadaj botowi rolę najwyższą w hierarchii Discord');
    log('  3. Dashboard: /dashboard/ustawienia');

  } catch (err) {
    console.error('❌ Błąd podczas setup:', err);
  } finally {
    await prisma.$disconnect();
    client.destroy();
    process.exit(0);
  }
});

client.login(process.env.DISCORD_TOKEN);

// ── Domyślne pytania quizu ─────────────────────────────────────────────────────
const DEFAULT_QUIZ_QUESTIONS = [
  { question: 'Co oznacza skrót FRP?', answers: ['Fail Roleplay','Fast Roleplay','Free Roleplay','Fun Roleplay'], correct: 0, order: 1 },
  { question: 'Jaka jest prędkość FRP w AURORA Greenville RP?', answers: ['100 mph','120 mph','131 mph','150 mph'], correct: 2, order: 2 },
  { question: 'Co oznacza VDM?', answers: ['Very Dangerous Move','Vehicle Deathmatch','Virtual Driver Mode','Violation During Mission'], correct: 1, order: 3 },
  { question: 'Ile pojazdów może zarejestrować zwykły Mieszkaniec?', answers: ['3','5','9','10'], correct: 1, order: 4 },
  { question: 'Co to jest Combat Logging (CL)?', answers: ['Walka z innymi graczami','Wyjście z gry podczas akcji RP aby uniknąć odpowiedzialności','Logowanie do gry podczas walki','Zakaz używania broni'], correct: 1, order: 5 },
  { question: 'Ile mandatów prowadzi do automatycznego zatrzymania prawa jazdy?', answers: ['5','8','10','15'], correct: 2, order: 6 },
  { question: 'Co oznacza komenda /me w RP?', answers: ['Opis danej chwili otoczenia','Opis czynności postaci','Wezwanie pomocy','Wyjście z trybu RP'], correct: 1, order: 7 },
  { question: 'Ile osób może brać udział w napadzie na bank?', answers: ['1-2','2-3','3-5','Brak limitu'], correct: 1, order: 8 },
  { question: 'Co to jest Meta Gaming (MG)?', answers: ['Granie na wielu serwerach jednocześnie','Używanie informacji z OOC w IC','Omijanie zasad serwera','Korzystanie z modów'], correct: 1, order: 9 },
  { question: 'Podczas Peacetime 1° co jest zakazane?', answers: ['Jazda pojazdami','Rozmowy na czacie','Akcje Crime i ucieczka przed policją','Korzystanie z /me'], correct: 2, order: 10 },
];
