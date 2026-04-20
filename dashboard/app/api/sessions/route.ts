// GET /api/sessions — lista sesji RP
// Dostęp: HELPER+

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    orderBy: { date: 'desc' },
    take: 30,
    include: { _count: { select: { signups: true } } },
  });

  return NextResponse.json(sessions);
}
