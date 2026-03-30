// Dashboard — Moderacja (Cases) z filtrami i paginacją

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const TYPE_BADGE: Record<string, string> = {
  WARN:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  BAN:    'bg-red-500/20 text-red-300 border-red-500/30',
  KICK:   'bg-pink-500/20 text-pink-300 border-pink-500/30',
  MUTE:   'bg-orange-500/20 text-orange-300 border-orange-500/30',
  UNBAN:  'bg-green-500/20 text-green-300 border-green-500/30',
  UNMUTE: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
};

const TYPE_EMOJI: Record<string, string> = {
  WARN: '⚠️', BAN: '🔨', KICK: '👢', MUTE: '🔇', UNBAN: '✅', UNMUTE: '🔊',
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'bg-green-500/20 text-green-300',
  EXPIRED:  'bg-gray-500/20 text-gray-400',
  REVOKED:  'bg-red-500/20 text-red-300',
};

const PER_PAGE = 50;

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: { q?: string; type?: string; status?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.MOD) redirect('/dashboard');

  const q      = (searchParams.q ?? '').trim();
  const type   = searchParams.type ?? '';
  const status = searchParams.status ?? '';
  const page   = Math.max(1, Number(searchParams.page ?? '1'));

  const where = {
    AND: [
      q ? {
        OR: [
          { target:    { discordUsername: { contains: q, mode: 'insensitive' as const } } },
          { moderator: { discordUsername: { contains: q, mode: 'insensitive' as const } } },
          { reason:    { contains: q, mode: 'insensitive' as const } },
        ],
      } : {},
      type   ? { type   } : {},
      status ? { status } : {},
    ],
  };

  const include = {
    target:    { select: { discordUsername: true, discordId: true } },
    moderator: { select: { discordUsername: true } },
  };

  const [cases, total, activeBans, activeWarns] = await Promise.all([
    prisma.case.findMany({ where, include, orderBy: { caseNumber: 'desc' }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.case.count({ where }),
    prisma.case.count({ where: { type: 'BAN',  status: 'ACTIVE' } }),
    prisma.case.count({ where: { type: 'WARN', status: 'ACTIVE' } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q)      params.set('q', q);
    if (type)   params.set('type', type);
    if (status) params.set('status', status);
    params.set('page', String(p));
    return `/dashboard/moderacja?${params}`;
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">🔨 Moderacja — Cases</h1>
        <p className="text-gray-400 text-sm mt-0.5">Historia akcji moderacyjnych na serwerze</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="text-3xl font-bold text-red-400">{activeBans}</div>
          <div className="text-gray-400 text-sm mt-1">Aktywne bany</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="text-3xl font-bold text-yellow-400">{activeWarns}</div>
          <div className="text-gray-400 text-sm mt-1">Aktywne ostrzeżenia</div>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj po graczu, moderatorze lub powodzie..."
          className="flex-1 min-w-56 bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#5865F2]"
        />
        <select name="type" defaultValue={type} className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]">
          <option value="">Wszystkie typy</option>
          {['WARN','BAN','KICK','MUTE','UNBAN','UNMUTE'].map(t => (
            <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>
          ))}
        </select>
        <select name="status" defaultValue={status} className="bg-[#1E2124] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#5865F2]">
          <option value="">Wszystkie statusy</option>
          <option value="ACTIVE">Aktywny</option>
          <option value="EXPIRED">Wygasły</option>
          <option value="REVOKED">Anulowany</option>
        </select>
        <button type="submit" className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          Filtruj
        </button>
        {(q || type || status) && (
          <a href="/dashboard/moderacja" className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
            Wyczyść
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-[#1E2124] rounded-xl border border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 text-gray-400 text-sm">
          {total === 0 ? 'Brak wyników' : `${((page - 1) * PER_PAGE) + 1}–${Math.min(page * PER_PAGE, total)} z ${total.toLocaleString()} przypadków`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-gray-400">
              <tr>
                <th className="p-4 text-left">#</th>
                <th className="p-4 text-left">Typ</th>
                <th className="p-4 text-left">Gracz</th>
                <th className="p-4 text-left">Moderator</th>
                <th className="p-4 text-left">Powód</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Wygasa</th>
                <th className="p-4 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">Brak przypadków moderacyjnych.</td>
                </tr>
              ) : cases.map(c => (
                <tr key={c.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-500 font-mono text-xs">#{c.caseNumber}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${TYPE_BADGE[c.type] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                      {TYPE_EMOJI[c.type]} {c.type}
                    </span>
                  </td>
                  <td className="p-4 text-white font-medium">{c.target.discordUsername}</td>
                  <td className="p-4 text-gray-400">{c.moderator.discordUsername}</td>
                  <td className="p-4 text-gray-300 max-w-xs">
                    <span className="line-clamp-2">{c.reason}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_BADGE[c.status] ?? 'bg-gray-500/20 text-gray-400'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {c.expiresAt ? c.expiresAt.toLocaleDateString('pl-PL') : '—'}
                  </td>
                  <td className="p-4 text-gray-500 text-xs whitespace-nowrap">
                    {c.createdAt.toLocaleDateString('pl-PL')}
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
