// /api/cad/arrests — CAD Zatrzymania (DB-backed via CadArrest model)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET ?active=true|false|all — pobierz zatrzymania
export async function GET(req: NextRequest) {
  const activeParam = req.nextUrl.searchParams.get('active') ?? 'all';
  const search      = req.nextUrl.searchParams.get('search') ?? '';

  const where: Record<string, unknown> = {};
  if (activeParam === 'true')  where.active = true;
  if (activeParam === 'false') where.active = false;
  if (search.trim()) {
    where.OR = [
      { targetName: { contains: search, mode: 'insensitive' } },
      { robloxName: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const arrests = await prisma.cadArrest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(arrests);
  } catch (e) {
    console.error('[CAD/arrests GET]', e);
    return NextResponse.json([]);
  }
}

// POST — nowe zatrzymanie
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.accessLevel < 1) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const { targetName, robloxName, reason, charges, callsign } = await req.json();
    if (!targetName || !reason) {
      return NextResponse.json({ error: 'Brak targetName/reason' }, { status: 400 });
    }

    const officerName = session.user.name ?? session.user.discordId;

    const arrest = await prisma.cadArrest.create({
      data: {
        targetName,
        robloxName: robloxName || null,
        officerName,
        officerId: session.user.discordId,
        reason,
        charges: Array.isArray(charges)
          ? charges
          : typeof charges === 'string' && charges.trim()
            ? charges.split(',').map((c: string) => c.trim()).filter(Boolean)
            : [],
        callsign: callsign || null,
        active: true,
      },
    });

    await prisma.botLog.create({
      data: {
        type: 'CAD_ARREST_ADD',
        userId: session.user.discordId,
        message: `Zatrzymanie: ${targetName} | ${reason}`,
        data: { arrestId: arrest.id, charges: arrest.charges },
      },
    }).catch(() => {});

    return NextResponse.json(arrest, { status: 201 });
  } catch (e) {
    console.error('[CAD/arrests POST]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

// PATCH ?id=X — zwolnij zatrzymanego
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.accessLevel < 1) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Brak ID' }, { status: 400 });

    const arrest = await prisma.cadArrest.update({
      where: { id },
      data: {
        active: false,
        releasedAt: new Date(),
        releasedBy: session.user.name ?? session.user.discordId,
      },
    });

    await prisma.botLog.create({
      data: {
        type: 'CAD_ARREST_RELEASE',
        userId: session.user.discordId,
        message: `Zwolnienie: ${arrest.targetName}`,
        data: { arrestId: arrest.id },
      },
    }).catch(() => {});

    return NextResponse.json(arrest);
  } catch (e) {
    console.error('[CAD/arrests PATCH]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

// DELETE ?id=X — usuń zatrzymanie (tylko OWNER/ADMIN)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.accessLevel < 2) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Brak ID' }, { status: 400 });

    await prisma.cadArrest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[CAD/arrests DELETE]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
