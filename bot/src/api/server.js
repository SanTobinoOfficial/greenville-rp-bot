// Wewnętrzny serwer API bota — odbiera powiadomienia z dashboardu
// Dostępny pod BOT_API_URL (domyślnie http://localhost:3001)

const http = require('http');
const logger = require('../utils/logger');

/**
 * Uruchamia wewnętrzny serwer API bota
 * @param {import('discord.js').Client} client
 * @param {import('@prisma/client').PrismaClient} prisma
 */
function startApiServer(client, prisma) {
  const port = process.env.BOT_API_PORT || 3001;
  const apiKey = process.env.BOT_API_KEY;

  const server = http.createServer(async (req, res) => {
    // Walidacja klucza API
    const reqApiKey = req.headers['x-api-key'];
    if (apiKey && reqApiKey !== apiKey) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Parsuj body
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const url = req.url;

        res.setHeader('Content-Type', 'application/json');

        // ==================== QUIZ RESULT ====================
        if (url === '/quiz-result' && req.method === 'POST') {
          await handleQuizResult(client, prisma, data);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));

        // ==================== APPLICATION SUBMITTED ====================
        } else if (url === '/application-submitted' && req.method === 'POST') {
          await handleApplicationSubmitted(client, prisma, data);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));

        // ==================== APPLICATION REVIEWED ====================
        } else if (url === '/application-reviewed' && req.method === 'POST') {
          await handleApplicationReviewed(client, prisma, data);
          res.writeHead(200);
          res.end(JSON.stringify({ ok: true }));

        // ==================== HEALTH CHECK ====================
        } else if (url === '/health') {
          res.writeHead(200);
          res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));

        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (err) {
        logger.error('Bot API error:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  });

  server.listen(port, () => {
    logger.info(`Bot API Server nasłuchuje na porcie ${port}`);
  });

  return server;
}

// ==================== HANDLERY ====================

async function handleQuizResult(client, prisma, data) {
  const { userId, score, total, passed, partialPass } = data;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  try {
    const member = await guild.members.fetch(userId);
    const { EmbedBuilder } = require('discord.js');

    if (passed || partialPass) {
      // Nadaj rolę Mieszkaniec
      const role = guild.roles.cache.find(r => r.name === 'Mieszkaniec');
      if (role) await member.roles.add(role);

      // Usuń rolę Niezweryfikowany
      const unverRole = guild.roles.cache.find(r => r.name === 'Niezweryfikowany');
      if (unverRole) await member.roles.remove(unverRole).catch(() => {});
    }

    // Wyślij DM z wynikiem
    const embed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: 'Greenville RP — Weryfikacja' });

    if (passed) {
      embed
        .setColor(0x57F287)
        .setTitle('✅ Quiz zaliczony!')
        .setDescription(`Wynik: **${score}/${total}** — Gratulacje! Masz teraz dostęp do serwera jako **Mieszkaniec**.`);
    } else if (partialPass) {
      embed
        .setColor(0xFEE75C)
        .setTitle('⚠️ Quiz zaliczony z ostrzeżeniem')
        .setDescription(`Wynik: **${score}/${total}** — Masz dostęp do serwera, ale pamiętaj o dokładnym przestudiowaniu regulaminu!`);
    } else {
      embed
        .setColor(0xED4245)
        .setTitle('❌ Quiz niezaliczony')
        .setDescription(`Wynik: **${score}/${total}** — Nie uzyskałeś wystarczającej liczby punktów. Możesz spróbować ponownie po 24 godzinach.`);
    }

    await member.user.send({ embeds: [embed] }).catch(() => {});

    // Log
    const logChannel = guild.channels.cache.find(c => c.name === '🪪│logi-weryfikacji' && c.isTextBased());
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(passed || partialPass ? 0x57F287 : 0xED4245)
            .setTitle(`📋 Wynik quizu — ${passed ? 'ZALICZONY' : partialPass ? 'CZĘŚCIOWY' : 'NIEZALICZONY'}`)
            .addFields(
              { name: 'Gracz', value: `${member.user.tag} (<@${userId}>)`, inline: true },
              { name: 'Wynik', value: `${score}/${total}`, inline: true },
            )
            .setTimestamp()
        ],
      });
    }

  } catch (err) {
    logger.error('handleQuizResult:', err.message);
  }
}

async function handleApplicationSubmitted(client, prisma, data) {
  const { userId, position, type, applicationId } = data;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  try {
    const { EmbedBuilder } = require('discord.js');

    // Powiadom HR/Staff
    const hrChannel = guild.channels.cache.find(c => c.name === '💬│chat-hr' && c.isTextBased());
    if (hrChannel) {
      await hrChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('📋 Nowe podanie')
            .addFields(
              { name: 'Gracz', value: `<@${userId}>`, inline: true },
              { name: 'Pozycja', value: position, inline: true },
              { name: 'ID', value: applicationId, inline: true },
            )
            .setDescription(`Sprawdź panel: \`/dashboard/podania\``)
            .setTimestamp()
        ],
      });
    }
  } catch (err) {
    logger.error('handleApplicationSubmitted:', err.message);
  }
}

async function handleApplicationReviewed(client, prisma, data) {
  const { userId, position, action, note } = data;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  try {
    const { EmbedBuilder } = require('discord.js');
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const colorMap = { ACCEPTED: 0x57F287, REJECTED: 0xED4245, INCOMPLETE: 0xFEE75C };
    const titleMap = {
      ACCEPTED: `✅ Podanie zaakceptowane — ${position}`,
      REJECTED: `❌ Podanie odrzucone — ${position}`,
      INCOMPLETE: `⚠️ Podanie wymaga uzupełnienia — ${position}`,
    };

    const embed = new EmbedBuilder()
      .setColor(colorMap[action] || 0x5865F2)
      .setTitle(titleMap[action])
      .setTimestamp();

    if (note) embed.addFields({ name: '📝 Uwagi staffu', value: note });

    await member.user.send({ embeds: [embed] }).catch(() => {});

    // Nadaj rolę jeśli zaakceptowane
    if (action === 'ACCEPTED') {
      const serviceRole = guild.roles.cache.find(r => r.name === position);
      if (serviceRole) await member.roles.add(serviceRole).catch(() => {});
    }

  } catch (err) {
    logger.error('handleApplicationReviewed:', err.message);
  }
}

module.exports = { startApiServer };
