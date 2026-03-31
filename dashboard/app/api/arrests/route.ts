// API /api/arrests — GET: lista zatrzymań
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
  const q      = searchParams.get('q') ?? '';
  const active = searchParams.get('active');
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const PER_PAGE = 50;

  const where: Record<string, unknown> = {};
  if (active === 'true')  where.active = true;
  if (active === 'false') where.active = false;
  if (q) {
    where.OR = [
      { reason:  { contains: q, mode: 'insensitive' } },
      { target:  { discordUsername: { contains: q, mode: 'insensitive' } } },
      { officer: { discordUsername: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [arrests, total] = await Promise.all([
    prisma.arrest.findMany({
      where,
      include: {
        target:  { select: { discordId: true, discordUsername: true, robloxUsername: true } },
        officer: { select: { discordId: true, discordUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.arrest.count({ where }),
  ]);

  const activeCount = await prisma.arrest.count({ where: { active: true } });

  return NextResponse.json({ arrests, total, page, pages: Math.ceil(total / PER_PAGE), activeCount });
}
