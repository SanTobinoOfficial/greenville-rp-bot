// Dashboard — Zarządzanie sesjami RP

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function SessionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) {
    redirect('/login');
  }

  const sessions = await prisma.session.findMany({
    orderBy: { date: 'desc' },
    take: 20,
    include: {
      _count: { select: { signups: true } },
    },
  });

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    UPCOMING: { label: 'Nadchodząca', color: 'bg-blue-500/20 text-blue-300' },
    ONGOING:  { label: 'Trwa',        color: 'bg-green-500/20 text-green-300' },
    ENDED:    { label: 'Zakończona',  color: 'bg-gray-500/20 text-gray-400' },
    CANCELLED:{ label: 'Odwołana',   color: 'bg-red-500/20 text-red-300' },
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">🎪 Sesje RP</h1>

      <div className="grid gap-4">
        {sessions.map(s => {
          const statusInfo = STATUS_LABELS[s.status] || STATUS_LABELS.ENDED;
          return (
            <div key={s.id} className="bg-[#1E2124] rounded-xl p-5 border border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    {s.peacetime > 0 && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300">
                        Peacetime {s.peacetime}°
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-lg">
                    📅 {s.date.toLocaleDateString('pl-PL')} o {s.date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </h3>
                  {s.description && (
                    <p className="text-gray-400 text-sm mt-1">{s.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {s._count.signups}/{s.maxPlayers}
                  </div>
                  <div className="text-gray-400 text-xs">graczy</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">Brak sesji RP.</div>
      )}
    </div>
  );
}
