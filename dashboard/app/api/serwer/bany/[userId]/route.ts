import { NextRequest, NextResponse } from 'next/server';
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

// DELETE /api/serwer/bany/[userId] — odbanuj użytkownika
export async function DELETE(_: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    await dFetch('DELETE', `/guilds/${GUILD_ID}/bans/${params.userId}`);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
