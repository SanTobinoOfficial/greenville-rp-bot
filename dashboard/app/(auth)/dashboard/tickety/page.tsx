// Dashboard — Archiwum ticketów (z filtrowaniem i paginacją)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const STATUS_BADGE: Record<string, string> = {
  OPEN:    'bg-green-500/20 text-green-300 border-green-500/30',
  CLAIMED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  CLOSED:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Otwarty', CLAIMED: 'Przypisany', CLOSED: 'Zamknięty',
};

const PER_PAGE = 50;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; category?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const q        = (searchParams.q ?? '').trim();
  const status   = searchParams.status ?? '';
  const category = searchParams.category ?? '';
  const page     = Math.max(1, Number(searchParams.page ?? '1'));

  const where = {
    AND: [
      q ? {
        OR: [
          { user: { discordUsername: { contains: q, mode: 'insensitive' as const } } },
          { category: { contains: q, mode: 'insensitive' as const } },
        ],
      } : {},
      status   ? { status }   : {},
      category ? { category } : {},
    ],
  };

  const include = { user: { select: { discordUsername: true, discordId: true } } };

  const [tickets, total, openCount, claimedCount, categories] = await Promise.all([
    prisma.ticket.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.ticket.count({ where }),
    prisma.ticket.count({ where: { status: 'OPEN'    } }),
    prisma.ticket.count({ where: { status: 'CLAIMED' } }),
    prisma.ticket.findMany({ select: { category: true }, distinct: ['category'], orderBy: { category: 'asc' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q)        params.set('q', q);
    if (status)   params.set('status', status);
    if (category) params.set('category', category);
    params.set('page', String(p));
    return `/dashboard/tickety?${params}`;
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">🎫 Tickety</h1>
        <p className="text-gray-400 text-sm mt-0.5">Archiwum i aktywne zgłoszenia graczy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-400">{openCount}</div>
          <div className="text-gray-400 text-sm mt-1">Otwarte</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="text-3xl font-bold text-blue-400">{claimedCount}</div>
          <div className="text-gray-400 text-sm mt-1">Przypisane</div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po graczu lub kategorii..."
          className="flex-1 min-w-48 bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
        />
        <select name="status" defaultValue={status} className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]">
          <option value="">Wszystkie statusy</option>
          <option value="OPEN">Otwarty</option>
          <option value="CLAIMED">Przypisany</option>
          <option value="CLOSED">Zamknięty</option>
        </select>
        <select name="category" defaultValue={category} className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]">
          <option value="">Wszystkie kategorie</option>
          {categories.map(c => (
            <option key={c.category} value={c.category}>{c.category}</option>
          ))}
        </select>
        <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Filtruj
        </button>
        {(q || status || category) && (
          <a href="/dashboard/tickety" className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
            Wyczyść
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-gray-400 text-sm">
          {total === 0 ? 'Brak wyników' : `${((page - 1) * PER_PAGE) + 1}–${Math.min(page * PER_PAGE, total)} z ${total.toLocaleString()} ticketów`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">Gracz</th>
                <th className="p-4 text-left">Kategoria</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Otwarto</th>
                <th className="p-4 text-left">Zamknięto</th>
                <th className="p-4 text-left">Transkrypt</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">Brak ticketów dla podanych filtrów.</td>
                </tr>
              ) : tickets.map(t => (
                <tr key={t.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-500 font-mono text-xs">#{t.ticketNumber}</td>
                  <td className="p-4 text-white font-medium">{t.user.discordUsername}</td>
                  <td className="p-4">
                    <span className="bg-[#5865F2]/10 text-[#7289DA] border border-[#5865F2]/20 px-2 py-0.5 rounded text-xs">
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${STATUS_BADGE[t.status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                    {t.createdAt.toLocaleDateString('pl-PL')}
                  </td>
                  <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                    {t.closedAt ? t.closedAt.toLocaleDateString('pl-PL') : '—'}
                  </td>
                  <td className="p-4">
                    {t.transcript ? (
                      <a
                        href={`/api/tickets/${t.id}/transcript`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-xs bg-[#5865F2] hover:bg-[#4752C4] text-white px-3 py-1 rounded transition-colors"
                      >
                        📄 Pobierz
                      </a>
                    ) : (
                      <span className="text-gray-600 text-xs">Brak</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Strona {page} z {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={pageUrl(page - 1)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">← Poprzednia</a>
            )}
            {page < totalPages && (
              <a href={pageUrl(page + 1)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">Następna →</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
