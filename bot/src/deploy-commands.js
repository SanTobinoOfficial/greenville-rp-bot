// Rejestruje wszystkie komendy slash na serwerze Discord
// Uruchom: node src/deploy-commands.js

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { REST, Routes } = require('@discordjs/rest');
const fs = require('fs');
const path = require('path');

const commands = [];
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
        commands.push(command.data.toJSON());
      }
    }
  }
}

loadCommands(commandsPath);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Rejestrowanie ${commands.length} komend slash...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    );

    console.log(`Pomyślnie zarejestrowano ${data.length} komend slash!`);
  } catch (error) {
    console.error('Błąd podczas rejestrowania komend:', error);
  }
})();
