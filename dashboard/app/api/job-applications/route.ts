// /api/job-applications — CRUD dla modelu JobApplication
// GET  ?status=PENDING&kategoria=Policja&page=1  — lista podań
// POST { applicationId, action, note }           — rozpatrz podanie (Staff+)
// DELETE { applicationId }                       — usuń podanie (Admin+)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? '';
  const kategoria = searchParams.get('kategoria') ?? '';
  const jobType = searchParams.get('jobType') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const search = searchParams.get('search') ?? '';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status && status !== 'ALL') where.status = status;
  if (kategoria) where.jobCategory = kategoria;
  if (jobType) where.jobType = jobType;
  if (search) {
    where.OR = [
      { jobName: { contains: search, mode: 'insensitive' } },
      { user: { discordUsername: { contains: search, mode: 'insensitive' } } },
      { user: { robloxUsername: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            discordId: true,
            discordUsername: true,
            robloxUsername: true,
            currentJob: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json({
    applications,
    total,
    page,
    pages: Math.ceil(total / PAGE_SIZE),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { applicationId, action, note } = body as {
    applicationId: string;
    action: 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';
    note?: string;
  };

  if (!applicationId || !action) {
    return NextResponse.json({ error: 'Brak wymaganych pól' }, { status: 400 });
  }

  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });

  if (!app) {
    return NextResponse.json({ error: 'Nie znaleziono podania' }, { status: 404 });
  }

  if (app.status !== 'PENDING') {
    return NextResponse.json({ error: 'Podanie zostało już rozpatrzone' }, { status: 409 });
  }

  // Zaktualizuj podanie
  const updated = await prisma.jobApplication.update({
    where: { id: applicationId },
    data: {
      status: action,
      reviewedAt: new Date(),
      reviewedBy: session.user.name ?? session.user.discordId ?? 'Dashboard',
      reviewNote: note ?? null,
    },
    include: { user: true },
  });

  // Jeśli zaakceptowane — ustaw pracę na graczu
  if (action === 'ACCEPTED') {
    await prisma.user.update({
      where: { id: app.userId },
      data: {
        currentJob: app.jobName,
        jobCategory: app.jobCategory,
        jobAssignedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ success: true, application: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.accessLevel ?? 0) < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { applicationId } = body as { applicationId: string };

  if (!applicationId) {
    return NextResponse.json({ error: 'Brak applicationId' }, { status: 400 });
  }

  await prisma.jobApplication.delete({ where: { id: applicationId } });
  return NextResponse.json({ success: true });
}
