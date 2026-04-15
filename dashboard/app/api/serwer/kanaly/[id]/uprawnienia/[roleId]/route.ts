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

// PUT /api/serwer/kanaly/[id]/uprawnienia/[roleId]
// Tworzy lub aktualizuje permission overwrite dla roli na kanale
export async function PUT(req: NextRequest, { params }: { params: { id: string; roleId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();
  const payload = {
    type: 0, // 0 = role overwrite
    allow: body.allow ?? '0',
    deny: body.deny ?? '0',
  };

  try {
    await dFetch('PUT', `/channels/${params.id}/permissions/${params.roleId}`, payload);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/serwer/kanaly/[id]/uprawnienia/[roleId]
// Usuwa permission overwrite dla roli z kanału
export async function DELETE(_: NextRequest, { params }: { params: { id: string; roleId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    await dFetch('DELETE', `/channels/${params.id}/permissions/${params.roleId}`);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
