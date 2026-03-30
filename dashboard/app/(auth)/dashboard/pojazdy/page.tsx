// Dashboard — Baza pojazdów RP (z wyszukiwaniem)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const PER_PAGE = 50;

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const q    = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page ?? '1'));

  const where = q ? {
    OR: [
      { tablica: { contains: q, mode: 'insensitive' as const } },
      { marka:   { contains: q, mode: 'insensitive' as const } },
      { model:   { contains: q, mode: 'insensitive' as const } },
      { kolor:   { contains: q, mode: 'insensitive' as const } },
      { user:    { discordUsername: { contains: q, mode: 'insensitive' as const } } },
      { user:    { robloxUsername:  { contains: q, mode: 'insensitive' as const } } },
      { user:    { character: { firstName: { contains: q, mode: 'insensitive' as const } } } },
      { user:    { character: { lastName:  { contains: q, mode: 'insensitive' as const } } } },
    ],
  } : {};

  const [vehicles, total, totalAll] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { user: { select: { discordUsername: true, robloxUsername: true, character: true } } },
    }),
    prisma.vehicle.count({ where }),
    prisma.vehicle.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(p));
    return `/dashboard/pojazdy?${params}`;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🚗 Baza Pojazdów</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {totalAll.toLocaleString()} zarejestrowanych pojazdów łącznie
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po tablicy, marce, modelu, kolorze, właścicielu..."
          className="flex-1 bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
        />
        <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Szukaj
        </button>
        {q && (
          <a href="/dashboard/pojazdy" className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
            Wyczyść
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-gray-400 text-sm">
          {total === 0 ? 'Brak wyników' : `${((page - 1) * PER_PAGE) + 1}–${Math.min(page * PER_PAGE, total)} z ${total.toLocaleString()} pojazdów`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-4 text-left">Tablica</th>
                <th className="p-4 text-left">Pojazd</th>
                <th className="p-4 text-left">Rok</th>
                <th className="p-4 text-left">Kolor</th>
                <th className="p-4 text-left">Właściciel (Discord)</th>
                <th className="p-4 text-left">Postać RP</th>
                <th className="p-4 text-left">Roblox</th>
                <th className="p-4 text-left">Zarejestrowano</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    {q ? 'Brak pojazdów pasujących do wyszukiwania.' : 'Brak pojazdów w bazie.'}
                  </td>
                </tr>
              ) : vehicles.map(v => (
                <tr key={v.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <code className="bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded text-yellow-300 text-xs font-bold tracking-wider">
                      {v.tablica}
                    </code>
                  </td>
                  <td className="p-4 text-white font-medium">{v.marka} {v.model}</td>
                  <td className="p-4 text-gray-400">{v.rok ?? '—'}</td>
                  <td className="p-4 text-gray-300">{v.kolor ?? '—'}</td>
                  <td className="p-4 text-gray-300">{v.user.discordUsername}</td>
                  <td className="p-4 text-gray-400">
                    {v.user.character
                      ? `${v.user.character.firstName} ${v.user.character.lastName}`
                      : '—'}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{v.user.robloxUsername ?? '—'}</td>
                  <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                    {v.createdAt.toLocaleDateString('pl-PL')}
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
