import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { getChannels, createChannel } from '@/lib/discord-api';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

function ownerOnly() {
  return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
}

// GET /api/serwer/kanaly — pobierz wszystkie kanały i kategorie
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    const channels = await getChannels(GUILD_ID);
    // Sortuj: najpierw kategorie (type=4), potem reszta wg position
    const sorted = (channels as unknown[]).sort((a: unknown, b: unknown) => {
      const ca = a as { type: number; position: number };
      const cb = b as { type: number; position: number };
      if (ca.type === 4 && cb.type !== 4) return -1;
      if (ca.type !== 4 && cb.type === 4) return 1;
      return ca.position - cb.position;
    });
    return NextResponse.json(sorted);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/serwer/kanaly — utwórz nowy kanał
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nazwa kanału jest wymagana' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    name: body.name.trim().toLowerCase().replace(/\s+/g, '-'),
    type: body.type ?? 0,
  };
  if (body.topic)     payload.topic     = body.topic;
  if (body.parent_id) payload.parent_id = body.parent_id;
  if (body.nsfw !== undefined) payload.nsfw = body.nsfw;
  if (body.bitrate)   payload.bitrate   = body.bitrate;
  if (body.user_limit) payload.user_limit = body.user_limit;

  try {
    const channel = await createChannel(GUILD_ID, payload);
    return NextResponse.json(channel, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
