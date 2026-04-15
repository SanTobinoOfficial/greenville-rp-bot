// GET /api/cad/me — zwraca dane CAD aktualnie zalogowanego użytkownika
// Używane przez stronę /cad do ustalenia cadRole, callsign, statusu jednostki

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // Niezalogowany — zwróć role CYWIL bez danych jednostki
    return NextResponse.json({
      cadRole: 'CYWIL',
      discordId: null,
      name: 'Gość',
      robloxName: null,
      currentJob: null,
      unit: null,
    });
  }

  const { discordId, cadRole, robloxUsername, currentJob, name } = session.user;

  // Pobierz dane aktywnej jednostki (jeśli istnieje)
  let unit = null;
  try {
    unit = await prisma.cadUnit.findUnique({
      where: { discordId },
    });
  } catch {}

  return NextResponse.json({
    cadRole,
    discordId,
    name: name ?? discordId,
    robloxName: robloxUsername ?? null,
    currentJob: currentJob ?? null,
    unit: unit
      ? {
          callsign: unit.callsign,
          status: unit.status,
          service: unit.service,
          onDutySince: unit.onDutySince,
        }
      : null,
  });
}
