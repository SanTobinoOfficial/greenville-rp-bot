import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  Users,
  CheckCircle2,
  Ticket,
  ShieldAlert,
  Activity,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { CadButton } from '@/components/CadButton';

async function getDashboardData() {
  const [
    totalMembers,
    verifiedMembers,
    openTickets,
    activeCases,
    recentLogs,
    employedMembers,
    pendingJobApps,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { verifiedAt: { not: null } } }),
    prisma.ticket.count({ where: { status: { in: ['OPEN', 'CLAIMED'] } } }),
    prisma.case.count({ where: { status: 'ACTIVE' } }),
    prisma.botLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.user.count({ where: { currentJob: { not: null } } }),
    prisma.jobApplication.count({ where: { status: 'PENDING' } }),
  ]);

  return { totalMembers, verifiedMembers, openTickets, activeCases, recentLogs, employedMembers, pendingJobApps };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { totalMembers, verifiedMembers, openTickets, activeCases, recentLogs, employedMembers, pendingJobApps } =
    await getDashboardData();

  const stats = [
    {
      label: 'Wszyscy członkowie',
      value: totalMembers,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Zweryfikowani',
      value: verifiedMembers,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Otwarte tickety',
      value: openTickets,
      icon: Ticket,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Aktywne sprawy',
      value: activeCases,
      icon: ShieldAlert,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Zatrudnionych graczy',
      value: employedMembers,
      icon: Activity,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      href: '/dashboard/prace',
    },
    {
      label: 'Podania o pracę',
      value: pendingJobApps,
      icon: CheckCircle2,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      href: '/dashboard/podania-pracy',
      badge: pendingJobApps > 0 ? 'Oczekują!' : undefined,
    },
  ];

  const quickActions = [
    { href: '/dashboard/podania', label: 'Podania', desc: 'Przeglądaj nowe podania' },
    { href: '/dashboard/podania-pracy', label: 'Podania o pracę', desc: `${pendingJobApps > 0 ? `🔔 ${pendingJobApps} oczekujących` : 'Rozpatruj podania o pracę'}` },
    { href: '/dashboard/tickety', label: 'Tickety', desc: 'Obsłuż otwarte tickety' },
    { href: '/dashboard/gracze', label: 'Gracze', desc: 'Wyszukaj gracza' },
    { href: '/dashboard/prace', label: 'Prace RP', desc: 'Baza wszystkich 76 prac' },
    { href: '/dashboard/logi', label: 'Logi', desc: 'Przeglądaj logi bota' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            Witaj, {session.user.name?.split('#')[0] ?? 'Staff'}!
          </h1>
          <p className="text-muted-foreground text-sm">
            Przegląd aktywności serwera Greenville RP
          </p>
        </div>
        {/* Przycisk CAD */}
        <CadButton label="🖥️ Otwórz CAD" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const card = (
            <div
              key={stat.label}
              className={`bg-card border border-border rounded-xl p-5 flex items-start gap-4 relative overflow-hidden ${stat.href ? 'hover:border-white/20 transition-colors cursor-pointer' : ''}`}
            >
              <div className={`${stat.bg} p-2.5 rounded-lg shrink-0`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value.toLocaleString('pl')}</p>
              </div>
              {(stat as { badge?: string }).badge && (
                <span className="absolute top-2 right-2 text-[10px] bg-orange-500/20 border border-orange-500/30 text-orange-400 px-2 py-0.5 rounded-full">
                  {(stat as { badge?: string }).badge}
                </span>
              )}
            </div>
          );
          return (stat as { href?: string }).href ? (
            <Link key={stat.label} href={(stat as { href: string }).href}>{card}</Link>
          ) : card;
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="xl:col-span-2 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Ostatnia aktywność</h2>
          </div>
          <div className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">
                Brak wpisów w logach.
              </p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{log.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="bg-secondary px-1.5 py-0.5 rounded text-xs">
                        {log.type}
                      </span>
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: pl,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-sm">Szybkie akcje</h2>
          </div>
          <div className="p-3 space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-secondary transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
