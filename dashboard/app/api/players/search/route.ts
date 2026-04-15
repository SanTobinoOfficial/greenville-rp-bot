// API — wyszukiwanie graczy (GET ?q=)
// Dostęp: MOD+

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { discordUsername: { contains: q, mode: 'insensitive' } },
        { robloxUsername:  { contains: q, mode: 'insensitive' } },
        { discordId:       { contains: q } },
      ],
    },
    take: 30,
    orderBy: { createdAt: 'desc' },
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
        },
      },
    },
  });

  const result = users.map((u) => ({
    ...u,
    image: null as null, // brak awatara w DB; strona wyświetla inicjały
  }));

  return NextResponse.json(result);
}
