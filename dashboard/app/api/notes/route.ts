// API /api/notes — GET: lista notatek | POST: dodaj notatkę
// Wymagane: Moderator+

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('targetId') ?? '';
  const q        = searchParams.get('q') ?? '';
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const PER_PAGE = 30;

  const where: Record<string, unknown> = {};
  if (targetId) where.targetId = targetId;
  if (q) {
    where.content = { contains: q, mode: 'insensitive' };
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        target: { select: { discordId: true, discordUsername: true } },
        author: { select: { discordId: true, discordUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.note.count({ where }),
  ]);

  return NextResponse.json({ notes, total, page, pages: Math.ceil(total / PER_PAGE) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { targetDiscordId, content } = body;

  if (!targetDiscordId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  let targetDb = await prisma.user.findUnique({ where: { discordId: targetDiscordId } });
  if (!targetDb) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  let authorDb = await prisma.user.findUnique({ where: { discordId: session.user.discordId } });
  if (!authorDb) {
    authorDb = await prisma.user.create({
      data: { discordId: session.user.discordId!, discordUsername: session.user.name ?? 'Unknown' },
    });
  }

  const note = await prisma.note.create({
    data: { targetId: targetDb.id, authorId: authorDb.id, content: content.trim() },
    include: {
      target: { select: { discordId: true, discordUsername: true } },
      author: { select: { discordId: true, discordUsername: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
