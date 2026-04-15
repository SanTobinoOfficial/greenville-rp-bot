// /api/jobs/select — POST: wybór pracy przez gracza
// Wymaga: zalogowanego użytkownika (verified)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs';

const COOLDOWN_HOURS = 2;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { jobId, answers } = body as { jobId: string; answers: Record<string, string> };

  if (!jobId) {
    return NextResponse.json({ error: 'Brak jobId' }, { status: 400 });
  }

  // Wczytaj konfigurację prac
  const configPath = path.resolve(process.cwd(), '..', 'server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = (config.jobs as any[]).find((j) => j.id === jobId);

  if (!job) {
    return NextResponse.json({ error: 'Nie znaleziono pracy' }, { status: 404 });
  }

  // Pobierz użytkownika z bazy
  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
  });

  if (!user) {
    return NextResponse.json({ error: 'Użytkownik nie znaleziony' }, { status: 404 });
  }

  // Sprawdź cooldown
  if (user.jobCooldownEnd && new Date() < user.jobCooldownEnd) {
    const remaining = Math.ceil(
      (user.jobCooldownEnd.getTime() - Date.now()) / 1000 / 60
    );
    return NextResponse.json(
      { error: `Musisz poczekać jeszcze ${remaining} minut przed zmianą pracy.` },
      { status: 429 }
    );
  }

  // Walidacja odpowiedzi formularza
  if (job.formularz && job.formularz.length > 0) {
    for (const field of job.formularz) {
      const ans = answers?.[field.id] ?? '';
      if (ans.length < field.min) {
        return NextResponse.json(
          { error: `Odpowiedź na "${field.pytanie}" jest za krótka (min. ${field.min} znaków).` },
          { status: 400 }
        );
      }
    }
  }

  const now = new Date();
  const cooldownEnd = new Date(now.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);

  // Dla prac cywilnych (PUBLIC/CRIMINAL) — natychmiastowy zapis
  if (job.typ === 'PUBLIC' || job.typ === 'CRIMINAL') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentJob: job.name,
        jobCategory: job.kategoria,
        jobAssignedAt: now,
        jobCooldownEnd: cooldownEnd,
      },
    });

    // Utwórz rekord aplikacji jako ACCEPTED
    await prisma.jobApplication.create({
      data: {
        userId: user.id,
        jobName: job.name,
        jobCategory: job.kategoria,
        jobType: job.typ,
        answers: answers ?? {},
        status: 'ACCEPTED',
        appliedAt: now,
        cooldownEnd,
        reviewedAt: now,
        reviewedBy: 'AUTO',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pomyślnie podjąłeś pracę: ${job.name}`,
      job: { name: job.name, kategoria: job.kategoria, emoji: job.emoji },
    });
  }

  // Dla prac służbowych (SERVICE) — tworzenie podania PENDING
  const application = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      jobName: job.name,
      jobCategory: job.kategoria,
      jobType: 'SERVICE',
      answers: answers ?? {},
      status: 'PENDING',
      appliedAt: now,
      cooldownEnd,
    },
  });

  // Ustaw cooldown (ale nie zmieniaj jeszcze currentJob)
  await prisma.user.update({
    where: { id: user.id },
    data: { jobCooldownEnd: cooldownEnd },
  });

  return NextResponse.json({
    success: true,
    pending: true,
    message: `Podanie na ${job.name} zostało wysłane do rozpatrzenia przez Staff.`,
    applicationId: application.id,
  });
}

// GET: pobierz aktualną pracę zalogowanego użytkownika
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.user.discordId },
    select: {
      currentJob: true,
      jobCategory: true,
      jobAssignedAt: true,
      jobCooldownEnd: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const cooldownActive = user.jobCooldownEnd ? new Date() < user.jobCooldownEnd : false;
  const cooldownMinutes = cooldownActive
    ? Math.ceil((user.jobCooldownEnd!.getTime() - Date.now()) / 60000)
    : 0;

  return NextResponse.json({
    currentJob: user.currentJob,
    jobCategory: user.jobCategory,
    jobAssignedAt: user.jobAssignedAt,
    cooldownActive,
    cooldownMinutes,
  });
}
