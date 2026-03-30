// Dashboard — Zarządzanie sesjami RP (z filtrem statusu)

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import type { SessionStatus } from '@prisma/client';

const STATUS_INFO: Record<string, { label: string; badge: string; dot: string }> = {
  UPCOMING:  { label: 'Nadchodząca', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',   dot: 'bg-blue-400'  },
  ONGOING:   { label: 'Trwa teraz',  badge: 'bg-green-500/20 text-green-300 border-green-500/30', dot: 'bg-green-400 animate-pulse' },
  ENDED:     { label: 'Zakończona',  badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30',    dot: 'bg-gray-500'  },
  CANCELLED: { label: 'Odwołana',    badge: 'bg-red-500/20 text-red-300 border-red-500/30',       dot: 'bg-red-400'   },
};

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const statusFilter = searchParams.status ?? '';

  const where = statusFilter ? { status: statusFilter as SessionStatus } : {};

  const [sessions, upcoming, ongoing, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 40,
      include: {
        _count: { select: { signups: true } },
      },
    }),
    prisma.session.count({ where: { status: 'UPCOMING' } }),
    prisma.session.count({ where: { status: 'ONGOING'  } }),
    prisma.session.count(),
  ]);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">🎪 Sesje RP</h1>
        <p className="text-gray-400 text-sm mt-0.5">{total} sesji łącznie</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <div>
            <div className="text-2xl font-bold text-green-400">{ongoing}</div>
            <div className="text-gray-400 text-sm">Trwa teraz</div>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <div>
            <div className="text-2xl font-bold text-blue-400">{upcoming}</div>
            <div className="text-gray-400 text-sm">Nadchodzące</div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[{ v: '', l: 'Wszystkie' }, { v: 'UPCOMING', l: 'Nadchodzące' }, { v: 'ONGOING', l: 'Trwające' }, { v: 'ENDED', l: 'Zakończone' }, { v: 'CANCELLED', l: 'Odwołane' }].map(opt => (
          <a
            key={opt.v}
            href={opt.v ? `/dashboard/sesje?status=${opt.v}` : '/dashboard/sesje'}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              statusFilter === opt.v
                ? 'bg-[#5865F2] text-white'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400'
            }`}
          >
            {opt.l}
          </a>
        ))}
      </div>

      {/* Session cards */}
      {sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-[#1E2124] rounded-xl border border-white/10">
          Brak sesji RP dla wybranego filtru.
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map(s => {
            const info = STATUS_INFO[s.status] ?? STATUS_INFO.ENDED;
            const fill = s.maxPlayers > 0 ? Math.min(100, Math.round((s._count.signups / s.maxPlayers) * 100)) : 0;
            return (
              <div key={s.id} className="bg-[#1E2124] rounded-xl p-5 border border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-medium ${info.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
                        {info.label}
                      </span>
                      {s.peacetime > 0 && (
                        <span className="bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded text-xs font-medium">
                          ☮️ Peacetime {s.peacetime}°
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-semibold">
                      📅{' '}
                      {s.date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {' '}o{' '}
                      {s.date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </h3>
                    {s.description && (
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{s.description}</p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-white">{s._count.signups}</div>
                    <div className="text-gray-500 text-xs">/ {s.maxPlayers} graczy</div>
                  </div>
                </div>

                {/* Fill bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Zapisy</span>
                    <span>{fill}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${fill >= 100 ? 'bg-red-400' : fill >= 75 ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${fill}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
