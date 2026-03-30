// Dashboard — Logi bota (z wyszukiwaniem, filtrowaniem, paginacją)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const TYPE_BADGE: Record<string, string> = {
  INFO:        'bg-blue-500/20 text-blue-300 border-blue-500/30',
  WARN:        'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  ERROR:       'bg-red-500/20 text-red-300 border-red-500/30',
  SUCCESS:     'bg-green-500/20 text-green-300 border-green-500/30',
  MOD:         'bg-purple-500/20 text-purple-300 border-purple-500/30',
  QUIZ_RESULT: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  BOT:         'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const PER_PAGE = 60;

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.ADMIN) redirect('/dashboard');

  const q    = (searchParams.q ?? '').trim();
  const type = searchParams.type ?? '';
  const page = Math.max(1, Number(searchParams.page ?? '1'));

  const where = {
    AND: [
      q ? {
        OR: [
          { message: { contains: q, mode: 'insensitive' as const } },
          { userId:  { contains: q, mode: 'insensitive' as const } },
        ],
      } : {},
      type ? { type: { equals: type, mode: 'insensitive' as const } } : {},
    ],
  };

  const [logs, total, typeList, errorCount, warnCount] = await Promise.all([
    prisma.botLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.botLog.count({ where }),
    prisma.botLog.findMany({ select: { type: true }, distinct: ['type'], orderBy: { type: 'asc' } }),
    prisma.botLog.count({ where: { type: 'ERROR' } }),
    prisma.botLog.count({ where: { type: 'WARN'  } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q)    params.set('q', q);
    if (type) params.set('type', type);
    params.set('page', String(p));
    return `/dashboard/logi?${params}`;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📁 Logi Bota</h1>
          <p className="text-gray-400 text-sm mt-0.5">Pełna historia zdarzeń systemu</p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
            <div className="text-red-400 font-bold text-lg">{errorCount}</div>
            <div className="text-gray-400 text-xs">Błędy</div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 text-center">
            <div className="text-yellow-400 font-bold text-lg">{warnCount}</div>
            <div className="text-gray-400 text-xs">Ostrzeżenia</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj w wiadomości lub ID użytkownika..."
          className="flex-1 min-w-56 bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
        />
        <select
          name="type"
          defaultValue={type}
          className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
        >
          <option value="">Wszystkie typy</option>
          {typeList.map(t => (
            <option key={t.type} value={t.type}>{t.type}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Filtruj
        </button>
        {(q || type) && (
          <a
            href="/dashboard/logi"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Wyczyść
          </a>
        )}
      </form>

      {/* Logi */}
      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
          <span className="text-gray-400 text-sm">
            {total === 0 ? 'Brak wyników' : `${((page - 1) * PER_PAGE) + 1}–${Math.min(page * PER_PAGE, total)} z ${total.toLocaleString()} wpisów`}
          </span>
        </div>

        <div className="divide-y divide-white/5 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">Brak logów dla podanych filtrów.</div>
          ) : logs.map(log => (
            <div key={log.id} className="flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <span className="text-gray-600 whitespace-nowrap pt-0.5 w-32 shrink-0">
                {log.createdAt.toLocaleString('pl-PL', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </span>
              <span className={`px-2 py-0.5 rounded border text-xs font-semibold h-fit shrink-0 ${TYPE_BADGE[log.type] ?? TYPE_BADGE.BOT}`}>
                {log.type}
              </span>
              {log.userId && (
                <span className="text-gray-500 whitespace-nowrap shrink-0 pt-0.5">{log.userId}</span>
              )}
              <div className="text-gray-200 break-all">
                {log.message}
                {log.data && (
                  <details className="mt-1">
                    <summary className="text-indigo-400 cursor-pointer select-none hover:text-indigo-300 text-xs">
                      ▶ dane JSON
                    </summary>
                    <pre className="mt-1 bg-black/30 rounded p-2 text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Strona {page} z {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <a href={pageUrl(page - 1)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                ← Poprzednia
              </a>
            )}
            {page < totalPages && (
              <a href={pageUrl(page + 1)} className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                Następna →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
