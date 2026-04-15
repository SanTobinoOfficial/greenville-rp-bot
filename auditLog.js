// auditLog.js — Rozbudowany system logowania zdarzeń Greenville RP
// Każda ważna akcja (nadanie roli, kara, weryfikacja itp.) trafia do:
//   1. Kanału #logi-audytu na Discordzie (embed z pełnymi detalami)
//   2. Bazy danych (BotLog) dla historii w dashboardzie

const { EmbedBuilder } = require('discord.js');
const logger = require('./logger');

// Typy zdarzeń audytu
const AUDIT_TYPES = {
  // ── Role ───────────────────────────────────────────────────
  ROLE_GRANT:     { color: 0x57F287, emoji: '🏷️',  label: 'Nadanie roli'      },
  ROLE_REMOVE:    { color: 0xED4245, emoji: '🗑️',  label: 'Odebranie roli'    },
  // ── Weryfikacja ────────────────────────────────────────────
  VERIFY_PASS:    { color: 0x57F287, emoji: '✅',  label: 'Weryfikacja'        },
  VERIFY_FAIL:    { color: 0xED4245, emoji: '❌',  label: 'Nieudana weryfikacja'},
  // ── Kary ──────────────────────────────────────────────────
  WARN_ADD:       { color: 0xFEE75C, emoji: '⚠️',  label: 'Warn'               },
  KICK:           { color: 0xFF8C00, emoji: '👢',  label: 'Kick'               },
  BAN:            { color: 0xED4245, emoji: '🔨',  label: 'Ban'                },
  UNBAN:          { color: 0x57F287, emoji: '🔓',  label: 'Unban'              },
  // ── Służby ────────────────────────────────────────────────
  DUTY_ON:        { color: 0x57F287, emoji: '🟢',  label: 'Wejście na służbę'  },
  DUTY_OFF:       { color: 0xED4245, emoji: '🔴',  label: 'Zejście ze służby'  },
  // ── Zatrzymania ───────────────────────────────────────────
  ARREST:         { color: 0xFF8C00, emoji: '🚔',  label: 'Zatrzymanie'        },
  RELEASE:        { color: 0x57F287, emoji: '🔓',  label: 'Zwolnienie'         },
  // ── Nakazy ────────────────────────────────────────────────
  WARRANT_ADD:    { color: 0xED4245, emoji: '🔴',  label: 'Nakaz aresztowania' },
  WARRANT_REMOVE: { color: 0x57F287, emoji: '🟢',  label: 'Usunięcie nakazu'   },
  // ── Pojazdy ───────────────────────────────────────────────
  VEHICLE_REG:    { color: 0x5865F2, emoji: '🚗',  label: 'Rejestracja pojazdu'},
  VEHICLE_REMOVE: { color: 0xED4245, emoji: '🚗',  label: 'Usunięcie pojazdu'  },
  // ── Tickety ───────────────────────────────────────────────
  TICKET_OPEN:    { color: 0x00c8ff, emoji: '🎫',  label: 'Nowy ticket'        },
  TICKET_CLOSE:   { color: 0x57F287, emoji: '✅',  label: 'Zamknięcie ticketu' },
  // ── Ogólne ────────────────────────────────────────────────
  COMMAND:        { color: 0x5865F2, emoji: '⌨️',  label: 'Komenda'            },
  BOT_START:      { color: 0x57F287, emoji: '🤖',  label: 'Start bota'         },
};

/**
 * Główna funkcja logowania audytu.
 *
 * @param {object} options
 * @param {import('discord.js').Client} options.client
 * @param {import('@prisma/client').PrismaClient} options.prisma
 * @param {keyof AUDIT_TYPES} options.type
 * @param {object} options.executor  - { id, tag } — kto wykonał akcję
 * @param {object} [options.target]  - { id, tag, roblox } — na kim
 * @param {string} options.action    - Krótki opis akcji
 * @param {Record<string,string>} [options.fields] - Dodatkowe pola embed
 * @param {string} [options.guildId]
 */
