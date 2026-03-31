import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { getRoles, createRole } from '@/lib/discord-api';

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

function ownerOnly() {
  return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
}

// GET /api/serwer/role
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    const roles = await getRoles(GUILD_ID);
    // Sortuj od najwyższej pozycji
    const sorted = (roles as { position: number }[]).sort((a, b) => b.position - a.position);
    return NextResponse.json(sorted);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/serwer/role — utwórz rolę
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Nazwa roli jest wymagana' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    name: body.name.trim(),
  };
  if (body.color       !== undefined) payload.color       = body.color;       // decimal int
  if (body.hoist       !== undefined) payload.hoist       = body.hoist;
  if (body.mentionable !== undefined) payload.mentionable = body.mentionable;
  if (body.permissions !== undefined) payload.permissions = body.permissions; // string of bigint

  try {
    const role = await createRole(GUILD_ID, payload);
    return NextResponse.json(role, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
