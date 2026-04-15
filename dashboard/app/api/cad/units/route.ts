// /api/cad/units — aktywne jednostki CAD (DB-backed via CadUnit model)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minut bez heartbeatu = offline

// GET — wszystkie aktywne jednostki (lastSeen < 10 minut)
export async function GET() {
  try {
    const since = new Date(Date.now() - OFFLINE_THRESHOLD_MS);
    const units = await prisma.cadUnit.findMany({
      where: {
        lastSeen: { gte: since },
        status: { not: 'OFFLINE' },
      },
      orderBy: { service: 'asc' },
    });
    return NextResponse.json(units);
  } catch (e) {
    console.error('[CAD/units GET]', e);
    return NextResponse.json([]);
  }
}

// POST — upsert jednostki (heartbeat + aktualizacja statusu/callsign)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { callsign, status = 'AVAILABLE', service } = await req.json();
    if (!callsign) return NextResponse.json({ error: 'Brak callsign' }, { status: 400 });

    const { discordId, cadRole, name } = session.user;
    const resolvedService = service ?? cadRole ?? 'CYWIL';

    const unit = await prisma.cadUnit.upsert({
      where: { discordId },
      create: {
        discordId,
        callsign,
        name: name ?? discordId,
        service: resolvedService,
        cadRole,
        status,
        onDutySince: new Date(),
        lastSeen: new Date(),
      },
      update: {
        callsign,
        status,
        service: resolvedService,
        cadRole,
        name: name ?? discordId,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json(unit);
  } catch (e) {
    console.error('[CAD/units POST]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

// DELETE — zdejmij się ze służby (ustaw OFFLINE)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.cadUnit.updateMany({
      where: { discordId: session.user.discordId },
      data: { status: 'OFFLINE' },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[CAD/units DELETE]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
