// API endpoint — przetwarzanie wyników quizu weryfikacyjnego
// Wywoływany przez stronę /quiz/{token} po ukończeniu quizu

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, answers, timeSpent } = body as {
      token: string;
      answers: number[];
      timeSpent: number;
    };

    if (!token || !answers) {
      return NextResponse.json({ error: 'Brakujące dane' }, { status: 400 });
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

    // Pobierz pytania
    const questions = await prisma.quizQuestion.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const passScore = settings?.quizPassScore || 8;

    // Oblicz wynik
    let score = 0;
    const results: { correct: boolean; correctAnswer: number; userAnswer: number }[] = [];

    for (let i = 0; i < Math.min(answers.length, questions.length); i++) {
      const isCorrect = answers[i] === questions[i].correct;
      if (isCorrect) score++;
      results.push({
        correct: isCorrect,
        correctAnswer: questions[i].correct,
        userAnswer: answers[i],
      });
    }

    const passed = score >= passScore;
    const partialPass = score >= 6 && score < passScore;

    // Oznacz token jako użyty
    await prisma.quizToken.update({
      where: { token },
      data: { used: true },
    });

    // Zaktualizuj dane użytkownika
    await prisma.user.update({
      where: { id: quizToken.userId },
      data: {
        quizScore: score,
        quizAttempts: { increment: 1 },
        quizLastAttempt: new Date(),
        verifiedAt: passed || partialPass ? new Date() : undefined,
      },
    });

    // Powiadom bota przez wewnętrzne API
    const botApiUrl = process.env.BOT_API_URL;
    const botApiKey = process.env.BOT_API_KEY;

    if (botApiUrl && botApiKey) {
      try {
        await fetch(`${botApiUrl}/quiz-result`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': botApiKey,
          },
          body: JSON.stringify({
            userId: quizToken.user.discordId,
            score,
            total: questions.length,
            passed,
            partialPass,
          }),
        });
      } catch {}
    }

    // Zapisz wynik do logów
    await prisma.botLog.create({
      data: {
        type: 'QUIZ_RESULT',
        userId: quizToken.user.discordId,
        message: `Quiz: ${score}/${questions.length} — ${passed ? 'ZALICZONY' : partialPass ? 'CZĘŚCIOWY' : 'NIEZALICZONY'}`,
        data: { score, total: questions.length, timeSpent, passed, partialPass },
      },
    });

    return NextResponse.json({
      score,
      total: questions.length,
      passed,
      partialPass,
      results,
    });

  } catch (error) {
    console.error('Błąd przetwarzania quizu:', error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
