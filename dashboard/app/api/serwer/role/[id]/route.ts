import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { modifyRole, deleteRole } from '@/lib/discord-api';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

function ownerOnly() {
  return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
}

// PATCH /api/serwer/role/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();
  const payload: Record<string, unknown> = {};

  if (body.name        !== undefined) payload.name        = body.name.trim();
  if (body.color       !== undefined) payload.color       = body.color;
  if (body.hoist       !== undefined) payload.hoist       = body.hoist;
  if (body.mentionable !== undefined) payload.mentionable = body.mentionable;
  if (body.permissions !== undefined) payload.permissions = body.permissions;

  try {
    const updated = await modifyRole(GUILD_ID, params.id, payload);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/serwer/role/[id]
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    await deleteRole(GUILD_ID, params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
