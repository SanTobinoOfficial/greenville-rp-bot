// API — pełny profil gracza (GET /api/players/[id])
// Dostęp: MOD+

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  const { id } = params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      discordId: true,
      discordUsername: true,
      robloxUsername: true,
      robloxId: true,
      verifiedAt: true,
      createdAt: true,
      character: {
        select: {
          firstName: true,
          lastName: true,
          peselRp: true,
          documentId: true,
          birthDate: true,
          gender: true,
        },
      },
      vehicles: {
        select: {
          id: true,
          marka: true,
          model: true,
          tablica: true,
          rok: true,
          kolor: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      licenses: {
        select: {
          id: true,
          kategoria: true,
          status: true,
          issuedAt: true,
          suspendedAt: true,
          suspendedReason: true,
        },
        orderBy: { issuedAt: 'desc' },
      },
      casesAsTarget: {
        select: {
          id: true,
          type: true,
          status: true,
          reason: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      finesReceived: {
        select: {
          id: true,
          type: true,
          reason: true,
          amount: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Nie znaleziono gracza' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      ...user,
      image: null as null, // brak awatara w DB; strona wyświetla inicjały
    },
  });
}
