// /api/cad/proximity-chat — wiadomości czatu proximity (in-memory, globalThis)
// GET ?location=centrum&since=ISO — pobierz wiadomości z danej lokacji
// POST { locationId, content } — wyślij wiadomość (wymaga sesji)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface ProxMessage {
  id: string;
  locationId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
  expiresAt: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __proxChat: Record<string, ProxMessage[]>;
}
if (!global.__proxChat) global.__proxChat = {};

const MAX_PER_LOCATION = 100;
const TTL_MINUTES = 60;

function cleanExpired(locationId: string) {
  const now = new Date().toISOString();
  if (global.__proxChat[locationId]) {
    global.__proxChat[locationId] = global.__proxChat[locationId].filter(
      (m) => m.expiresAt > now
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const location = searchParams.get('location');
  const since = searchParams.get('since');

  if (!location) {
    return NextResponse.json({ error: 'Brak parametru location' }, { status: 400 });
  }

  cleanExpired(location);

  let msgs = global.__proxChat[location] ?? [];
  if (since) msgs = msgs.filter((m) => m.timestamp > since);

  return NextResponse.json(msgs.slice(-MAX_PER_LOCATION));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { locationId, content } = body as { locationId: string; content: string };

  if (!locationId || !content?.trim()) {
    return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 });
  }

  const truncated = String(content).slice(0, 300);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60 * 1000);

  const msg: ProxMessage = {
    id: `prox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    locationId,
    userId: session.user.discordId ?? 'unknown',
    username: session.user.name ?? 'Nieznany',
    content: truncated,
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  if (!global.__proxChat[locationId]) {
    global.__proxChat[locationId] = [];
  }

  cleanExpired(locationId);
  global.__proxChat[locationId].push(msg);

  if (global.__proxChat[locationId].length > MAX_PER_LOCATION) {
    global.__proxChat[locationId] = global.__proxChat[locationId].slice(-MAX_PER_LOCATION);
  }

  return NextResponse.json(msg, { status: 201 });
}
