// API endpoint — przetwarzanie podań na służby/prace
// Wywoływany przez stronę /aplikuj/{type}/{token}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, answers } = body as { token: string; answers: Record<string, string> };

    if (!token || !answers) {
      return NextResponse.json({ error: 'Brakujące dane' }, { status: 400 });
    }

    // Walidacja tokenu
    const appToken = await prisma.applicationToken.findUnique({
      where: { token },
    });

    if (!appToken) {
      return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 404 });
    }

    if (appToken.used) {
      return NextResponse.json({ error: 'Token już użyty' }, { status: 400 });
    }

    if (new Date() > appToken.expiresAt) {
      return NextResponse.json({ error: 'Token wygasł (24h)' }, { status: 400 });
    }

    // Walidacja minimalnej długości odpowiedzi
    const motivationField = answers['motivation'] || answers['motywacja'] || '';
    if (motivationField.length < 150) {
      return NextResponse.json({
        error: 'Motywacja musi zawierać minimum 150 znaków',
      }, { status: 400 });
    }

    // Pobierz użytkownika
    const user = await prisma.user.findUnique({
      where: { id: appToken.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404 });
    }

    // Utwórz podanie
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        type: appToken.type as 'SERVICE' | 'JOB_PUBLIC' | 'JOB_PRIVATE',
        position: appToken.position,
        answers,
        status: 'PENDING',
      },
    });

    // Oznacz token jako użyty
    await prisma.applicationToken.update({
      where: { token },
      data: { used: true },
    });

    // Powiadom bota
    const botApiUrl = process.env.BOT_API_URL;
    const botApiKey = process.env.BOT_API_KEY;

    if (botApiUrl && botApiKey) {
      try {
        await fetch(`${botApiUrl}/application-submitted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': botApiKey,
          },
          body: JSON.stringify({
            applicationId: application.id,
            userId: user.discordId,
            position: appToken.position,
            type: appToken.type,
          }),
        });
      } catch {}
    }

    return NextResponse.json({ success: true, applicationId: application.id });

  } catch (error) {
    console.error('Błąd przetwarzania podania:', error);
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 });
  }
}
