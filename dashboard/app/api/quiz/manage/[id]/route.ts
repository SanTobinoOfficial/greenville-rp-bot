import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const body = await req.json();
  const { question, answers, correct, active, order } = body;

  const updated = await prisma.quizQuestion.update({
    where: { id: params.id },
    data: {
      ...(question !== undefined && { question }),
      ...(answers !== undefined && { answers }),
      ...(correct !== undefined && { correct: Number(correct) }),
      ...(active !== undefined && { active: Boolean(active) }),
      ...(order !== undefined && { order: Number(order) }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  await prisma.quizQuestion.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
