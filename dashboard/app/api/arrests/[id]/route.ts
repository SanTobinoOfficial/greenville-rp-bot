// API /api/arrests/[id] — PUT: zwolnij zatrzymanego (ustaw active=false)
// Wymagane: Moderator+

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const arrest = await prisma.arrest.findUnique({ where: { id: params.id } });
  if (!arrest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!arrest.active) return NextResponse.json({ error: 'Already released' }, { status: 400 });

  const updated = await prisma.arrest.update({
    where: { id: params.id },
    data: {
      active:    false,
      releasedAt: new Date(),
      releasedBy: session.user.name ?? 'Dashboard',
    },
  });

  return NextResponse.json(updated);
}
