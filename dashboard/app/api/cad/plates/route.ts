// GET /api/cad/plates?q=ABC123 — szukaj tablicy rejestracyjnej

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        tablica: { contains: q.toUpperCase() },
      },
      include: {
        user: {
          select: {
            discordId: true,
            discordUsername: true,
            robloxUsername: true,
            phoneNumber: true,
            casesAsTarget: {
              where: { status: 'ACTIVE' },
              select: { type: true, id: true },
              take: 5,
            },
            arrests: {
              where: { active: true },
              select: { id: true },
            },
          },
        },
      },
      take: 10,
    });

    const results = vehicles.map(v => ({
      id: v.id,
      tablica: v.tablica,
      marka: v.marka,
      model: v.model,
      rok: v.rok,
      kolor: v.kolor,
      owner: {
        discordId: v.user.discordId,
        robloxName: v.user.robloxUsername ?? v.user.discordUsername,
        phone: v.user.phoneNumber,
        activeWarns: v.user.casesAsTarget?.filter((c: { type: string }) => c.type === 'WARN').length ?? 0,
        isArrested: (v.user.arrests?.length ?? 0) > 0,
      },
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[CAD/plates]', err);
    return NextResponse.json({ results: [] });
  }
}
