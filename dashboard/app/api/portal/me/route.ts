// API /api/portal/me — zwraca dane zalogowanego użytkownika do portalu gracza
// Wymaga zalogowania

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    include: {
      character: true,
      vehicles: { orderBy: { createdAt: 'desc' } },
      licenses: { where: { status: 'ACTIVE' } },
      finesReceived: { where: { active: true }, orderBy: { createdAt: 'desc' }, take: 5 },
      casesAsTarget: { where: { status: 'ACTIVE' }, select: { type: true, reason: true, createdAt: true } },
      arrests: { where: { active: true } },
      dutyLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  // Nadchodząca sesja
  const upcomingSession = await prisma.session.findFirst({
    where: { status: 'UPCOMING', date: { gte: new Date() } },
    orderBy: { date: 'asc' },
    include: { signups: { select: { userId: true } } },
  });

  const ongoingSession = await prisma.session.findFirst({
    where: { status: 'ONGOING' },
    include: { signups: { select: { userId: true } } },
  });

  return NextResponse.json({
    user,
    accessLevel: session.user.accessLevel,
    upcomingSession,
    ongoingSession,
  });
}
