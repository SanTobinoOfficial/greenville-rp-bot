// Dashboard — Notatki moderacyjne
// Widoczna dla: Moderator+

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import NotesManager from '@/components/dashboard/NotesManager';

const PER_PAGE = 30;

export default async function NotatkiPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) redirect('/dashboard');

  const q    = (searchParams.q ?? '').trim();
  const page = Math.max(1, parseInt(searchParams.page ?? '1'));

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { content: { contains: q, mode: 'insensitive' as const } },
      { target:  { discordUsername: { contains: q, mode: 'insensitive' as const } } },
      { author:  { discordUsername: { contains: q, mode: 'insensitive' as const } } },
    ];
  }

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      include: {
        target: { select: { discordId: true, discordUsername: true } },
        author: { select: { discordId: true, discordUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * PER_PAGE,
      take:  PER_PAGE,
    }),
    prisma.note.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📝 Notatki Moderacyjne</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Wewnętrzne notatki staffu o graczach
          </p>
        </div>
        <div className="text-sm text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
          Łącznie: <span className="font-semibold text-foreground">{total}</span>
        </div>
      </div>

      {/* NotesManager — client component z formularzem dodawania + usuwania */}
      <NotesManager
        initialNotes={notes as Parameters<typeof NotesManager>[0]['initialNotes']}
        total={total}
        page={page}
        totalPages={totalPages}
        q={q}
      />
    </div>
  );
}
