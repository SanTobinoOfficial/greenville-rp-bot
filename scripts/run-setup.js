// Standalone setup runner — runs setupServer programmatically
// Usage: node scripts/run-setup.js
// Requires the bot to be configured in .env

require(require('path').join(__dirname, '../bot/node_modules/dotenv')).config({ path: require('path').join(__dirname, '../bot/.env') });

const { Client, GatewayIntentBits } = require(require('path').join(__dirname, '../bot/node_modules/discord.js'));
const { PrismaClient } = require(require('path').join(__dirname, '../bot/node_modules/@prisma/client'));
const { setupServer } = require(require('path').join(__dirname, '../bot/src/setup/setupServer'));
const serverConfig = require(require('path').join(__dirname, '../server-config.json'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

const prisma = new PrismaClient();

// ── Comprehensive quiz questions from server-config.json ─────────
function buildQuizQuestions() {
  return serverConfig.quiz.questions.map(q => ({
    question: q.question,
    answers: q.answers,
    correct: q.correct,
    order: q.order,
    active: true,
  }));
}

async function main() {
  console.log('🚀 AURORA Greenville RP — Standalone Setup Runner');
  console.log('='.repeat(50));

  client.once('ready', async () => {
    try {
      console.log(`✅ Bot zalogowany jako: ${client.user.tag}`);

      const guildId = process.env.DISCORD_GUILD_ID;
      const guild = await client.guilds.fetch(guildId).catch(() => null);

      if (!guild) {
        console.error(`❌ Nie znaleziono serwera o ID: ${guildId}`);
        process.exit(1);
      }

      console.log(`📡 Połączono z serwerem: ${guild.name} (${guild.memberCount} członków)`);

      // ── Sprawdź czy setup był już wykonany ───────────────────────
      const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
      if (settings?.setupCompleted) {
        console.log('⚠️  Setup był już wykonany wcześniej. Kontynuuję (aktualizacja embedów)...');
      }

      // ── Krok 1: Struktura serwera (role + kanały) ────────────────
      console.log('\n📋 Krok 1: Tworzenie struktury serwera...');
      const progress = (msg) => console.log('   ↳', msg);

      const { roles, channels } = await setupServer(guild, progress);

      console.log(`   ✅ Utworzono ${Object.keys(roles).length} ról`);
      console.log(`   ✅ Utworzono ${Object.keys(channels).length} kanałów/kategorii`);

      // ── Krok 2: Quiz questions ───────────────────────────────────
      console.log('\n📋 Krok 2: Seeding pytań quizu...');
      const existingCount = await prisma.quizQuestion.count();
      if (existingCount === 0) {
        const questions = buildQuizQuestions();
        await prisma.quizQuestion.createMany({ data: questions });
        console.log(`   ✅ Dodano ${questions.length} pytań do quizu (DB)`);
      } else {
        // Update existing questions with new ones from config
        await prisma.quizQuestion.deleteMany({});
        const questions = buildQuizQuestions();
        await prisma.quizQuestion.createMany({ data: questions });
        console.log(`   ✅ Zaktualizowano ${questions.length} pytań quizu`);
      }

      // ── Krok 3: Settings ─────────────────────────────────────────
      console.log('\n📋 Krok 3: Zapis ustawień do bazy danych...');
      await prisma.settings.upsert({
        where: { id: 'global' },
        update: { setupCompleted: true, guildId: guild.id },
        create: { id: 'global', setupCompleted: true, guildId: guild.id },
      });
      console.log('   ✅ Ustawienia zapisane');

      // ── Sukces ───────────────────────────────────────────────────
      console.log('\n' + '='.repeat(50));
      console.log('🎉 SETUP ZAKOŃCZONY POMYŚLNIE!');
      console.log('='.repeat(50));
      console.log(`\nPodsumowanie:`);
      console.log(`  Serwer: ${guild.name}`);
      console.log(`  Role: ${Object.keys(roles).length}`);
      console.log(`  Kanały: ${Object.keys(channels).length}`);
      console.log(`  Pytania quizu: ${serverConfig.quiz.questions.length}`);
      console.log('\nNastępne kroki:');
      console.log('  1. Uruchom bota: cd bot && npm start');
      console.log('  2. Użyj /setup-embeds na serwerze Discord aby wysłać embedy');
      console.log('  3. Skonfiguruj dashboard pod /dashboard/ustawienia');

    } catch (error) {
      console.error('\n❌ Błąd podczas setup:', error.message);
      console.error(error.stack);
      process.exitCode = 1;
    } finally {
      await prisma.$disconnect();
      client.destroy();
    }
  });

  client.on('error', (err) => {
    console.error('❌ Discord client error:', err.message);
  });

  console.log('🔌 Łączenie z Discord...');
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
