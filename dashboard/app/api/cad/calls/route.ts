// /api/cad/calls — zarządzanie zgłoszeniami CAD (DB-backed via CadCall model)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET — aktywne zgłoszenia
export async function GET() {
  try {
    const calls = await prisma.cadCall.findMany({
      where: { status: { not: 'CLOSED' } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    return NextResponse.json(calls);
  } catch (e) {
    console.error('[CAD/calls GET]', e);
    return NextResponse.json([]);
  }
}

// POST — nowe zgłoszenie
export async function POST(req: NextRequest) {
  try {
    const { nature, location, description, priority = 'MEDIUM' } = await req.json();
    if (!nature || !location) {
      return NextResponse.json({ error: 'Brak nature/location' }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    const call = await prisma.cadCall.create({
      data: { nature, location, description, priority, reportedBy: session?.user?.discordId ?? null },
    });
    return NextResponse.json(call, { status: 201 });
  } catch (e) {
    console.error('[CAD/calls POST]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

// PATCH — aktualizacja (status, dispatchedTo, priority)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, status, dispatchedTo, priority } = await req.json();
    if (!id) return NextResponse.json({ error: 'Brak ID' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (status) { data.status = status; if (status === 'CLOSED') data.closedAt = new Date(); }
    if (dispatchedTo !== undefined) data.dispatchedTo = dispatchedTo;
    if (priority) data.priority = priority;

    const updated = await prisma.cadCall.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error('[CAD/calls PATCH]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
