// API /api/duty — GET: logi duty służb (z filtrami)
// Wymagane: Helper+

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const service = searchParams.get('service') ?? '';
  const action  = searchParams.get('action') ?? '';
  const q       = searchParams.get('q') ?? '';
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const PER_PAGE = 50;

  const where: Record<string, unknown> = {};
  if (service) where.service = service;
  if (action)  where.action  = action;
  if (q) {
    where.user = {
      OR: [
        { discordUsername: { contains: q, mode: 'insensitive' } },
        { robloxUsername:  { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  const [logs, total] = await Promise.all([
    prisma.dutyLog.findMany({
      where,
      include: { user: { select: { discordId: true, discordUsername: true, robloxUsername: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.dutyLog.count({ where }),
  ]);

  // Stats per service
  const stats = await prisma.dutyLog.groupBy({
    by: ['service'],
    _count: { _all: true },
  });

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / PER_PAGE), stats });
}
