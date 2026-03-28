// API endpoint — pobieranie informacji o tokenie podania

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Brak tokenu' }, { status: 400 });
  }

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

  return NextResponse.json({
    type: appToken.type,
    position: appToken.position,
    expiresAt: appToken.expiresAt,
  });
}
