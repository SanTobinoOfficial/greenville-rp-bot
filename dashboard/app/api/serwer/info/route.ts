import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { getGuild, modifyGuild } from '@/lib/discord-api';

function ownerOnly() {
  return NextResponse.json({ error: 'Brak dostępu — tylko Owner' }, { status: 403 });
}

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

// GET /api/serwer/info — pobierz informacje o serwerze Discord
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  try {
    const guild = await getGuild(GUILD_ID);
    return NextResponse.json(guild);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/serwer/info — edytuj ustawienia serwera
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.OWNER) return ownerOnly();

  const body = await req.json();

  // Dozwolone pola do edycji
  const allowed: Record<string, unknown> = {};
  if (body.name            !== undefined) allowed.name             = body.name;
  if (body.description     !== undefined) allowed.description      = body.description;
  if (body.preferred_locale !== undefined) allowed.preferred_locale = body.preferred_locale;
  if (body.verification_level !== undefined) allowed.verification_level = body.verification_level;
  if (body.default_message_notifications !== undefined) allowed.default_message_notifications = body.default_message_notifications;
  if (body.afk_channel_id  !== undefined) allowed.afk_channel_id  = body.afk_channel_id;
  if (body.afk_timeout     !== undefined) allowed.afk_timeout      = body.afk_timeout;
  if (body.system_channel_id !== undefined) allowed.system_channel_id = body.system_channel_id;
  if (body.icon            !== undefined) allowed.icon             = body.icon; // base64 data URI

  try {
    const updated = await modifyGuild(GUILD_ID, allowed);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Discord API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
