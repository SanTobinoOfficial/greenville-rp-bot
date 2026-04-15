import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';
const BASE = 'https://discord.com/api/v10';

function dHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

async function dFetch(method: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { method, headers: dHeaders() });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data?.message ?? ''} [${method} ${path}]`);
  return data;
}

function ownerOnly() {
  return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
}

// GET /api/serwer/bany — lista zbanowanych użytkowników
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    const bans = await dFetch('GET', `/guilds/${GUILD_ID}/bans?limit=1000`);
    return NextResponse.json(bans ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
