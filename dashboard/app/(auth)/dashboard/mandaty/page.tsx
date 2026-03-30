// Dashboard — Historia mandatów RP (z wyszukiwaniem, filtrami, statystykami)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const TYPE_INFO: Record<string, { emoji: string; badge: string; label: string }> = {
  MANDAT:  { emoji: '📜', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', label: 'Mandat' },
  GRZYWNA: { emoji: '💸', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', label: 'Grzywna' },
  ARESZT:  { emoji: '🚔', badge: 'bg-red-500/20 text-red-300 border-red-500/30',          label: 'Areszt'  },
};

const PER_PAGE = 50;

export default async function MandatyPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const q    = (searchParams.q ?? '').trim();
  const type = searchParams.type ?? '';
  const page = Math.max(1, Number(searchParams.page ?? '1'));

  const where = {
    AND: [
      q ? {
        OR: [
          { target: { discordUsername: { contains: q, mode: 'insensitive' as const } } },
          { reason:  { contains: q, mode: 'insensitive' as const } },
          { target: { character: { firstName: { contains: q, mode: 'insensitive' as const } } } },
          { target: { character: { lastName:  { contains: q, mode: 'insensitive' as const } } } },
        ],
      } : {},
      type ? { type: { equals: type } } : {},
    ],
  };

  const include = {
    target: { select: { discordUsername: true, character: true } },
    issuer: { select: { discordUsername: true } },
  };

  const [fines, total, totalMandaty, totalGrzywna, totalAreszt] = await Promise.all([
    prisma.fine.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.fine.count({ where }),
    prisma.fine.count({ where: { type: 'MANDAT'  } }),
    prisma.fine.count({ where: { type: 'GRZYWNA' } }),
    prisma.fine.count({ where: { type: 'ARESZT'  } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q)    params.set('q', q);
    if (type) params.set('type', type);
    params.set('page', String(p));
    return `/dashboard/mandaty?${params}`;
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header + stats */}
      <div>
        <h1 className="text-2xl font-bold text-white">📜 Mandaty RP</h1>
        <p className="text-gray-400 text-sm mt-0.5">Historia kar wystawionych graczom</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'MANDAT',  label: 'Mandaty',  count: totalMandaty,  color: 'yellow' },
          { key: 'GRZYWNA', label: 'Grzywny',  count: totalGrzywna,  color: 'orange' },
          { key: 'ARESZT',  label: 'Areszty',  count: totalAreszt,   color: 'red'    },
        ].map(stat => (
          <div key={stat.key} className={`bg-${stat.color}-500/10 border border-${stat.color}-500/20 rounded-xl p-4`}>
            <div className={`text-3xl font-bold text-${stat.color}-400`}>{stat.count}</div>
            <div className="text-gray-400 text-sm mt-1">{stat.label} łącznie</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po graczu, postaci lub powodzie..."
          className="flex-1 min-w-56 bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
        />
        <select
          name="type"
          defaultValue={type}
          className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]"
        >
          <option value="">Wszystkie typy</option>
          <option value="MANDAT">Mandat</option>
          <option value="GRZYWNA">Grzywna</option>
          <option value="ARESZT">Areszt</option>
        </select>
        <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Filtruj
        </button>
        {(q || type) && (
          <a href="/dashboard/mandaty" className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
            Wyczyść
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-gray-400 text-sm">
          {total === 0 ? 'Brak wyników' : `${((page - 1) * PER_PAGE) + 1}–${Math.min(page * PER_PAGE, total)} z ${total.toLocaleString()} rekordów`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-4 text-left">Typ</th>
                <th className="p-4 text-left">Gracz</th>
                <th className="p-4 text-left">Postać RP</th>
                <th className="p-4 text-left">Kwota</th>
                <th className="p-4 text-left">Powód</th>
                <th className="p-4 text-left">Wystawił</th>
                <th className="p-4 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {fines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">Brak mandatów dla podanych filtrów.</td>
                </tr>
              ) : fines.map(f => {
                const info = TYPE_INFO[f.type] ?? { emoji: '📋', badge: 'bg-gray-500/20 text-gray-300 border-gray-500/30', label: f.type };
                return (
                  <tr key={f.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${info.badge}`}>
                        {info.emoji} {info.label}
                      </span>
                    </td>
                    <td className="p-4 text-white font-medium">{f.target.discordUsername}</td>
                    <td className="p-4 text-gray-400">
                      {f.target.character
                        ? `${f.target.character.firstName} ${f.target.character.lastName}`
                        : '—'}
                    </td>
                    <td className="p-4 text-gray-300 font-mono">
                      {f.amount != null ? `${f.amount.toLocaleString('pl-PL')} zł` : '—'}
                    </td>
                    <td className="p-4 text-gray-300 max-w-xs">
                      <span className="line-clamp-2">{f.reason}</span>
                    </td>
                    <td className="p-4 text-gray-400">{f.issuer.discordUsername}</td>
                    <td className="p-4 text-gray-500 text-xs whitespace-nowrap">{f.createdAt.toLocaleDateString('pl-PL')}</td>
                  </tr>
                );
              })}
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
