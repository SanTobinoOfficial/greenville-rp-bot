import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/news/[id] — MOD+: toggle publish / update
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.news.update({
    where: { id: params.id },
    data: {
      ...(body.title    !== undefined && { title:    body.title }),
      ...(body.content  !== undefined && { content:  body.content }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.pinned   !== undefined && { pinned:   body.pinned }),
      ...(body.published !== undefined && { published: body.published }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/news/[id] — ADMIN+
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.news.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
