import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/news — public: returns published news, newest first
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const page  = Math.max(parseInt(searchParams.get('page')  ?? '1'), 1);
  const category = searchParams.get('category') ?? undefined;

  const where = {
    published: true,
    ...(category ? { category } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.news.count({ where }),
    prisma.news.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: { select: { discordUsername: true } },
      },
    }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

// POST /api/news — MOD+: create news entry
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.MOD) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, content, category, imageUrl, pinned } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'title i content są wymagane' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const news = await prisma.news.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      category: category?.trim() || 'Ogłoszenie',
      imageUrl: imageUrl?.trim() || null,
      pinned: pinned === true,
      authorId: user.id,
    },
    include: { author: { select: { discordUsername: true } } },
  });

  return NextResponse.json(news, { status: 201 });
}
