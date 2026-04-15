// /api/jobs/list — GET: lista prac z server-config.json
// Dostępne dla wszystkich (zweryfikowanych użytkowników)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const kategoria = searchParams.get('kategoria') ?? '';
  const typ = searchParams.get('typ') ?? '';

  const configPath = path.resolve(process.cwd(), '..', 'server-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jobs: any[] = config.jobs ?? [];

  if (kategoria) {
    jobs = jobs.filter((j) => j.kategoria === kategoria);
  }
  if (typ) {
    jobs = jobs.filter((j) => j.typ === typ);
  }

  // Ukryj formularz dla niezalogowanych / publicznych zapytań (tu wszyscy są zalogowani)
  const result = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    emoji: j.emoji,
    kategoria: j.kategoria,
    opis: j.opis,
    wymagania: j.wymagania,
    wynagrodzenie_min: j.wynagrodzenie_min,
    wynagrodzenie_max: j.wynagrodzenie_max,
    rola_discord: j.rola_discord,
    typ: j.typ,
    formularz: j.formularz,
    mini_regulamin: j.mini_regulamin,
  }));

  return NextResponse.json(result);
}
