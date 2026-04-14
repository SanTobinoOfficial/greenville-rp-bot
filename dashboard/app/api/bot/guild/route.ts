// /api/bot/guild — Proxy do informacji serwera Discord (przez Bot API)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';

const BOT_API_URL = process.env.BOT_API_URL ?? 'http://localhost:3001';
const BOT_API_KEY = process.env.BOT_API_KEY ?? '';

async function botFetch(path: string) {
  const res = await fetch(`${BOT_API_URL}${path}`, {
    headers: { 'x-api-key': BOT_API_KEY },
    signal: AbortSignal.timeout(8000),
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.STAFF) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource') ?? 'info';

  try {
    let data;
    if (resource === 'members') data = await botFetch('/guild/members');
    else if (resource === 'channels') data = await botFetch('/guild/channels');
    else data = await botFetch('/guild/info');

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Bot niedostępny: ${message}` }, { status: 503 });
  }
}
