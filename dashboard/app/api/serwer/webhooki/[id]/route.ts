import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';

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

// PATCH /api/serwer/webhooki/[id] — edytuj webhook (nazwa, kanał)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();
  const payload: Record<string, unknown> = {};
  if (body.name       !== undefined) payload.name       = body.name;
  if (body.channel_id !== undefined) payload.channel_id = body.channel_id;

  try {
    const updated = await dFetch('PATCH', `/webhooks/${params.id}`, payload);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/serwer/webhooki/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    await dFetch('DELETE', `/webhooks/${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
