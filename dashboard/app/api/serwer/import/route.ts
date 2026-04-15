// POST /api/serwer/import
// Przyjmuje server-config.json i aplikuje na serwer Discord przez Bot Token
// Dostępne tylko dla właściciela (OWNER)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const BASE = 'https://discord.com/api/v10';

// ─── Discord helpers ─────────────────────────────────────────────────────────

function dHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

async function dFetch(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: dHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 429) {
    const d = await res.json();
    const wait = (d.retry_after ?? 1) * 1000 + 300;
    await new Promise(r => setTimeout(r, wait));
    return dFetch(method, path, body);
  }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data?.message ?? ''} [${method} ${path}]`);
  return data;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Kolor hex → int ─────────────────────────────────────────────────────────

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ─── Permission preset → overwrites ─────────────────────────────────────────

type Role = { id: string; name: string };

function buildOverwrites(preset: string | undefined, roles: Record<string, Role>, everyoneId: string) {
  if (!preset) return [];

  const VIEW       = String(1n << 10n);
  const SEND       = String(1n << 11n);
  const CONNECT    = String(1n << 20n);
  const VIEW_SEND  = String((1n << 10n) | (1n << 11n));
  const VIEW_HIST  = String((1n << 10n) | (1n << 16n));

  const STAFF_NAMES  = ['Helper','HR','Host','Moderator','Administrator','Co-Owner','Owner'];
  const MEMBER_NAMES = ['Mieszkaniec','Nitro Booster','Wspierający',...STAFF_NAMES];
  const VIP_NAMES    = ['Nitro Booster','Wspierający',...STAFF_NAMES];

  const ow = (id: string, allow: string, deny: string) => ({ id, type: 0, allow, deny });

  const ids = (names: string[]) =>
    names.map(n => roles[n]).filter(Boolean).map(r => r.id);

  const only = (names: string[]) => [
    ow(everyoneId, '0', VIEW),
    ...ids(names).map(id => ow(id, VIEW_SEND, '0')),
  ];

  const readOnly = (extraWrite: string[] = []) => [
    ow(everyoneId, VIEW_HIST, SEND),
    ...ids(extraWrite).map(id => ow(id, SEND, '0')),
  ];

  switch (preset) {
    case 'staff_only':            return only(STAFF_NAMES);
    case 'members_only':          return only(MEMBER_NAMES);
    case 'vip_only':              return only(VIP_NAMES);
    case 'everyone_read_only':    return readOnly();
    case 'host_and_above':        return only(['Host','Administrator','Co-Owner','Owner']);
    case 'hr_and_above':          return only(['HR','Administrator','Co-Owner','Owner']);
    case 'service_policja':       return only([...STAFF_NAMES, 'Policja']);
    case 'service_ems':           return only([...STAFF_NAMES, 'EMS']);
    case 'service_straz_pozarna': return only([...STAFF_NAMES, 'Straż Pożarna']);
    case 'service_dot':           return only([...STAFF_NAMES, 'DOT']);
    case 'everyone_view_no_connect': return [ow(everyoneId, VIEW, CONNECT)];
    default: return [];
  }
}

// ─── Główna logika importu ────────────────────────────────────────────────────

interface ConfigRole {
  name: string;
  color: string;
  hoist: boolean;
  mentionable: boolean;
}

interface ConfigChannel {
  name: string;
  type: 'text' | 'voice';
  topic?: string;
  permissions?: string;
  write_roles?: string[];
  user_limit?: number;
}

interface ConfigCategory {
  name: string;
  permissions?: string;
  channels: ConfigChannel[];
}

interface ServerConfig {
  server?: {
    name?: string;
    description?: string;
    verification_level?: number;
    default_message_notifications?: number;
    preferred_locale?: string;
  };
  roles: ConfigRole[];
  categories: ConfigCategory[];
}

async function applyConfig(config: ServerConfig, log: string[]) {
  // 1. Pobierz istniejący stan
  log.push('📡 Pobieranie aktualnego stanu serwera...');
  const [channels, existingRoles] = await Promise.all([
    dFetch('GET', `/guilds/${GUILD_ID}/channels`),
    dFetch('GET', `/guilds/${GUILD_ID}/roles`),
  ]);

  const everyoneRole = (existingRoles as Role[]).find((r: Role) => r.name === '@everyone');
  const everyoneId = everyoneRole?.id ?? GUILD_ID;

  // 2. Usuń kanały
  log.push(`🗑️ Usuwanie ${(channels as unknown[]).length} kanałów...`);
  for (const ch of channels as { id: string }[]) {
    await dFetch('DELETE', `/channels/${ch.id}`).catch(() => {});
    await delay(300);
  }

  // 3. Usuń role
  const deletable = (existingRoles as { id: string; name: string; managed: boolean }[])
    .filter(r => r.name !== '@everyone' && !r.managed && r.id !== GUILD_ID);
  log.push(`🗑️ Usuwanie ${deletable.length} ról...`);
  for (const r of deletable) {
    await dFetch('DELETE', `/guilds/${GUILD_ID}/roles/${r.id}`).catch(() => {});
    await delay(300);
  }

  // 4. Twórz role
  log.push('🎭 Tworzenie ról...');
  const createdRoles: Record<string, Role> = {};
  for (const def of config.roles) {
    try {
      const role = await dFetch('POST', `/guilds/${GUILD_ID}/roles`, {
        name: def.name,
        color: hexToInt(def.color),
        hoist: def.hoist,
        mentionable: def.mentionable,
      });
      createdRoles[def.name] = role;
      log.push(`  ✅ @${def.name}`);
      await delay(400);
    } catch (e) {
      log.push(`  ❌ ${def.name}: ${(e as Error).message}`);
    }
  }

  // 5. Twórz kategorię + kanały
  log.push('📁 Tworzenie struktury kanałów...');
  for (const cat of config.categories) {
    try {
      const catPerms = buildOverwrites(cat.permissions, createdRoles, everyoneId);
      const category = await dFetch('POST', `/guilds/${GUILD_ID}/channels`, {
        name: cat.name,
        type: 4,
        permission_overwrites: catPerms,
      });
      log.push(`  📁 ${cat.name}`);
      await delay(400);

      for (const ch of cat.channels) {
        try {
          const chPerms = ch.permissions
            ? buildOverwrites(ch.permissions, createdRoles, everyoneId)
            : catPerms;

          const body: Record<string, unknown> = {
            name: ch.name,
            type: ch.type === 'voice' ? 2 : 0,
            parent_id: category.id,
            permission_overwrites: chPerms,
          };
          if (ch.topic)      body.topic = ch.topic;
          if (ch.user_limit) body.user_limit = ch.user_limit;

          await dFetch('POST', `/guilds/${GUILD_ID}/channels`, body);
          log.push(`    ✅ ${ch.name}`);
          await delay(350);
        } catch (e) {
          log.push(`    ❌ ${ch.name}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      log.push(`  ❌ Kategoria ${cat.name}: ${(e as Error).message}`);
    }
  }

  // 6. Ustawienia serwera
  if (config.server) {
    log.push('⚙️ Aktualizacja ustawień serwera...');
    try {
      await dFetch('PATCH', `/guilds/${GUILD_ID}`, {
        name: config.server.name,
        description: config.server.description,
        verification_level: config.server.verification_level,
        default_message_notifications: config.server.default_message_notifications,
        preferred_locale: config.server.preferred_locale,
      });
      log.push('  ✅ Ustawienia serwera zaktualizowane');
    } catch (e) {
      log.push(`  ❌ Ustawienia: ${(e as Error).message}`);
    }
  }

  log.push('🎉 Import zakończony!');
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) {
    return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const config: ServerConfig = body.config ?? body;

    if (!config.roles || !config.categories) {
      return NextResponse.json({ error: 'Nieprawidłowy format JSON — brak pól roles/categories' }, { status: 400 });
    }

    const log: string[] = [];
    await applyConfig(config, log);
    return NextResponse.json({ success: true, log });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
