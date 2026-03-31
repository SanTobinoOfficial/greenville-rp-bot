// Dashboard — Zatrzymani (System Aresztu Policyjnego)
// Widoczna dla: Helper+

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ArrestsTable from '@/components/dashboard/ArrestsTable';

const PER_PAGE = 50;

export default async function ZatrzymaniPage({
  searchParams,
}: {
  searchParams: { q?: string; active?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const q       = (searchParams.q ?? '').trim();
  const active  = searchParams.active ?? '';
  const page    = Math.max(1, parseInt(searchParams.page ?? '1'));

  const where: Record<string, unknown> = {};
  if (active === 'true')  where.active = true;
  if (active === 'false') where.active = false;
  if (q) {
    where.OR = [
      { reason:  { contains: q, mode: 'insensitive' as const } },
      { target:  { discordUsername: { contains: q, mode: 'insensitive' as const } } },
      { officer: { discordUsername: { contains: q, mode: 'insensitive' as const } } },
    ];
  }

  const [arrests, total, activeCount] = await Promise.all([
    prisma.arrest.findMany({
      where,
      include: {
        target:  { select: { discordId: true, discordUsername: true, robloxUsername: true } },
        officer: { select: { discordId: true, discordUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * PER_PAGE,
      take:  PER_PAGE,
    }),
    prisma.arrest.count({ where }),
    prisma.arrest.count({ where: { active: true } }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const canRelease = session.user.accessLevel >= ACCESS_LEVELS.MOD;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🚔 Zatrzymani</h1>
          <p className="text-muted-foreground text-sm mt-1">System zarządzania zatrzymaniami policyjnymi</p>
        </div>
        <div className={`text-sm font-semibold px-4 py-2 rounded-lg border ${
          activeCount > 0
            ? 'bg-red-500/20 text-red-300 border-red-500/30'
            : 'bg-green-500/20 text-green-300 border-green-500/30'
        }`}>
          {activeCount > 0 ? `🔴 ${activeCount} aktywnych zatrzymań` : '✅ Brak zatrzymanych'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-400">{activeCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Aktywne zatrzymania</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold">{total}</div>
          <div className="text-sm text-muted-foreground mt-1">Łącznie (wszystkie)</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{total - activeCount}</div>
          <div className="text-sm text-muted-foreground mt-1">Zakończone</div>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj (gracz, funkcjonariusz, powód)"
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-72 focus:outline-none"
        />
        <select name="active" defaultValue={active}
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none">
          <option value="">Wszystkie</option>
          <option value="true">🔴 Aktywne</option>
          <option value="false">✅ Zakończone</option>
        </select>
        <button type="submit"
          className="bg-secondary hover:bg-secondary/70 border border-border px-4 py-2 rounded-md text-sm">
          Filtruj
        </button>
        {(q || active) && (
          <a href="/dashboard/zatrzymani"
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground border border-border">
            Wyczyść
          </a>
        )}
      </form>

      {/* Table (client component for release button) */}
      <ArrestsTable
        arrests={arrests as Parameters<typeof ArrestsTable>[0]['arrests']}
        canRelease={canRelease}
        page={page}
        totalPages={totalPages}
        q={q}
        active={active}
      />
    </div>
  );
}
