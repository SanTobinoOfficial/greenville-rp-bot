// /api/bot/cmd — Proxy do Bot API
// Przekazuje komendy z dashboardu do bota Discord
// Wymaga Staff+ (accessLevel >= 2)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';

const BOT_API_URL = process.env.BOT_API_URL ?? 'http://localhost:3001';
const BOT_API_KEY = process.env.BOT_API_KEY ?? '';

// Minimalne uprawnienia per komenda (HELPER=1, MOD=2, ADMIN=3, OWNER=4)
const CMD_MIN_LEVEL: Record<string, number> = {
  warn:            ACCESS_LEVELS.HELPER,  // Helper+
  ban:             ACCESS_LEVELS.MOD,     // Moderator+
  unban:           ACCESS_LEVELS.MOD,     // Moderator+
  kick:            ACCESS_LEVELS.MOD,     // Moderator+
  mute:            ACCESS_LEVELS.HELPER,  // Helper+
  unmute:          ACCESS_LEVELS.HELPER,  // Helper+
  mandat:          ACCESS_LEVELS.HELPER,  // Helper+ (służby RP)
  'cofnij-mandat': ACCESS_LEVELS.HELPER,  // Helper+
  zatrzymaj:       ACCESS_LEVELS.HELPER,  // Helper+ (służby RP)
  zwolnij:         ACCESS_LEVELS.HELPER,  // Helper+
  sesja:           ACCESS_LEVELS.HELPER,  // Helper+ (Host ma HELPER)
  peacetime:       ACCESS_LEVELS.HELPER,  // Helper+
  announce:        ACCESS_LEVELS.MOD,     // Moderator+
  clearwarns:      ACCESS_LEVELS.MOD,     // Moderator+
  notatka:         ACCESS_LEVELS.HELPER,  // Helper+
  role:            ACCESS_LEVELS.ADMIN,   // Admin+
  // ── Praca RP ──────────────────────────────────────────────────────────────
  'set-job':       ACCESS_LEVELS.HELPER,  // Helper+ (HR może ustawiać prace)
  'clear-job':     ACCESS_LEVELS.HELPER,  // Helper+
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Brak sesji' }, { status: 401 });
  }

  const body = await req.json();
  const { cmd, ...cmdData } = body;

  if (!cmd) {
    return NextResponse.json({ error: 'Brak nazwy komendy (cmd)' }, { status: 400 });
  }

  const minLevel = CMD_MIN_LEVEL[cmd] ?? ACCESS_LEVELS.MOD;
  if (session.user.accessLevel < minLevel) {
    return NextResponse.json({ error: `Brak uprawnień do komendy /${cmd}` }, { status: 403 });
  }

  // Dodaj dane wystawcy
  const payload = {
    ...cmdData,
    issuerDiscordId: session.user.discordId,
    issuerName:      session.user.name ?? 'Dashboard',
    officerDiscordId: session.user.discordId,
    officerName:     session.user.name ?? 'Dashboard',
    authorDiscordId: session.user.discordId,
    authorName:      session.user.name ?? 'Dashboard',
    hostDiscordId:   session.user.discordId,
    hostName:        session.user.name ?? 'Dashboard',
  };

  try {
    const res = await fetch(`${BOT_API_URL}/cmd/${cmd}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': BOT_API_KEY },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Bot niedostępny: ${message}` }, { status: 503 });
  }
}

// GET /api/bot/cmd — info o dostępnych komendach
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.STAFF) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const available = Object.entries(CMD_MIN_LEVEL)
    .filter(([, minLevel]) => session.user.accessLevel >= minLevel)
    .map(([cmd]) => cmd);

  return NextResponse.json({ commands: available, accessLevel: session.user.accessLevel });
}
