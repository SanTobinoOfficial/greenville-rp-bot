import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const questions = await prisma.quizQuestion.findMany({
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(questions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const body = await req.json();
  const { question, answers, correct, active, order } = body;

  if (!question || !answers || !Array.isArray(answers) || answers.length < 2) {
    return NextResponse.json({ error: 'Nieprawidłowe dane pytania' }, { status: 400 });
  }
  if (correct === undefined || correct < 0 || correct >= answers.length) {
    return NextResponse.json({ error: 'Nieprawidłowy indeks poprawnej odpowiedzi' }, { status: 400 });
  }

  const newQuestion = await prisma.quizQuestion.create({
    data: {
      question,
      answers,
      correct: Number(correct),
      active: active !== false,
      order: order !== undefined ? Number(order) : 0,
    },
  });

  return NextResponse.json(newQuestion, { status: 201 });
}
