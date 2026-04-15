// API — lista podań (GET)
// Zwraca podania z opcjonalnym filtrem statusu: ?status=PENDING|ACCEPTED|REJECTED|INCOMPLETE

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status  = searchParams.get('status');
  const type    = searchParams.get('type');

  const VALID_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'INCOMPLETE'];
  const VALID_TYPES    = ['SERVICE', 'JOB_PUBLIC', 'JOB_PRIVATE'];

  const where: Record<string, unknown> = {};
  if (status && VALID_STATUSES.includes(status)) {
    where.status = status;
  }
  if (type && VALID_TYPES.includes(type)) {
    where.type = type;
  } else if (type === 'JOB') {
    // Skrót: oba typy prac naraz
    where.type = { in: ['JOB_PUBLIC', 'JOB_PRIVATE'] };
  }

  const applications = await prisma.application.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: {
        select: {
          discordUsername: true,
          discordId: true,
          robloxUsername: true,
        },
      },
    },
  });

  const result = applications.map((app) => ({
    id: app.id,
    position: app.position,
    type: app.type,
    status: app.status,
    answers: app.answers,
    reviewNote: app.reviewNote,
    reviewedBy: app.reviewedBy,
    reviewedAt: app.reviewedAt,
    createdAt: app.createdAt,
    user: {
      discordUsername: app.user.discordUsername,
      robloxUsername: app.user.robloxUsername,
      image: null as null,
    },
  }));

  return NextResponse.json(result);
}