async function auditLog({ client, prisma, type, executor, target, action, fields = {}, guildId }) {
  const meta = AUDIT_TYPES[type] ?? { color: 0x5865F2, emoji: '📋', label: type };
  const gId = guildId ?? process.env.DISCORD_GUILD_ID;

  try {
    // ── 1. Wyślij embed na kanał #logi-audytu ─────────────────
    if (client && gId) {
      const guild = client.guilds.cache.get(gId);
      const logChannel = guild?.channels.cache.find(
        c => c.isTextBased() && (c.name.includes('logi') || c.name.includes('audit') || c.name.includes('log'))
      );

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(meta.color)
          .setTitle(`${meta.emoji} ${meta.label}`)
          .setDescription(action)
          .addFields(
            { name: '👤 Wykonał', value: executor?.tag ? `<@${executor.id}> (${executor.tag})` : `<@${executor?.id ?? 'System'}>`, inline: true },
            ...(target ? [{ name: '🎯 Dotyczy', value: target.tag ? `<@${target.id}> (${target.tag})` : `<@${target.id}>`, inline: true }] : []),
            ...(target?.roblox ? [{ name: '🎮 Nick Roblox', value: target.roblox, inline: true }] : []),
            ...Object.entries(fields).map(([name, value]) => ({ name, value: String(value), inline: true })),
          )
          .setFooter({ text: `Greenville RP — Audit Log • Typ: ${type}` })
          .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(e =>
          logger.error('[AUDIT] Błąd wysyłania na kanał:', e.message)
        );
      }
    }

    // ── 2. Zapis do bazy danych ────────────────────────────────
    if (prisma) {
      await prisma.botLog.create({
        data: {
          type,
          userId: executor?.id ?? null,
          guildId: gId ?? null,
          message: `${meta.emoji} ${meta.label}: ${action}`,
          data: {
            executor: executor ?? null,
            target: target ?? null,
            fields,
            timestamp: new Date().toISOString(),
          },
        },
      }).catch(e => logger.error('[AUDIT] Błąd zapisu do DB:', e.message));
    }

  } catch (err) {
    logger.error('[AUDIT] Nieoczekiwany błąd:', err.message);
  }
}

// ── Gotowe helpery ────────────────────────────────────────────────

/** Nadanie roli — loguje kto nadał i komu */
async function logRoleGrant(client, prisma, { executor, target, roleName, reason }) {
  await auditLog({
    client, prisma,
    type: 'ROLE_GRANT',
    executor,
    target,
    action: `Nadano rolę **${roleName}** użytkownikowi <@${target.id}>`,
    fields: {
      '🏷️ Rola': roleName,
      '📝 Powód': reason ?? 'Brak powodu',
    },
  });
}

/** Odebranie roli */
async function logRoleRemove(client, prisma, { executor, target, roleName, reason }) {
  await auditLog({
    client, prisma,
    type: 'ROLE_REMOVE',
    executor,
    target,
    action: `Odebrano rolę **${roleName}** użytkownikowi <@${target.id}>`,
    fields: {
      '🏷️ Rola': roleName,
      '📝 Powód': reason ?? 'Brak powodu',
    },
  });
}

/** Warn */
async function logWarn(client, prisma, { executor, target, reason, warnCount }) {
  await auditLog({
    client, prisma,
    type: 'WARN_ADD',
    executor,
    target,
    action: `Warn dla <@${target.id}>`,
    fields: {
      '📝 Powód': reason,
      '🔢 Łącznie warnów': String(warnCount ?? '?'),
    },
  });
}

/** Wejście/zejście ze służby */
async function logDuty(client, prisma, { executor, action, service }) {
  const type = action === 'ON_DUTY' ? 'DUTY_ON' : 'DUTY_OFF';
  await auditLog({
    client, prisma,
    type,
    executor,
    action: `${executor.tag} ${action === 'ON_DUTY' ? 'wszedł na' : 'zszedł ze'} służbę`,
    fields: { '🚔 Służba': service },
  });
}

/** Zatrzymanie */
async function logArrest(client, prisma, { executor, target, reason }) {
  await auditLog({
    client, prisma,
    type: 'ARREST',
    executor,
    target,
    action: `<@${executor.id}> zatrzymał <@${target.id}>`,
    fields: { '📝 Powód': reason },
  });
}

/** Nakaz aresztowania */
async function logWarrant(client, prisma, { executor, target, type: wType, reason }) {
  await auditLog({
    client, prisma,
    type: wType === 'add' ? 'WARRANT_ADD' : 'WARRANT_REMOVE',
    executor,
    target,
    action: wType === 'add'
      ? `Wystawiono nakaz aresztowania dla <@${target.id}>`
      : `Usunięto nakaz aresztowania dla <@${target.id}>`,
    fields: { '📝 Powód': reason ?? 'Brak powodu' },
  });
}

module.exports = {
  auditLog,
  logRoleGrant,
  logRoleRemove,
  logWarn,
  logDuty,
  logArrest,
  logWarrant,
  AUDIT_TYPES,
};
