// Główny plik bota Greenville RP
// Inicjalizuje klienta Discord, ładuje komendy i eventy

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { startStatsUpdater } = require('./utils/statsUpdater');
const { startRadio } = require('./music/radioManager');
const logger = require('./utils/logger');

// Inicjalizacja klienta Discord z pełnymi uprawnieniami
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.User,
  ],
});

// Inicjalizacja Prisma
const prisma = new PrismaClient();

// Kolekcja komend slash
client.commands = new Collection();

// Podpięcie Prisma do klienta (dostęp z całego bota)
client.prisma = prisma;

// ==================== ŁADOWANIE KOMEND ====================

const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      const command = require(fullPath);
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.info(`Załadowano komendę: /${command.data.name}`);
      } else {
        logger.warn(`Plik ${fullPath} nie zawiera wymaganych pól 'data' i 'execute'`);
      }
    }
  }
}

loadCommands(commandsPath);

// ==================== ŁADOWANIE EVENTÓW ====================

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client, prisma));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client, prisma));
  }
  logger.info(`Załadowano event: ${event.name}`);
}

// ==================== START BOTA ====================

async function main() {
  try {
    await prisma.$connect();
    logger.info('Połączono z bazą danych PostgreSQL');

    // Inicjalizacja domyślnych ustawień jeśli nie istnieją
    await prisma.settings.upsert({
      where: { id: 'global' },
      create: { id: 'global' },
      update: {},
    });

    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    logger.error('Błąd podczas uruchamiania bota:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Zamykanie bota...');
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  logger.error('Nieobsłużony błąd Promise:', error);
});

main();

module.exports = { client, prisma };
