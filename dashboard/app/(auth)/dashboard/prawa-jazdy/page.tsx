// Dashboard — Zarządzanie prawami jazdy (z filtrami i paginacją)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import type { LicenseStatus } from '@prisma/client';

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    'bg-green-500/20 text-green-300 border-green-500/30',
  SUSPENDED: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  REVOKED:   'bg-red-500/20 text-red-300 border-red-500/30',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Aktywne', SUSPENDED: 'Zawieszone', REVOKED: 'Cofnięte',
};

const PER_PAGE = 50;

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; kat?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const q      = (searchParams.q ?? '').trim();
  const status = searchParams.status ?? '';
  const kat    = searchParams.kat ?? '';
  const page   = Math.max(1, Number(searchParams.page ?? '1'));

  const where = {
    AND: [
      q ? {
        OR: [
          { user: { discordUsername: { contains: q, mode: 'insensitive' as const } } },
        ],
      } : {},
      status ? { status: status as LicenseStatus } : {},
      kat    ? { kategoria: { equals: kat, mode: 'insensitive' as const } } : {},
    ],
  };

  const include = { user: { select: { discordUsername: true, character: true } } };

  const [licenses, total, activeCount, suspendedCount, revokedCount, categories] = await Promise.all([
    prisma.license.findMany({ where, include, orderBy: { issuedAt: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.license.count({ where }),
    prisma.license.count({ where: { status: 'ACTIVE'    } }),
    prisma.license.count({ where: { status: 'SUSPENDED' } }),
    prisma.license.count({ where: { status: 'REVOKED'   } }),
    prisma.license.findMany({ select: { kategoria: true }, distinct: ['kategoria'], orderBy: { kategoria: 'asc' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q)      params.set('q', q);
    if (status) params.set('status', status);
    if (kat)    params.set('kat', kat);
    params.set('page', String(p));
    return `/dashboard/prawa-jazdy?${params}`;
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">🪪 Prawa Jazdy</h1>
        <p className="text-gray-400 text-sm mt-0.5">Rejestr praw jazdy graczy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-400">{activeCount}</div>
          <div className="text-gray-400 text-sm mt-1">Aktywne</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="text-3xl font-bold text-yellow-400">{suspendedCount}</div>
          <div className="text-gray-400 text-sm mt-1">Zawieszone</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="text-3xl font-bold text-red-400">{revokedCount}</div>
          <div className="text-gray-400 text-sm mt-1">Cofnięte</div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po graczu lub postaci RP..."
          className="flex-1 min-w-48 bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
        />
        <select name="status" defaultValue={status} className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]">
          <option value="">Wszystkie statusy</option>
          <option value="ACTIVE">Aktywne</option>
          <option value="SUSPENDED">Zawieszone</option>
          <option value="REVOKED">Cofnięte</option>
        </select>
        <select name="kat" defaultValue={kat} className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]">
          <option value="">Wszystkie kategorie</option>
          {categories.map(c => (
            <option key={c.kategoria} value={c.kategoria}>Kat. {c.kategoria}</option>
          ))}
        </select>
        <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Filtruj
        </button>
        {(q || status || kat) && (
          <a href="/dashboard/prawa-jazdy" className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
            Wyczyść
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-gray-400 text-sm">
          {total === 0 ? 'Brak wyników' : `${((page - 1) * PER_PAGE) + 1}–${Math.min(page * PER_PAGE, total)} z ${total.toLocaleString()} praw jazdy`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-4 text-left">Gracz</th>
                <th className="p-4 text-left">Postać RP</th>
                <th className="p-4 text-left">Kategoria</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Zawieszone do</th>
                <th className="p-4 text-left">Wystawiono</th>
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">Brak praw jazdy dla podanych filtrów.</td>
                </tr>
              ) : licenses.map(l => (
                <tr key={l.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white font-medium">{l.user.discordUsername}</td>
                  <td className="p-4 text-gray-400">
                    {l.user.character
                      ? `${l.user.character.firstName} ${l.user.character.lastName}`
                      : '—'}
                  </td>
                  <td className="p-4">
                    <span className="bg-[#5865F2]/20 text-[#7289DA] border border-[#5865F2]/30 px-2 py-0.5 rounded text-xs font-bold font-mono">
                      KAT. {l.kategoria.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded border text-xs font-medium ${STATUS_BADGE[l.status] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                      {STATUS_LABEL[l.status] ?? l.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    {l.suspendedUntil ? l.suspendedUntil.toLocaleDateString('pl-PL') : '—'}
                  </td>
                  <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                    {l.issuedAt.toLocaleDateString('pl-PL')}
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
