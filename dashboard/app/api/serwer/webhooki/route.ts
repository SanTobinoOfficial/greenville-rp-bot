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

async function dFetch(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: dHeaders() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${data?.message ?? ''} [${method} ${path}]`);
  return data;
}

function ownerOnly() {
  return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
}

// GET /api/serwer/webhooki — lista webhooków serwera (opcjonalnie ?channel=id)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get('channel');

  try {
    let webhooks;
    if (channelId) {
      webhooks = await dFetch('GET', `/channels/${channelId}/webhooks`);
    } else {
      webhooks = await dFetch('GET', `/guilds/${GUILD_ID}/webhooks`);
    }
    return NextResponse.json(webhooks ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/serwer/webhooki — utwórz webhook
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();
  if (!body.channel_id) return NextResponse.json({ error: 'Brak channel_id' }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nazwa webhooków jest wymagana' }, { status: 400 });

  try {
    const webhook = await dFetch('POST', `/channels/${body.channel_id}/webhooks`, {
      name: body.name.trim(),
    });
    return NextResponse.json(webhook, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
