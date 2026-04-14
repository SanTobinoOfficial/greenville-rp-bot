// Wewnętrzny serwer API bota — odbiera powiadomienia z dashboardu
// Dostępny pod BOT_API_URL (domyślnie http://localhost:3001)
// v2.0 — obsługa komend moderacyjnych, RP i służb z dashboardu

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
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

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
        const url = req.url?.split('?')[0];

        res.setHeader('Content-Type', 'application/json');

        // ==================== HEALTH ====================
        if (url === '/health') {
          const guild = client.guilds.cache.first();
          res.writeHead(200);
          res.end(JSON.stringify({
            status: 'ok',
            uptime: process.uptime(),
            guilds: client.guilds.cache.size,
            guildName: guild?.name ?? null,
            members: guild?.memberCount ?? 0,
          }));

        // ==================== QUIZ RESULT ====================
        } else if (url === '/quiz-result' && req.method === 'POST') {
          await handleQuizResult(client, prisma, data);
          res.writeHead(200); res.end(JSON.stringify({ ok: true }));

        // ==================== APPLICATION SUBMITTED ====================
        } else if (url === '/application-submitted' && req.method === 'POST') {
          await handleApplicationSubmitted(client, prisma, data);
          res.writeHead(200); res.end(JSON.stringify({ ok: true }));

        // ==================== APPLICATION REVIEWED ====================
        } else if (url === '/application-reviewed' && req.method === 'POST') {
          await handleApplicationReviewed(client, prisma, data);
          res.writeHead(200); res.end(JSON.stringify({ ok: true }));

        // ==================== WARN ====================
        } else if (url === '/cmd/warn' && req.method === 'POST') {
          const result = await handleWarn(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== BAN ====================
        } else if (url === '/cmd/ban' && req.method === 'POST') {
          const result = await handleBan(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== UNBAN ====================
        } else if (url === '/cmd/unban' && req.method === 'POST') {
          const result = await handleUnban(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== KICK ====================
        } else if (url === '/cmd/kick' && req.method === 'POST') {
          const result = await handleKick(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== MUTE ====================
        } else if (url === '/cmd/mute' && req.method === 'POST') {
          const result = await handleMute(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== UNMUTE ====================
        } else if (url === '/cmd/unmute' && req.method === 'POST') {
          const result = await handleUnmute(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== MANDAT ====================
        } else if (url === '/cmd/mandat' && req.method === 'POST') {
          const result = await handleMandat(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== COFNIJ MANDAT ====================
        } else if (url === '/cmd/cofnij-mandat' && req.method === 'POST') {
          const result = await handleCofnijMandat(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== ZATRZYMAJ ====================
        } else if (url === '/cmd/zatrzymaj' && req.method === 'POST') {
          const result = await handleZatrzymaj(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== ZWOLNIJ ====================
        } else if (url === '/cmd/zwolnij' && req.method === 'POST') {
          const result = await handleZwolnij(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== SESJA ====================
        } else if (url === '/cmd/sesja' && req.method === 'POST') {
          const result = await handleSesja(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== PEACETIME ====================
        } else if (url === '/cmd/peacetime' && req.method === 'POST') {
          const result = await handlePeacetime(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== ANNOUNCE ====================
        } else if (url === '/cmd/announce' && req.method === 'POST') {
          const result = await handleAnnounce(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== CLEARWARNS ====================
        } else if (url === '/cmd/clearwarns' && req.method === 'POST') {
          const result = await handleClearwarns(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== NOTATKA ====================
        } else if (url === '/cmd/notatka' && req.method === 'POST') {
          const result = await handleNotatka(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== ROLE ====================
        } else if (url === '/cmd/role' && req.method === 'POST') {
          const result = await handleRole(client, prisma, data);
          res.writeHead(result.ok ? 200 : 400);
          res.end(JSON.stringify(result));

        // ==================== GET GUILD INFO ====================
        } else if (url === '/guild/info' && req.method === 'GET') {
          const result = await getGuildInfo(client, prisma);
          res.writeHead(200); res.end(JSON.stringify(result));

        // ==================== GET MEMBERS ====================
        } else if (url === '/guild/members' && req.method === 'GET') {
          const result = await getGuildMembers(client);
          res.writeHead(200); res.end(JSON.stringify(result));

        // ==================== GET CHANNELS ====================
        } else if (url === '/guild/channels' && req.method === 'GET') {
          const result = await getGuildChannels(client);
          res.writeHead(200); res.end(JSON.stringify(result));

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

// ==================== UTILS ====================

function getGuildId() {
  return process.env.DISCORD_GUILD_ID;
}

async function getGuild(client) {
  const guildId = getGuildId();
  if (!guildId) throw new Error('Brak DISCORD_GUILD_ID w .env');
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error('Bot nie jest na tym serwerze');
  return guild;
}

async function ensureDbUser(prisma, discordId, discordUsername) {
  let user = await prisma.user.findUnique({ where: { discordId } });
  if (!user) user = await prisma.user.create({ data: { discordId, discordUsername } });
  return user;
}

function parseDuration(str) {
  if (!str) return null;
  const m = str.match(/^(\d+)(m|h|d|w)$/i);
  if (!m) return null;
  const v = parseInt(m[1]);
  const units = { m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return v * units[m[2].toLowerCase()];
}

async function sendLogEmbed(guild, channelName, embed) {
  const ch = guild.channels.cache.find(c => c.name.includes(channelName) && c.isTextBased());
  if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
}

// ==================== GUILD INFO ====================

async function getGuildInfo(client, prisma) {
  try {
    const guild = await getGuild(client);
    await guild.members.fetch();
    return {
      ok: true,
      name: guild.name,
      memberCount: guild.memberCount,
      onlineCount: guild.members.cache.filter(m => m.presence?.status !== 'offline').size,
      roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor, memberCount: r.members.size })),
      channels: guild.channels.cache.filter(c => c.isTextBased()).map(c => ({ id: c.id, name: c.name })),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function getGuildMembers(client) {
  try {
    const guild = await getGuild(client);
    await guild.members.fetch();
    return {
      ok: true,
      members: guild.members.cache.map(m => ({
        id: m.user.id,
        tag: m.user.tag,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.displayAvatarURL({ size: 64 }),
        roles: m.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name })),
        joinedAt: m.joinedAt,
      })),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function getGuildChannels(client) {
  try {
    const guild = await getGuild(client);
    return {
      ok: true,
      channels: guild.channels.cache.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
      })),
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ==================== CMD HANDLERY ====================

async function handleWarn(client, prisma, data) {
  const { targetDiscordId, reason, issuerDiscordId, issuerName, duration } = data;
  if (!targetDiscordId || !reason) return { ok: false, error: 'Brak wymaganych pól' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);
    if (!targetMember) return { ok: false, error: 'Nie znaleziono gracza na serwerze' };

    const issuerDb = await ensureDbUser(prisma, issuerDiscordId ?? 'dashboard', issuerName ?? 'Dashboard');
    const targetDb = await ensureDbUser(prisma, targetDiscordId, targetMember.user.tag);

    const expiresMs = parseDuration(duration);
    const expiresAt = expiresMs ? new Date(Date.now() + expiresMs) : null;

    const newCase = await prisma.case.create({
      data: { type: 'WARN', targetId: targetDb.id, moderatorId: issuerDb.id, reason, expiresAt, status: 'ACTIVE' },
    });

    const activeWarns = await prisma.case.count({ where: { targetId: targetDb.id, type: 'WARN', status: 'ACTIVE' } });
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const warnAutoBanCount = settings?.warnAutoBanCount || 5;
    const warnAutoMuteCount = settings?.warnAutoMuteCount || 3;

    let autoAction = null;
    if (activeWarns >= warnAutoMuteCount && activeWarns < warnAutoBanCount) {
      await targetMember.timeout(86400000, `Auto-mute: ${activeWarns} warnów`).catch(() => {});
      autoAction = 'auto-mute 24h';
    }
    if (activeWarns >= warnAutoBanCount) {
      await guild.members.ban(targetDiscordId, { reason: `Auto-ban: ${activeWarns} warnów` }).catch(() => {});
      autoAction = 'auto-ban 7 dni';
    }

    const embed = new EmbedBuilder()
      .setColor(0xfbbf24)
      .setTitle(`⚠️ Ostrzeżenie | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `<@${targetDiscordId}>`, inline: true },
        { name: '🛡️ Wystawił', value: issuerName ?? 'Dashboard', inline: true },
        { name: '📝 Powód', value: reason, inline: false },
        { name: '📊 Aktywne warny', value: `${activeWarns}/${warnAutoBanCount}`, inline: true },
      ).setTimestamp();

    if (autoAction) embed.addFields({ name: '🚨 Auto-akcja', value: autoAction });
    await sendLogEmbed(guild, 'logi-moderacji', embed);
    await targetMember.user.send({ embeds: [embed] }).catch(() => {});

    return { ok: true, caseNumber: newCase.caseNumber, activeWarns, autoAction };
  } catch (err) {
    logger.error('handleWarn:', err.message);
    return { ok: false, error: err.message };
  }
}

async function handleBan(client, prisma, data) {
  const { targetDiscordId, reason, issuerDiscordId, issuerName, duration } = data;
  if (!targetDiscordId || !reason) return { ok: false, error: 'Brak wymaganych pól' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetUser = await client.users.fetch(targetDiscordId).catch(() => null);
    if (!targetUser) return { ok: false, error: 'Nie znaleziono użytkownika' };

    const issuerDb = await ensureDbUser(prisma, issuerDiscordId ?? 'dashboard', issuerName ?? 'Dashboard');
    const targetDb = await ensureDbUser(prisma, targetDiscordId, targetUser.tag);

    const expiresMs = parseDuration(duration);
    const expiresAt = expiresMs ? new Date(Date.now() + expiresMs) : null;
    const durationSec = expiresMs ? Math.floor(expiresMs / 1000) : null;

    await guild.members.ban(targetDiscordId, { reason, deleteMessageSeconds: 86400 });

    const newCase = await prisma.case.create({
      data: { type: 'BAN', targetId: targetDb.id, moderatorId: issuerDb.id, reason, duration: durationSec, expiresAt, status: 'ACTIVE' },
    });

    if (durationSec) {
      setTimeout(async () => {
        await guild.members.unban(targetDiscordId, 'Auto-unban').catch(() => {});
        await prisma.case.update({ where: { id: newCase.id }, data: { status: 'EXPIRED' } }).catch(() => {});
      }, expiresMs);
    }

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle(`🔨 Ban | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `${targetUser.tag} (<@${targetDiscordId}>)`, inline: true },
        { name: '🛡️ Wystawił', value: issuerName ?? 'Dashboard', inline: true },
        { name: '📝 Powód', value: reason, inline: false },
        { name: '⏱️ Czas', value: duration ?? 'Permanentny', inline: true },
      ).setTimestamp();

    await sendLogEmbed(guild, 'logi-moderacji', embed);
    return { ok: true, caseNumber: newCase.caseNumber };
  } catch (err) {
    logger.error('handleBan:', err.message);
    return { ok: false, error: err.message };
  }
}

async function handleUnban(client, prisma, data) {
  const { targetDiscordId, reason, issuerDiscordId, issuerName } = data;
  if (!targetDiscordId) return { ok: false, error: 'Brak targetDiscordId' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    await guild.members.unban(targetDiscordId, reason ?? 'Unban z dashboardu');

    const issuerDb = await ensureDbUser(prisma, issuerDiscordId ?? 'dashboard', issuerName ?? 'Dashboard');
    const targetDb = await prisma.user.findUnique({ where: { discordId: targetDiscordId } });
    if (targetDb) {
      await prisma.case.create({
        data: { type: 'UNBAN', targetId: targetDb.id, moderatorId: issuerDb.id, reason: reason ?? 'Unban z dashboardu', status: 'ACTIVE' },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('✅ Unban')
      .addFields(
        { name: '👤 Gracz', value: `<@${targetDiscordId}>`, inline: true },
        { name: '🛡️ Wystawił', value: issuerName ?? 'Dashboard', inline: true },
        { name: '📝 Powód', value: reason ?? 'Brak', inline: false },
      ).setTimestamp();
    await sendLogEmbed(guild, 'logi-moderacji', embed);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleKick(client, prisma, data) {
  const { targetDiscordId, reason, issuerDiscordId, issuerName } = data;
  if (!targetDiscordId || !reason) return { ok: false, error: 'Brak wymaganych pól' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);
    if (!targetMember) return { ok: false, error: 'Gracz nie jest na serwerze' };

    await targetMember.kick(reason);

    const issuerDb = await ensureDbUser(prisma, issuerDiscordId ?? 'dashboard', issuerName ?? 'Dashboard');
    const targetDb = await ensureDbUser(prisma, targetDiscordId, targetMember.user.tag);
    const newCase = await prisma.case.create({
      data: { type: 'KICK', targetId: targetDb.id, moderatorId: issuerDb.id, reason, status: 'ACTIVE' },
    });

    const embed = new EmbedBuilder()
      .setColor(0xf97316)
      .setTitle(`👢 Kick | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `${targetMember.user.tag}`, inline: true },
        { name: '🛡️ Wystawił', value: issuerName ?? 'Dashboard', inline: true },
        { name: '📝 Powód', value: reason, inline: false },
      ).setTimestamp();
    await sendLogEmbed(guild, 'logi-moderacji', embed);
    return { ok: true, caseNumber: newCase.caseNumber };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleMute(client, prisma, data) {
  const { targetDiscordId, reason, issuerDiscordId, issuerName, duration } = data;
  if (!targetDiscordId || !reason || !duration) return { ok: false, error: 'Brak wymaganych pól (targetDiscordId, reason, duration)' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);
    if (!targetMember) return { ok: false, error: 'Gracz nie jest na serwerze' };

    const durationMs = parseDuration(duration);
    if (!durationMs) return { ok: false, error: 'Nieprawidłowy format czasu (np. 1h, 24h, 7d)' };

    await targetMember.timeout(durationMs, reason);

    const issuerDb = await ensureDbUser(prisma, issuerDiscordId ?? 'dashboard', issuerName ?? 'Dashboard');
    const targetDb = await ensureDbUser(prisma, targetDiscordId, targetMember.user.tag);
    const newCase = await prisma.case.create({
      data: { type: 'MUTE', targetId: targetDb.id, moderatorId: issuerDb.id, reason, duration: Math.floor(durationMs / 1000), expiresAt: new Date(Date.now() + durationMs), status: 'ACTIVE' },
    });

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`🔇 Mute | Case #${newCase.caseNumber}`)
      .addFields(
        { name: '👤 Gracz', value: `${targetMember.user.tag}`, inline: true },
        { name: '⏱️ Czas', value: duration, inline: true },
        { name: '📝 Powód', value: reason, inline: false },
      ).setTimestamp();
    await sendLogEmbed(guild, 'logi-moderacji', embed);
    await targetMember.user.send({ embeds: [embed] }).catch(() => {});
    return { ok: true, caseNumber: newCase.caseNumber };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleUnmute(client, prisma, data) {
  const { targetDiscordId, reason, issuerDiscordId, issuerName } = data;
  if (!targetDiscordId) return { ok: false, error: 'Brak targetDiscordId' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);
    if (!targetMember) return { ok: false, error: 'Gracz nie jest na serwerze' };

    await targetMember.timeout(null, reason ?? 'Unmute z dashboardu');

    const issuerDb = await ensureDbUser(prisma, issuerDiscordId ?? 'dashboard', issuerName ?? 'Dashboard');
    const targetDb = await prisma.user.findUnique({ where: { discordId: targetDiscordId } });
    if (targetDb) {
      await prisma.case.create({
        data: { type: 'UNMUTE', targetId: targetDb.id, moderatorId: issuerDb.id, reason: reason ?? 'Unmute z dashboardu', status: 'ACTIVE' },
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('🔊 Unmute')
      .addFields({ name: '👤 Gracz', value: `${targetMember.user.tag}`, inline: true }).setTimestamp();
    await sendLogEmbed(guild, 'logi-moderacji', embed);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleMandat(client, prisma, data) {
  const { targetDiscordId, typ, reason, kwota, issuerDiscordId, issuerName } = data;
  if (!targetDiscordId || !typ || !reason) return { ok: false, error: 'Brak wymaganych pól' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);

    const issuerDb = await ensureDbUser(prisma, issuerDiscordId ?? 'dashboard', issuerName ?? 'Dashboard');
    const targetDb = targetMember
      ? await ensureDbUser(prisma, targetDiscordId, targetMember.user.tag)
      : await prisma.user.findUnique({ where: { discordId: targetDiscordId } });

    if (!targetDb) return { ok: false, error: 'Gracz nie znaleziony w bazie' };

    const fineTypeMap = { mandat: 'MANDAT', grzywna: 'GRZYWNA', areszt: 'ARESZT' };
    const fineType = fineTypeMap[typ] ?? 'MANDAT';

    const fine = await prisma.fine.create({
      data: { targetId: targetDb.id, issuerId: issuerDb.id, type: fineType, amount: kwota ?? null, reason },
    });

    const colors = { MANDAT: 0xfbbf24, GRZYWNA: 0xf97316, ARESZT: 0xef4444 };
    const embed = new EmbedBuilder()
      .setColor(colors[fineType])
      .setTitle(`📋 ${typ.charAt(0).toUpperCase() + typ.slice(1)} RP`)
      .addFields(
        { name: '👤 Gracz', value: `<@${targetDiscordId}>`, inline: true },
        { name: '🛡️ Służba', value: issuerName ?? 'Dashboard', inline: true },
        { name: '📝 Powód', value: reason, inline: false },
        ...(kwota ? [{ name: '💰 Kwota', value: `${kwota}$`, inline: true }] : []),
      ).setTimestamp();
    await sendLogEmbed(guild, 'logi-rp', embed);
    if (targetMember) await targetMember.user.send({ embeds: [embed] }).catch(() => {});
    return { ok: true, fineId: fine.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleCofnijMandat(client, prisma, data) {
  const { fineId, reason } = data;
  if (!fineId) return { ok: false, error: 'Brak fineId' };
  try {
    await prisma.fine.update({ where: { id: fineId }, data: { active: false } });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleZatrzymaj(client, prisma, data) {
  const { targetDiscordId, reason, officerDiscordId, officerName } = data;
  if (!targetDiscordId || !reason) return { ok: false, error: 'Brak wymaganych pól' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);
    if (!targetMember) return { ok: false, error: 'Gracz nie jest na serwerze' };

    const officerDb = await ensureDbUser(prisma, officerDiscordId ?? 'dashboard', officerName ?? 'Dashboard');
    const targetDb = await ensureDbUser(prisma, targetDiscordId, targetMember.user.tag);

    // Sprawdź czy nie jest już zatrzymany
    const existing = await prisma.arrest.findFirst({ where: { targetId: targetDb.id, active: true } });
    if (existing) return { ok: false, error: 'Gracz jest już zatrzymany' };

    const arrest = await prisma.arrest.create({
      data: { targetId: targetDb.id, officerId: officerDb.id, reason },
    });

    // Dodaj rolę Zatrzymany
    const arrestRole = guild.roles.cache.find(r => r.name === 'Zatrzymany' || r.name === 'zatrzymany');
    if (arrestRole) await targetMember.roles.add(arrestRole).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('🚨 Zatrzymanie RP')
      .addFields(
        { name: '👤 Gracz', value: `${targetMember.user.tag}`, inline: true },
        { name: '🚔 Oficer', value: officerName ?? 'Dashboard', inline: true },
        { name: '📝 Powód', value: reason, inline: false },
      ).setTimestamp();
    await sendLogEmbed(guild, 'logi-rp', embed);
    await targetMember.user.send({ embeds: [embed] }).catch(() => {});
    return { ok: true, arrestId: arrest.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleZwolnij(client, prisma, data) {
  const { targetDiscordId, reason, officerDiscordId, officerName } = data;
  if (!targetDiscordId) return { ok: false, error: 'Brak targetDiscordId' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);

    const targetDb = await prisma.user.findUnique({ where: { discordId: targetDiscordId } });
    if (!targetDb) return { ok: false, error: 'Gracz nie znaleziony w bazie' };

    const arrest = await prisma.arrest.findFirst({ where: { targetId: targetDb.id, active: true } });
    if (!arrest) return { ok: false, error: 'Gracz nie jest zatrzymany' };

    await prisma.arrest.update({ where: { id: arrest.id }, data: { active: false, releasedAt: new Date(), releasedBy: officerName ?? 'Dashboard' } });

    // Usuń rolę Zatrzymany
    if (targetMember) {
      const arrestRole = guild.roles.cache.find(r => r.name === 'Zatrzymany' || r.name === 'zatrzymany');
      if (arrestRole) await targetMember.roles.remove(arrestRole).catch(() => {});

      const embed = new EmbedBuilder()
        .setColor(0x22c55e).setTitle('✅ Zwolnienie z zatrzymania')
        .addFields(
          { name: '👤 Gracz', value: targetMember.user.tag, inline: true },
          { name: '🚔 Oficer', value: officerName ?? 'Dashboard', inline: true },
          ...(reason ? [{ name: '📝 Uwagi', value: reason }] : []),
        ).setTimestamp();
      await sendLogEmbed(guild, 'logi-rp', embed);
      await targetMember.user.send({ embeds: [embed] }).catch(() => {});
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleSesja(client, prisma, data) {
  const { data: sesjaData, godzina, maksGraczy, opis, hostDiscordId, hostName } = data;
  if (!sesjaData || !godzina || !maksGraczy) return { ok: false, error: 'Brak wymaganych pól (data, godzina, maksGraczy)' };
  try {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const guild = await getGuild(client);

    const [day, month, year] = sesjaData.split('.').map(Number);
    const [hour, minute] = godzina.split(':').map(Number);
    const sessionDate = new Date(year, month - 1, day, hour, minute);
    if (isNaN(sessionDate.getTime())) return { ok: false, error: 'Nieprawidłowy format daty/godziny' };

    const hostDb = await ensureDbUser(prisma, hostDiscordId ?? 'dashboard', hostName ?? 'Dashboard');
    const sessionChannel = guild.channels.cache.find(c => c.name.includes('sesje') && c.isTextBased());

    const session = await prisma.session.create({
      data: { hostId: hostDb.id, date: sessionDate, maxPlayers: maksGraczy, description: opis ?? null, status: 'UPCOMING' },
    });

    const timestamp = Math.floor(sessionDate.getTime() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🎪 Nowa Sesja RP — AURORA Greenville')
      .addFields(
        { name: '📅 Data i godzina', value: `<t:${timestamp}:F>`, inline: true },
        { name: '👥 Maks. graczy', value: `${maksGraczy}`, inline: true },
        { name: '👤 Host', value: hostName ?? 'Dashboard', inline: true },
        ...(opis ? [{ name: '📋 Opis', value: opis }] : []),
      )
      .setFooter({ text: 'AURORA Greenville RP • Sesje RP' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`session_join_${session.id}`).setLabel('✅ Zapisz się').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`session_leave_${session.id}`).setLabel('❌ Wypisz się').setStyle(ButtonStyle.Danger),
    );

    let messageId = null;
    if (sessionChannel) {
      const msg = await sessionChannel.send({ embeds: [embed], components: [row] });
      messageId = msg.id;
      await prisma.session.update({ where: { id: session.id }, data: { messageId, channelId: sessionChannel.id } });
    }

    return { ok: true, sessionId: session.id, messageId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handlePeacetime(client, prisma, data) {
  const { status, issuerName } = data;
  // status: 'PEACETIME' | 'PRIORITY_1' | 'PRIORITY_2' | 'PRIORITY_3' | 'OFF'
  if (!status) return { ok: false, error: 'Brak statusu' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);

    const labels = {
      PEACETIME:  '🕊️ PEACETIME — zakaz scen kryminalnych',
      PRIORITY_1: '⚠️ PRIORITY 1 — lekkie sceny crime',
      PRIORITY_2: '🟠 PRIORITY 2 — pełna aktywność',
      PRIORITY_3: '🔴 PRIORITY 3 — najwyższy priorytet!',
      OFF:        '✅ Peacetime zakończony',
    };

    const colors = { PEACETIME: 0x22c55e, PRIORITY_1: 0xeab308, PRIORITY_2: 0xf97316, PRIORITY_3: 0xef4444, OFF: 0x6b7280 };

    const embed = new EmbedBuilder()
      .setColor(colors[status] ?? 0x5865F2)
      .setTitle(labels[status] ?? status)
      .addFields({ name: '👤 Ustawił', value: issuerName ?? 'Dashboard', inline: true })
      .setTimestamp();

    const sesjeChannel = guild.channels.cache.find(c => c.name.includes('sesje') && c.isTextBased());
    const ogloszeniaChannel = guild.channels.cache.find(c => c.name.includes('ogłoszenia') && c.isTextBased());
    if (sesjeChannel) await sesjeChannel.send({ embeds: [embed] });
    if (ogloszeniaChannel && ogloszeniaChannel.id !== sesjeChannel?.id) await ogloszeniaChannel.send({ embeds: [embed] });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleAnnounce(client, prisma, data) {
  const { channelId, message, title, color, pingEveryone, issuerName } = data;
  if (!channelId || !message) return { ok: false, error: 'Brak channelId lub message' };
  try {
    const { EmbedBuilder } = require('discord.js');
    const guild = await getGuild(client);
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) return { ok: false, error: 'Kanał nie znaleziony lub nie jest tekstowy' };

    const embed = new EmbedBuilder()
      .setColor(color ? parseInt(color.replace('#', ''), 16) : 0x5865F2)
      .setTitle(title ?? '📢 Ogłoszenie')
      .setDescription(message)
      .addFields({ name: '👤 Autor', value: issuerName ?? 'Dashboard', inline: true })
      .setTimestamp();

    const content = pingEveryone ? '@everyone' : undefined;
    await channel.send({ content, embeds: [embed] });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleClearwarns(client, prisma, data) {
  const { targetDiscordId, issuerDiscordId, issuerName } = data;
  if (!targetDiscordId) return { ok: false, error: 'Brak targetDiscordId' };
  try {
    const targetDb = await prisma.user.findUnique({ where: { discordId: targetDiscordId } });
    if (!targetDb) return { ok: false, error: 'Gracz nie znaleziony w bazie' };

    const updated = await prisma.case.updateMany({
      where: { targetId: targetDb.id, type: 'WARN', status: 'ACTIVE' },
      data: { status: 'REMOVED' },
    });

    return { ok: true, clearedCount: updated.count };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleNotatka(client, prisma, data) {
  const { targetDiscordId, content, authorDiscordId, authorName } = data;
  if (!targetDiscordId || !content) return { ok: false, error: 'Brak wymaganych pól' };
  try {
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);
    const authorDb = await ensureDbUser(prisma, authorDiscordId ?? 'dashboard', authorName ?? 'Dashboard');
    const targetDb = targetMember
      ? await ensureDbUser(prisma, targetDiscordId, targetMember.user.tag)
      : await prisma.user.findUnique({ where: { discordId: targetDiscordId } });

    if (!targetDb) return { ok: false, error: 'Gracz nie znaleziony w bazie' };

    const note = await prisma.note.create({ data: { targetId: targetDb.id, authorId: authorDb.id, content } });
    return { ok: true, noteId: note.id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function handleRole(client, prisma, data) {
  const { targetDiscordId, roleId, action } = data;
  // action: 'add' | 'remove'
  if (!targetDiscordId || !roleId || !action) return { ok: false, error: 'Brak wymaganych pól (targetDiscordId, roleId, action)' };
  try {
    const guild = await getGuild(client);
    const targetMember = await guild.members.fetch(targetDiscordId).catch(() => null);
    if (!targetMember) return { ok: false, error: 'Gracz nie jest na serwerze' };
    const role = guild.roles.cache.get(roleId);
    if (!role) return { ok: false, error: 'Rola nie istnieje' };

    if (action === 'add') await targetMember.roles.add(role);
    else if (action === 'remove') await targetMember.roles.remove(role);
    else return { ok: false, error: 'Nieprawidłowa akcja (add/remove)' };

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ==================== LEGACY HANDLERY ====================

async function handleQuizResult(client, prisma, data) {
  const { userId, score, total, passed, partialPass } = data;
  const guild = await getGuild(client).catch(() => null);
  if (!guild) return;
  try {
    const { EmbedBuilder } = require('discord.js');
    const member = await guild.members.fetch(userId);
    if (passed || partialPass) {
      const role = guild.roles.cache.find(r => r.name === 'Mieszkaniec');
      if (role) await member.roles.add(role);
      const unverRole = guild.roles.cache.find(r => r.name === 'Niezweryfikowany');
      if (unverRole) await member.roles.remove(unverRole).catch(() => {});
    }
    const embed = new EmbedBuilder().setTimestamp().setFooter({ text: 'AURORA Greenville RP — Weryfikacja' });
    if (passed) embed.setColor(0x57F287).setTitle('✅ Quiz zaliczony!').setDescription(`Wynik: **${score}/${total}** — Gratulacje! Masz teraz dostęp jako **Mieszkaniec**.`);
    else if (partialPass) embed.setColor(0xFEE75C).setTitle('⚠️ Quiz zaliczony z ostrzeżeniem').setDescription(`Wynik: **${score}/${total}** — Masz dostęp, ale przestudiuj regulamin!`);
    else embed.setColor(0xED4245).setTitle('❌ Quiz niezaliczony').setDescription(`Wynik: **${score}/${total}** — Spróbuj ponownie po 24h.`);
    await member.user.send({ embeds: [embed] }).catch(() => {});
    const logChannel = guild.channels.cache.find(c => c.name === '🪪│logi-weryfikacji' && c.isTextBased());
    if (logChannel) {
      await logChannel.send({
        embeds: [new EmbedBuilder().setColor(passed || partialPass ? 0x57F287 : 0xED4245)
          .setTitle(`📋 Wynik quizu — ${passed ? 'ZALICZONY' : partialPass ? 'CZĘŚCIOWY' : 'NIEZALICZONY'}`)
          .addFields({ name: 'Gracz', value: `${member.user.tag} (<@${userId}>)`, inline: true }, { name: 'Wynik', value: `${score}/${total}`, inline: true })
          .setTimestamp()],
      });
    }
  } catch (err) { logger.error('handleQuizResult:', err.message); }
}

async function handleApplicationSubmitted(client, prisma, data) {
  const { userId, position, type, applicationId } = data;
  const guild = await getGuild(client).catch(() => null);
  if (!guild) return;
  try {
    const { EmbedBuilder } = require('discord.js');
    const hrChannel = guild.channels.cache.find(c => c.name === '💬│chat-hr' && c.isTextBased());
    if (hrChannel) {
      await hrChannel.send({ embeds: [new EmbedBuilder().setColor(0x10B981).setTitle('📋 Nowe podanie')
        .addFields({ name: 'Gracz', value: `<@${userId}>`, inline: true }, { name: 'Pozycja', value: position, inline: true }, { name: 'ID', value: applicationId, inline: true })
        .setDescription('Sprawdź panel: `/dashboard/podania`').setTimestamp()] });
    }
  } catch (err) { logger.error('handleApplicationSubmitted:', err.message); }
}

async function handleApplicationReviewed(client, prisma, data) {
  const { userId, position, action, note } = data;
  const guild = await getGuild(client).catch(() => null);
  if (!guild) return;
  try {
    const { EmbedBuilder } = require('discord.js');
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    const colorMap = { ACCEPTED: 0x57F287, REJECTED: 0xED4245, INCOMPLETE: 0xFEE75C };
    const titleMap = { ACCEPTED: `✅ Podanie zaakceptowane — ${position}`, REJECTED: `❌ Podanie odrzucone — ${position}`, INCOMPLETE: `⚠️ Wymaga uzupełnienia — ${position}` };
    const embed = new EmbedBuilder().setColor(colorMap[action] || 0x5865F2).setTitle(titleMap[action]).setTimestamp();
    if (note) embed.addFields({ name: '📝 Uwagi staffu', value: note });
    await member.user.send({ embeds: [embed] }).catch(() => {});
    if (action === 'ACCEPTED') {
      const serviceRole = guild.roles.cache.find(r => r.name === position);
      if (serviceRole) await member.roles.add(serviceRole).catch(() => {});
    }
  } catch (err) { logger.error('handleApplicationReviewed:', err.message); }
}

module.exports = { startApiServer };
