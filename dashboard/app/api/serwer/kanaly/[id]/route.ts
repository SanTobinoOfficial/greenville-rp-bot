import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { modifyChannel, deleteChannel, reorderChannels } from '@/lib/discord-api';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

function ownerOnly() {
  return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
}

// PATCH /api/serwer/kanaly/[id] — edytuj kanał
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();
  const payload: Record<string, unknown> = {};

  if (body.name       !== undefined) payload.name       = body.name.toString().trim().toLowerCase().replace(/\s+/g, '-');
  if (body.topic      !== undefined) payload.topic      = body.topic;
  if (body.position   !== undefined) payload.position   = body.position;
  if (body.parent_id  !== undefined) payload.parent_id  = body.parent_id;
  if (body.nsfw       !== undefined) payload.nsfw       = body.nsfw;
  if (body.bitrate    !== undefined) payload.bitrate    = body.bitrate;
  if (body.user_limit !== undefined) payload.user_limit = body.user_limit;
  if (body.rate_limit_per_user !== undefined) payload.rate_limit_per_user = body.rate_limit_per_user;

  // Reorder batch: { positions: [{id, position, parent_id?}] }
  if (body.positions) {
    try {
      await reorderChannels(GUILD_ID, body.positions);
      return NextResponse.json({ ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Discord API error';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  try {
    const updated = await modifyChannel(params.id, payload);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/serwer/kanaly/[id] — usuń kanał
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    await deleteChannel(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
