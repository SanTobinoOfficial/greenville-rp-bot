import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    return NextResponse.json({ error: 'Brak dostępu' }, { status: 403 });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { user: { select: { discordUsername: true } } },
  });

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket nie istnieje' }, { status: 404 });
  }
  if (!ticket.transcript) {
    return NextResponse.json({ error: 'Brak transkryptu' }, { status: 404 });
  }

  const filename = `ticket-${ticket.ticketNumber}-${ticket.user.discordUsername}.txt`
    .replace(/[^a-zA-Z0-9\-_.]/g, '_');

  return new NextResponse(ticket.transcript, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
