// API endpoint — pobieranie pytań quizu dla danego tokenu

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Brak tokenu' }, { status: 400 });
  }

  // Walidacja tokenu
  const quizToken = await prisma.quizToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!quizToken) {
    return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 404 });
  }

  if (quizToken.used) {
    return NextResponse.json({ error: 'Token już użyty' }, { status: 400 });
  }

  if (new Date() > quizToken.expiresAt) {
    return NextResponse.json({ error: 'Token wygasł' }, { status: 400 });
  }

  // Pobierz aktywne pytania
  const questions = await prisma.quizQuestion.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      question: true,
      type: true,
      answers: true,
      order: true,
      // NIE wysyłamy 'correct' ani 'keywords' — sprawdzane server-side
    },
  });

  const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

  return NextResponse.json({
    questions,
    total: questions.length,
    expiresAt: quizToken.expiresAt,
    timeLimit: 20 * 60, // 20 minut w sekundach
    passScore: settings?.quizPassScore || 14,
    userInfo: {
      robloxUsername: quizToken.user.robloxUsername,
    },
  });
}
