// API endpoint — przetwarzanie wyników quizu weryfikacyjnego
// Wywoływany przez stronę /quiz/{token} po ukończeniu quizu
// Obsługuje pytania CLOSED (wybór opcji) i OPEN (odpowiedź tekstowa)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Ocena odpowiedzi otwartej: sprawdza czy tekst zawiera wystarczającą liczbę słów kluczowych
function scoreOpenAnswer(text: string, keywords: string[]): { correct: boolean; matched: string[] } {
  if (!text || keywords.length === 0) return { correct: false, matched: [] };

  const normalized = text.toLowerCase().replace(/[.,!?;:]/g, ' ');
  const matched = keywords.filter(kw => normalized.includes(kw.toLowerCase()));

  // Odpowiedź zaliczona jeśli trafiono ≥ 40% słów kluczowych (min 1)
  const threshold = Math.max(1, Math.ceil(keywords.length * 0.4));
  return { correct: matched.length >= threshold, matched };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, answers, openAnswers, timeSpent } = body as {
      token: string;
      answers: number[];          // indeksy dla pytań CLOSED (-1 = pominięte)
      openAnswers: string[];      // teksty dla pytań OPEN ('' = pominięte), indeksowane jak questions
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

    // Pobierz pytania z pełnymi danymi (w tym correct i keywords)
    const questions = await prisma.quizQuestion.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });

    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const passScore = settings?.quizPassScore || 14;

    // Oblicz wynik
    let score = 0;
    const results: {
      correct: boolean;
      type: string;
      correctAnswer?: number;
      userAnswer?: number;
      userText?: string;
      matchedKeywords?: string[];
    }[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (q.type === 'OPEN') {
        const text = (openAnswers ?? [])[i] ?? '';
        const { correct, matched } = scoreOpenAnswer(text, q.keywords);
        if (correct) score++;
        results.push({ correct, type: 'OPEN', userText: text, matchedKeywords: matched });
      } else {
        const userAnswer = answers[i] ?? -1;
        const isCorrect = userAnswer === q.correct;
        if (isCorrect) score++;
        results.push({ correct: isCorrect, type: 'CLOSED', correctAnswer: q.correct, userAnswer });
      }
    }

    const passed = score >= passScore;
    const partialPass = score >= Math.floor(passScore * 0.75) && score < passScore;

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
      passScore,
      results,
    });

  } catch (error) {
    console.error('Błąd przetwarzania quizu:', error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
