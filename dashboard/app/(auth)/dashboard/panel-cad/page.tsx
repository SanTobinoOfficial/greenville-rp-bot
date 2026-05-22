// Panel CAD — Staff Dispatch (styl Melonly)
// Widoczny dla: Helper+

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

const SERVICE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  POLICJA:       { label: 'Policja',       emoji: '🚔', color: 'text-blue-400'   },
  EMS:           { label: 'EMS',           emoji: '🚑', color: 'text-red-400'    },
  STRAZ:         { label: 'Straż Pożarna', emoji: '🚒', color: 'text-orange-400' },
  DOT:           { label: 'DOT',           emoji: '🚧', color: 'text-yellow-400' },
  STRAZ_MIEJSKA: { label: 'Straż Miejska', emoji: '🛡️', color: 'text-green-400'  },
  TAKSOWKARZ:    { label: 'Taksówkarz',    emoji: '🚕', color: 'text-zinc-400'   },
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60)   return `${s}s temu`;
  if (s < 3600) return `${Math.floor(s / 60)}min temu`;
  return `${Math.floor(s / 3600)}h temu`;
}

export default async function PanelCadPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.accessLevel < ACCESS_LEVELS.HELPER) redirect('/dashboard');

  const now = new Date();

  // ── Dane ─────────────────────────────────────────────────────────────────
  const [
    // Aktywne jednostki (ostatni DutyLog = ON_DUTY per user)
    allDutyLogs,
    // Tickety
    openTickets,
    claimedTickets,
    // Zatrzymani
    activeArrests,
    // Ostatnie przypadki
    recentCases,
    // Sesja
    activeSession,
    // Mandaty
    activeFines,
    // Statystyki
    totalUsers,
    verifiedUsers,
  ] = await Promise.all([
    // Pobierz ostatni wpis duty per user
    prisma.dutyLog.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { discordId: true, discordUsername: true, robloxUsername: true } } },
      where: { createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } }, // ostatnie 12h
    }),
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'CLAIMED' } }),
    prisma.arrest.findMany({
      where: { active: true },
      include: {
        target:  { select: { discordId: true, discordUsername: true, robloxUsername: true } },
        officer: { select: { discordUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.case.findMany({
      where: { status: 'ACTIVE' },
      include: {
        target:    { select: { discordId: true, discordUsername: true } },
        moderator: { select: { discordUsername: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
    prisma.session.findFirst({
      where: { status: { in: ['UPCOMING', 'ONGOING'] } },
      orderBy: { createdAt: 'desc' },
      include: { signups: true },
    }),
    prisma.fine.count({ where: { active: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { robloxId: { not: null } } }),
  ]);

  // Oblicz kto jest aktualnie ON_DUTY
  const onDutyByUser: Record<string, { service: string; since: Date; user: typeof allDutyLogs[0]['user'] }> = {};
  for (const log of allDutyLogs) {
    if (!onDutyByUser[log.userId]) {
      // Pierwszy wpis = najnowszy (orderBy desc)
      if (log.action === 'ON_DUTY') {
        onDutyByUser[log.userId] = { service: log.service, since: log.createdAt, user: log.user };
      }
    }
  }
  const onDutyUnits = Object.values(onDutyByUser);

  // Grupuj jednostki per służba
  const unitsByService: Record<string, typeof onDutyUnits> = {};
  for (const unit of onDutyUnits) {
    if (!unitsByService[unit.service]) unitsByService[unit.service] = [];
    unitsByService[unit.service].push(unit);
  }

  const TYPE_BADGE: Record<string, string> = {
    WARN: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    BAN:  'bg-red-500/20 text-red-300 border border-red-500/30',
    KICK: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
    MUTE: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  };

  const sessionStatus = activeSession
    ? activeSession.status === 'ONGOING'
      ? { label: 'TRWAJĄCA SESJA', color: 'text-green-400 border-green-500/30 bg-green-500/10' }
      : { label: 'ZAPLANOWANA SESJA', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
    : { label: 'BRAK AKTYWNEJ SESJI', color: 'text-zinc-500 border-zinc-700 bg-zinc-800/30' };

  return (
    <div className="p-5 space-y-5 min-h-screen bg-background">
      {/* ── NAGŁÓWEK ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🖥️ Panel CAD — AURORA Greenville RP
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Dispatch & Staff Management • {now.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-md border text-sm font-medium ${sessionStatus.color}`}>
          {sessionStatus.label}
          {activeSession && ` · ${activeSession.signups.length} graczy`}
        </div>
      </div>

      {/* ── QUICK STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {[
          { label: 'Jednostki na służbie', value: onDutyUnits.length, color: 'border-blue-500/30 bg-blue-500/5',    icon: '🚔' },
          { label: 'Otwarte tickety',       value: openTickets + claimedTickets, color: 'border-cyan-500/30 bg-cyan-500/5',     icon: '🎫' },
          { label: 'Zatrzymani',            value: activeArrests.length,         color: 'border-red-500/30 bg-red-500/5',       icon: '🔒' },
          { label: 'Aktywne kary',          value: recentCases.length,           color: 'border-yellow-500/30 bg-yellow-500/5', icon: '⚖️' },
          { label: 'Mandaty',               value: activeFines,                  color: 'border-orange-500/30 bg-orange-500/5', icon: '📜' },
          { label: 'Gracze w bazie',        value: `${verifiedUsers}/${totalUsers}`, color: 'border-green-500/30 bg-green-500/5', icon: '👥' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-lg border p-3 ${stat.color}`}>
            <div className="text-lg font-bold">{stat.icon} {stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── GŁÓWNA SIATKA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEWA KOLUMNA — Aktywne jednostki */}
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm">🚔 Aktywne Jednostki ({onDutyUnits.length})</h2>
            </div>
            <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {onDutyUnits.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Brak aktywnych jednostek</p>
              ) : (
                Object.entries(unitsByService).map(([service, units]) => {
                  const svc = SERVICE_LABELS[service] ?? { label: service, emoji: '👮', color: 'text-zinc-300' };
                  return (
                    <div key={service}>
                      <div className={`text-xs font-semibold mb-1.5 ${svc.color}`}>
                        {svc.emoji} {svc.label} ({units.length})
                      </div>
                      <div className="space-y-1">
                        {units.map(u => (
                          <div key={u.user.discordId} className="flex items-center justify-between bg-secondary/30 rounded px-2.5 py-1.5">
                            <span className="text-sm font-medium">
                              {u.user.robloxUsername ?? u.user.discordUsername ?? 'Nieznany'}
                            </span>
                            <span className="text-xs text-muted-foreground">{timeAgo(u.since)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Tickety */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm">🎫 Tickety</h2>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Otwarte</span>
                <span className="font-medium text-red-400">{openTickets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Obsługiwane</span>
                <span className="font-medium text-yellow-400">{claimedTickets}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Łącznie aktywnych</span>
                <span className="font-bold">{openTickets + claimedTickets}</span>
              </div>
              <a href="/dashboard/tickety"
                className="block w-full text-center text-xs py-1.5 rounded bg-secondary hover:bg-secondary/70 transition-colors mt-1">
                Zarządzaj ticketami →
              </a>
            </div>
          </div>
        </div>

        {/* ŚRODKOWA KOLUMNA — Zatrzymani */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">🔒 Zatrzymani ({activeArrests.length})</h2>
            <a href="/dashboard/zatrzymani" className="text-xs text-muted-foreground hover:text-foreground">
              Wszystkie →
            </a>
          </div>
          <div className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
            {activeArrests.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Brak aktywnych zatrzymań</p>
            ) : (
              activeArrests.map(arrest => (
                <div key={arrest.id} className="bg-red-500/5 border border-red-500/20 rounded-md px-3 py-2 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-300">
                      🔴 {arrest.target.robloxUsername ?? arrest.target.discordUsername}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(arrest.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{arrest.reason}</p>
                  <p className="text-xs text-zinc-500">Zatrzymał: {arrest.officer?.discordUsername ?? '—'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PRAWA KOLUMNA — Aktywne kary */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">⚖️ Aktywne Kary ({recentCases.length})</h2>
            <a href="/dashboard/moderacja" className="text-xs text-muted-foreground hover:text-foreground">
              Wszystkie →
            </a>
          </div>
          <div className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
            {recentCases.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Brak aktywnych kar</p>
            ) : (
              recentCases.map(c => (
                <div key={c.id} className="bg-secondary/20 rounded-md px-3 py-2 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${TYPE_BADGE[c.type] ?? 'bg-zinc-500/20 text-zinc-300'}`}>
                      {c.type}
                    </span>
                    <span className="text-sm font-medium">
                      {c.target.discordUsername}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">#{c.caseNumber}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.reason}</p>
                  <p className="text-xs text-zinc-500">Mod: {c.moderator.discordUsername} · {timeAgo(c.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── DOLNA SEKCJA — Sesja RP ── */}
      {activeSession && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">🎪 Aktywna Sesja RP</h2>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Status</p>
              <p className={`font-semibold ${activeSession.status === 'ONGOING' ? 'text-green-400' : 'text-yellow-400'}`}>
                {activeSession.status === 'ONGOING' ? '🟢 TRWA' : '🟡 ZAPLANOWANA'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Data</p>
              <p className="font-semibold">{new Date(activeSession.date).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Zapisani</p>
              <p className="font-semibold">{activeSession.signups.length} / {activeSession.maxPlayers}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Peacetime</p>
              <p className="font-semibold">
                {activeSession.peacetime === 0 ? '✅ Wyłączony' :
                 activeSession.peacetime === 1 ? '⚠️ PT1°' : '🚨 PT2°'}
              </p>
            </div>
            {activeSession.startedAt && (
              <div>
                <p className="text-muted-foreground text-xs">Rozpoczęta</p>
                <p className="font-semibold">{timeAgo(activeSession.startedAt)}</p>
              </div>
            )}
            <div className="ml-auto">
              <a href="/dashboard/sesje" className="text-xs px-3 py-1.5 rounded bg-secondary hover:bg-secondary/70 transition-colors">
                Zarządzaj sesjami →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── SZYBKIE AKCJE ── */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">⚡ Szybkie Akcje</h2>
        </div>
        <div className="p-3 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
          {[
            { href: '/dashboard/moderacja',  label: 'Moderacja',      icon: '⚖️' },
            { href: '/dashboard/tickety',    label: 'Tickety',         icon: '🎫' },
            { href: '/dashboard/zatrzymani', label: 'Zatrzymani',      icon: '🔒' },
            { href: '/dashboard/mandaty',    label: 'Mandaty',         icon: '📜' },
            { href: '/dashboard/pojazdy',    label: 'Pojazdy',         icon: '🚗' },
            { href: '/dashboard/prawa-jazdy', label: 'Prawa Jazdy',    icon: '🪪' },
            { href: '/dashboard/gracze',     label: 'Gracze',          icon: '👥' },
            { href: '/dashboard/sesje',      label: 'Sesje',           icon: '🎪' },
            { href: '/dashboard/sluzby',     label: 'Służby',          icon: '🛡️' },
            { href: '/dashboard/notatki',    label: 'Notatki',         icon: '📝' },
            { href: '/dashboard/podania',    label: 'Podania',         icon: '📋' },
            { href: '/dashboard/logi',       label: 'Logi',            icon: '📁' },
          ].map(a => (
            <a key={a.href} href={a.href}
              className="flex items-center gap-2 px-3 py-2 rounded bg-secondary/40 hover:bg-secondary transition-colors text-sm">
              <span>{a.icon}</span>
              <span className="font-medium">{a.label}</span>
            </a>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Panel odświeżony: {now.toLocaleTimeString('pl-PL')} · AURORA Greenville RP Staff CAD
      </p>
    </div>
  );
}
