// API endpoint — recenzja podania przez staff

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
  }

  const body = await request.json();
  const { applicationId, action, note } = body as {
    applicationId: string;
    action: 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';
    note?: string;
  };

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: action,
      reviewedBy: session.user.discordId,
      reviewNote: note,
      reviewedAt: new Date(),
    },
    include: { user: true },
  });

  // Powiadom bota
  const botApiUrl = process.env.BOT_API_URL;
  const botApiKey = process.env.BOT_API_KEY;

  if (botApiUrl && botApiKey) {
    try {
      await fetch(`${botApiUrl}/application-reviewed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': botApiKey,
        },
        body: JSON.stringify({
          userId: application.user.discordId,
          position: application.position,
          action,
          note,
        }),
      });
    } catch {}
  }

  return NextResponse.json({ success: true });
}
