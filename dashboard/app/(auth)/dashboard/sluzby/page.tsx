// Dashboard — Logi Duty Służb
// Widoczna dla: Helper+

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const PER_PAGE = 50;

const SERVICE_LABEL: Record<string, string> = {
  POLICJA:       '🚔 Policja',
  EMS:           '🚑 EMS',
  STRAZ:         '🚒 Straż Pożarna',
  DOT:           '🚧 DOT',
  TAKSOWKARZ:    '🚕 Taksówkarz',
};

const ACTION_BADGE: Record<string, string> = {
  ON_DUTY:  'bg-green-500/20 text-green-300 border-green-500/30',
  OFF_DUTY: 'bg-red-500/20 text-red-300 border-red-500/30',
};

export default async function SluzbyPage({
  searchParams,
}: {
  searchParams: { q?: string; service?: string; action?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const q       = (searchParams.q ?? '').trim();
  const service = searchParams.service ?? '';
  const action  = searchParams.action ?? '';
  const page    = Math.max(1, parseInt(searchParams.page ?? '1'));

  const where: Record<string, unknown> = {};
  if (service) where.service = service;
  if (action)  where.action  = action;
  if (q) {
    where.user = {
      OR: [
        { discordUsername: { contains: q, mode: 'insensitive' as const } },
        { robloxUsername:  { contains: q, mode: 'insensitive' as const } },
      ],
    };
  }

  const [logs, total] = await Promise.all([
    prisma.dutyLog.findMany({
      where,
      include: { user: { select: { discordId: true, discordUsername: true, robloxUsername: true } } },
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * PER_PAGE,
      take:  PER_PAGE,
    }),
    prisma.dutyLog.count({ where }),
  ]);

  // Statsy
  const [onDutyNow, totalByService] = await Promise.all([
    prisma.dutyLog.groupBy({
      by: ['service', 'userId'],
      orderBy: { service: 'asc' },
      where: { action: 'ON_DUTY' },
    }).then(async rows => {
      // Find users whose last action is ON_DUTY
      const result: Record<string, number> = {};
      for (const row of rows) {
        const last = await prisma.dutyLog.findFirst({
          where: { userId: row.userId, service: row.service },
          orderBy: { createdAt: 'desc' },
        });
        if (last?.action === 'ON_DUTY') {
          result[row.service] = (result[row.service] || 0) + 1;
        }
      }
      return result;
    }),
    prisma.dutyLog.groupBy({
      by: ['service'],
      _count: { _all: true },
      orderBy: { service: 'asc' },
    }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">🚔 Służby — Logi Duty</h1>
        <p className="text-muted-foreground text-sm mt-1">Historia wejść i wyjść ze służby</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(SERVICE_LABEL).map(([key, label]) => (
          <div key={key} className="bg-card border border-border rounded-lg p-3 text-center">
            <div className="text-lg mb-1">{label.split(' ')[0]}</div>
            <div className="text-xs text-muted-foreground">{label.split(' ').slice(1).join(' ')}</div>
            <div className="text-xl font-bold mt-1 text-green-400">{onDutyNow[key] || 0}</div>
            <div className="text-xs text-muted-foreground">on-duty</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Szukaj gracza..."
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm w-52 focus:outline-none"
        />
        <select name="service" defaultValue={service}
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none">
          <option value="">Wszystkie służby</option>
          {Object.entries(SERVICE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="action" defaultValue={action}
          className="bg-secondary border border-border rounded-md px-3 py-2 text-sm focus:outline-none">
          <option value="">Wszystkie akcje</option>
          <option value="ON_DUTY">🟢 On Duty</option>
          <option value="OFF_DUTY">🔴 Off Duty</option>
        </select>
        <button type="submit"
          className="bg-secondary hover:bg-secondary/70 border border-border px-4 py-2 rounded-md text-sm">
          Filtruj
        </button>
        {(q || service || action) && (
          <a href="/dashboard/sluzby"
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground border border-border">
            Wyczyść
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Gracz</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Służba</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Akcja</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Czas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground">
                    Brak wyników
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium">{log.user.discordUsername}</span>
                    {log.user.robloxUsername && (
                      <span className="text-muted-foreground text-xs ml-1">@{log.user.robloxUsername}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{SERVICE_LABEL[log.service] || log.service}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ACTION_BADGE[log.action] || 'bg-secondary text-muted-foreground'}`}>
                      {log.action === 'ON_DUTY' ? '🟢 ON DUTY' : '🔴 OFF DUTY'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString('pl-PL', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`/dashboard/sluzby?q=${q}&service=${service}&action=${action}&page=${p}`}
              className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
