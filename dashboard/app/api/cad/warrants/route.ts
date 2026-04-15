// /api/cad/warrants — nakazy aresztowania (DB-backed via CadWarrant model)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET ?name=X — szukaj aktywnych nakazów po nazwie
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name') ?? '';
  try {
    const warrants = await prisma.cadWarrant.findMany({
      where: {
        active: true,
        ...(name.trim()
          ? {
              OR: [
                { targetName: { contains: name, mode: 'insensitive' } },
                { robloxName:  { contains: name, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(warrants);
  } catch (e) {
    console.error('[CAD/warrants GET]', e);
    return NextResponse.json([]);
  }
}

// POST — dodaj nowy nakaz
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.accessLevel < 1) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const { targetDiscordId, targetName, robloxName, reason } = await req.json();
    if (!targetName || !reason) {
      return NextResponse.json({ error: 'Brak targetName/reason' }, { status: 400 });
    }

    const warrant = await prisma.cadWarrant.create({
      data: {
        targetDiscordId,
        targetName,
        robloxName,
        reason,
        issuedBy: session.user.discordId,
        issuedByName: session.user.name ?? session.user.discordId,
      },
    });

    await prisma.botLog.create({
      data: {
        type: 'CAD_WARRANT_ADD',
        userId: session.user.discordId,
        message: `Nakaz na ${targetName}: ${reason}`,
        data: { warrantId: warrant.id },
      },
    }).catch(() => {});

    return NextResponse.json(warrant, { status: 201 });
  } catch (e) {
    console.error('[CAD/warrants POST]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}

// DELETE ?id=X — unieważnij nakaz
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.accessLevel < 1) {
      return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Brak ID' }, { status: 400 });

    await prisma.cadWarrant.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[CAD/warrants DELETE]', e);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
