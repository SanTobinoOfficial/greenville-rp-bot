// /portal — Panel gracza po zalogowaniu
// Wyświetla inny widok zależnie od roli: niezweryfikowany / cywil / służby / staff

import { getServerSession } from 'next-auth';
import { authOptions, ACCESS_LEVELS } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
async function getUserData(discordId: string) {
  return prisma.user.findUnique({
    where: { discordId },
    include: {
      character: true,
      vehicles: { orderBy: { createdAt: 'desc' }, take: 5 },
      licenses: { where: { status: 'ACTIVE' } },
      finesReceived: { where: { active: true }, take: 5 },
      casesAsTarget: { where: { status: 'ACTIVE' }, take: 5 },
      arrests: { where: { active: true } },
      dutyLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
}

async function getUpcomingSession() {
  return prisma.session.findFirst({
    where: { status: { in: ['UPCOMING', 'ONGOING'] } },
    orderBy: { date: 'asc' },
    include: { _count: { select: { signups: true } } },
  });
}

function StatCard({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-[#0d1117] border border-white/8 rounded-xl p-5 text-center">
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}

export default async function PortalPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const [user, nextSession] = await Promise.all([
    getUserData(session.user.discordId),
    getUpcomingSession(),
  ]);

  const isStaff    = session.user.accessLevel >= ACCESS_LEVELS.HELPER;
  const isVerified = !!user?.robloxUsername;
  const hasService = (user?.dutyLogs?.length ?? 0) > 0;
  const isArrested = (user?.arrests?.length ?? 0) > 0;

  const activeWarns  = user?.casesAsTarget?.filter(c => c.type === 'WARN').length ?? 0;
  const activeFines  = user?.finesReceived?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#070d14] text-white">
      {/* Thin top bar */}
      <div className="h-[2px] bg-gradient-to-r from-[#30d158] via-[#00c8ff] to-[#30d158]" />

      {/* Navbar */}
      <nav className="bg-[#070d14]/90 backdrop-blur-md border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center font-black text-black text-xs">G</div>
            <span className="font-bold text-sm"><span className="text-[#30d158]">GREENVILLE</span> RP</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {session.user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
              )}
              <span className="text-sm text-white/70">{session.user.name}</span>
            </div>
            <Link href="/api/auth/signout" className="text-xs text-white/30 hover:text-white transition-colors">Wyloguj</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">

        {/* ── ALERT: ZATRZYMANY ── */}
        {isArrested && (
          <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-5 flex items-center gap-4">
            <div className="text-3xl">🚔</div>
            <div>
              <div className="font-bold text-red-400">JESTEŚ ZATRZYMANY/A</div>
              <div className="text-sm text-white/60">Twoja postać jest aktualnie zatrzymana przez Policję. Poczekaj na zwolnienie.</div>
            </div>
          </div>
        )}

        {/* ── NIEZWERYFIKOWANY ── */}
        {!isVerified && (
          <div className="bg-[#0d1117] border border-yellow-500/30 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-yellow-400 mb-2">Konto niezweryfikowane</h2>
            <p className="text-white/50 text-sm max-w-md mx-auto mb-6">
              Aby dołączyć do serwera RP i korzystać z panelu gracza, musisz połączyć swoje konto Roblox na naszym serwerze Discord.
            </p>
            <div className="bg-[#070d14] border border-white/8 rounded-lg p-4 text-left max-w-sm mx-auto text-sm space-y-2 mb-6">
              <div className="font-semibold text-white/70 mb-2">Jak dołączyć do serwera RP:</div>
              <div>1. Dołącz do serwera Discord</div>
              <div>2. Przejdź na kanał <span className="text-[#30d158]">#weryfikacja</span></div>
              <div>3. Wpisz komendę <span className="text-[#30d158]">/weryfikacja</span> i podaj nazwę Roblox</div>
              <div>4. Poczekaj na przyjęcie przez staffa</div>
            </div>
            <a
              href="https://discord.gg/greenvillerp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold px-6 py-3 rounded-lg text-sm transition-all"
            >
              Dołącz do serwera →
            </a>
          </div>
        )}

        {/* ── ZWERYFIKOWANY — HEADER ── */}
        {isVerified && (
          <>
            {/* Welcome */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black">
                  Witaj,{' '}
                  <span className="text-[#30d158]">
                    {user?.character ? `${user.character.firstName} ${user.character.lastName}` : session.user.name}
                  </span>!
                </h1>
                <p className="text-white/40 text-sm mt-1">
                  {user?.robloxUsername ? `Roblox: @${user.robloxUsername}` : 'Zweryfikowany gracz'}
                  {isStaff && ' • 🛡️ Staff'}
                  {hasService && ' • 🚔 Służby'}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
                <span className="text-white/40">Online</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Pojazdy"   value={user?.vehicles?.length ?? 0}  color="text-[#30d158]" />
              <StatCard label="Prawa jazdy" value={user?.licenses?.length ?? 0} color="text-[#00c8ff]" />
              <StatCard label="Aktywne warny" value={activeWarns}  color={activeWarns > 0 ? 'text-yellow-400' : 'text-white'} />
              <StatCard label="Mandaty RP" value={activeFines} color={activeFines > 0 ? 'text-red-400' : 'text-white'} />
            </div>

            {/* Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── Postać / Dowód ── */}
              <div className="bg-[#0d1117] border border-white/8 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[#30d158]">🪪</div>
                  <h3 className="font-bold">Moja postać</h3>
                </div>
                {user?.character ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/50">Imię i nazwisko</span>
                      <span className="font-medium">{user.character.firstName} {user.character.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Płeć</span>
                      <span>{user.character.gender}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Nr dokumentu</span>
                      <span className="font-mono text-xs blur-sm hover:blur-none transition-all cursor-pointer" title="Kliknij aby zobaczyć">{user.character.documentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">PESEL</span>
                      <span className="font-mono text-xs blur-sm hover:blur-none transition-all cursor-pointer">{user.character.peselRp}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/40">
                    Nie masz jeszcze postaci. Idź na kanał <span className="text-[#30d158]">#tworzenie-postaci</span> na Discordzie.
                  </div>
                )}
              </div>

              {/* ── Pojazdy ── */}
              <div className="bg-[#0d1117] border border-white/8 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[#30d158]">🚗</div>
                  <h3 className="font-bold">Moje pojazdy</h3>
                </div>
                {user?.vehicles && user.vehicles.length > 0 ? (
                  <div className="space-y-2">
                    {user.vehicles.map(v => (
                      <div key={v.id} className="flex justify-between text-sm">
                        <span>{v.marka} {v.model} ({v.rok})</span>
                        <span className="font-mono text-[#30d158] text-xs">{v.tablica}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/40">
                    Brak zarejestrowanych pojazdów. Użyj kanału <span className="text-[#30d158]">#rejestracja-pojazdu</span>.
                  </div>
                )}
              </div>

              {/* ── Prawa jazdy ── */}
              <div className="bg-[#0d1117] border border-white/8 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[#30d158]">🪪</div>
                  <h3 className="font-bold">Prawa jazdy</h3>
                </div>
                {user?.licenses && user.licenses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {user.licenses.map(l => (
                      <span key={l.id} className="bg-[#30d158]/15 border border-[#30d158]/30 text-[#30d158] text-xs px-3 py-1.5 rounded-full font-medium">
                        ✅ Kategoria {l.kategoria}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/40">Brak aktywnych praw jazdy.</div>
                )}
              </div>

              {/* ── Najbliższa sesja ── */}
              <div className="bg-[#0d1117] border border-white/8 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[#30d158]">🎪</div>
                  <h3 className="font-bold">Najbliższa sesja RP</h3>
                </div>
                {nextSession ? (
                  <div className="space-y-2 text-sm">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      nextSession.status === 'ONGOING'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {nextSession.status === 'ONGOING' ? '🟢 Trwa teraz' : '🔵 Planowana'}
                    </div>
                    <div>
                      {new Date(nextSession.date).toLocaleString('pl-PL', {
                        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    {nextSession.description && (
                      <div className="text-white/50 text-xs">{nextSession.description}</div>
                    )}
                    <div className="text-white/40 text-xs">👥 {nextSession._count.signups} zapisanych</div>
                  </div>
                ) : (
                  <div className="text-sm text-white/40">Brak zaplanowanych sesji. Obserwuj kanał <span className="text-[#30d158]">#sesje</span>.</div>
                )}
              </div>
            </div>

            {/* ── SŁUŻBY panel ── */}
            {hasService && (
              <div className="bg-[#0d1117] border border-[#00c8ff]/20 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[#00c8ff]">🚔</div>
                  <h3 className="font-bold text-[#00c8ff]">Panel Służbowy</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {user?.dutyLogs?.slice(0, 4).map((log, i) => (
                    <div key={i} className="bg-[#070d14] rounded-lg p-3 text-center">
                      <div className={`text-xs font-medium mb-1 ${log.action === 'ON_DUTY' ? 'text-green-400' : 'text-red-400'}`}>
                        {log.action === 'ON_DUTY' ? '🟢 ON' : '🔴 OFF'}
                      </div>
                      <div className="text-xs text-white/50">{log.service}</div>
                      <div className="text-xs text-white/30">{new Date(log.createdAt).toLocaleDateString('pl-PL')}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-white/30">
                  Aby wejść na służbę użyj komendy <span className="text-[#00c8ff]">/duty</span> na Discordzie.
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
}
