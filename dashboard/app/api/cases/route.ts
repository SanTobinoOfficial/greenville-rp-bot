// POST /api/cases — utwórz case (warn / kick / ban / mute)
// Dostęp: MOD+

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = ['WARN', 'BAN', 'KICK', 'MUTE', 'UNBAN', 'UNMUTE'];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  const body = await request.json();
  const { targetId, type, reason } = body as {
    targetId: string;
    type: string;
    reason: string;
  };

  if (!targetId || !type || !reason?.trim()) {
    return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Nieprawidłowy typ' }, { status: 400 });
  }

  const modUser = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: { id: true },
  });
  if (!modUser) {
    return NextResponse.json({ error: 'Nie znaleziono moderatora w bazie' }, { status: 404 });
  }

  const newCase = await prisma.case.create({
    data: {
      targetId,
      moderatorId: modUser.id,
      type: type as never,
      reason: reason.trim(),
      status: 'ACTIVE',
    },
    include: {
      target: { select: { discordUsername: true, discordId: true } },
    },
  });

  return NextResponse.json(newCase);
}
