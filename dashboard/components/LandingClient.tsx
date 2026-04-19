'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

// ─── Animated number counter ────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 80));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      setCount(cur);
      if (cur >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target]);
  return <>{count.toLocaleString('pl-PL')}{suffix}</>;
}

// ─── Glow border card ───────────────────────────────────────────────────────
function GlowCard({ children, color = '#30d158', className = '' }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl p-px ${className}`}
      style={{ background: `linear-gradient(135deg, ${color}40, transparent 60%, ${color}20)` }}
    >
      <div className="rounded-2xl bg-[#080e18] h-full">
        {children}
      </div>
    </div>
  );
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Ogłoszenie:   { bg: 'bg-blue-500/10',   text: 'text-blue-300',   border: 'border-blue-500/30'   },
  Sesja:        { bg: 'bg-green-500/10',  text: 'text-green-300',  border: 'border-green-500/30'  },
  Aktualizacja: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/30' },
  Ważne:        { bg: 'bg-red-500/10',    text: 'text-red-300',    border: 'border-red-500/30'    },
  Rekrutacja:   { bg: 'bg-yellow-500/10', text: 'text-yellow-300', border: 'border-yellow-500/30' },
  Wydarzenie:   { bg: 'bg-cyan-500/10',   text: 'text-cyan-300',   border: 'border-cyan-500/30'   },
};

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string | null;
  pinned: boolean;
  createdAt: Date | string;
  author: { discordUsername: string };
}

interface Props {
  stats: { memberCount: number; verifiedUsers: number; totalSessions: number; ongoingSession: boolean };
  news: NewsItem[];
  isLoggedIn: boolean;
  userName: string | null;
  userAvatar: string | null;
  accessLevel: number;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function LandingClient({ stats, news, isLoggedIn, userName, userAvatar, accessLevel }: Props) {
  void userAvatar; void accessLevel;

  return (
    <div className="min-h-screen bg-[#050a12] text-white font-sans overflow-x-hidden">

      {/* ── Top neon line ── */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#30d158] to-transparent" />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-[#050a12]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          {/* Logo */}
          <a href="#hero" className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-full bg-[#30d158] blur-md opacity-40" />
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center font-black text-black text-sm">G</div>
            </div>
            <span className="font-black text-base tracking-widest uppercase">
              <span className="text-[#30d158]">Greenville</span>
              <span className="text-white/70"> RP</span>
            </span>
          </a>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'Start', href: '#hero' },
              { label: 'O nas', href: '#about' },
              { label: 'Służby', href: '#sluzby' },
              { label: 'Newsy', href: '#news' },
            ].map(l => (
              <a key={l.href} href={l.href}
                className="text-sm text-white/50 hover:text-white px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
                {l.label}
              </a>
            ))}
            <Link href="/cad"
              className="text-sm text-[#5865F2]/80 hover:text-[#5865F2] px-4 py-2 rounded-lg hover:bg-[#5865F2]/10 transition-all">
              CAD
            </Link>
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <Link href="/portal"
                  className="flex items-center gap-2 text-sm font-semibold text-[#30d158] border border-[#30d158]/30 hover:border-[#30d158]/60 bg-[#30d158]/5 hover:bg-[#30d158]/10 px-4 py-2 rounded-xl transition-all">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                  Mój Panel
                </Link>
                <button onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs text-white/25 hover:text-white/50 px-3 py-2 transition-colors">
                  Wyloguj
                </button>
              </>
            ) : (
              <button onClick={() => signIn('discord')}
                className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[#5865F2]/25">
                <DiscordIcon className="w-4 h-4" />
                Discord
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">

        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(48,209,88,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_80%_90%,rgba(0,200,255,0.07),transparent)]" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'linear-gradient(#30d158 1px,transparent 1px),linear-gradient(90deg,#30d158 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* Scan line */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.15)_2px,rgba(0,0,0,0.15)_4px)]" />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">

          {/* Status badge */}
          <div className="inline-flex items-center gap-2.5 border border-[#30d158]/25 bg-[#30d158]/5 rounded-full px-5 py-2 text-sm text-[#30d158] font-medium mb-10 backdrop-blur-sm">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-60" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-[#30d158]" />
            </span>
            {stats.ongoingSession ? '🟢 Sesja RP aktualnie trwa' : 'Serwer online · Polska #1 Roblox RP'}
          </div>

          {/* Title */}
          <h1 className="text-7xl md:text-[9rem] font-black tracking-tighter leading-none mb-6">
            <span className="block text-white">GREEN</span>
            <span className="block bg-gradient-to-r from-[#30d158] via-[#00e87a] to-[#00c8ff] bg-clip-text text-transparent"
              style={{ filter: 'drop-shadow(0 0 40px rgba(48,209,88,0.4))' }}>
              VILLE
            </span>
            <span className="block text-white/20 text-4xl md:text-5xl font-bold tracking-[0.5em] mt-2">ROLEPLAY</span>
          </h1>

          {/* Description */}
          <p className="text-white/45 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Największy polski serwer Roleplay na platformie Roblox.<br />
            Stwórz postać, zdobądź pracę, patroluj ulice lub buduj swoje imperium.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer"
              className="group inline-flex items-center gap-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all shadow-2xl shadow-[#5865F2]/30 hover:shadow-[#5865F2]/50 hover:-translate-y-0.5">
              <DiscordIcon className="w-5 h-5" />
              Dołącz do Discord
              <span className="text-white/50 group-hover:translate-x-0.5 transition-transform">→</span>
            </a>
            {isLoggedIn ? (
              <Link href="/portal"
                className="inline-flex items-center gap-3 border border-[#30d158]/40 hover:border-[#30d158]/80 bg-[#30d158]/5 hover:bg-[#30d158]/10 text-[#30d158] font-bold px-8 py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5">
                ▶ Mój Panel gracza
              </Link>
            ) : (
              <button onClick={() => signIn('discord')}
                className="inline-flex items-center gap-3 border border-[#30d158]/40 hover:border-[#30d158]/80 bg-[#30d158]/5 hover:bg-[#30d158]/10 text-[#30d158] font-bold px-8 py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5">
                ▶ Mój Panel gracza
              </button>
            )}
            <Link href="/cad"
              className="inline-flex items-center gap-3 border border-[#5865F2]/30 hover:border-[#5865F2]/60 bg-[#5865F2]/5 hover:bg-[#5865F2]/10 text-[#818cf8] font-bold px-8 py-4 rounded-2xl text-sm transition-all hover:-translate-y-0.5">
              🚨 Otwórz CAD
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
            {[
              { label: 'Członkowie Discord', value: stats.memberCount,  suffix: '+', color: '#30d158' },
              { label: 'Zweryfikowani gracze', value: stats.verifiedUsers, suffix: '',  color: '#00c8ff' },
              { label: 'Sesje RP',            value: stats.totalSessions, suffix: '',  color: '#818cf8' },
              { label: 'Uptime',               value: 99,                  suffix: '%', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label}
                className="relative rounded-2xl p-px"
                style={{ background: `linear-gradient(135deg, ${s.color}30, transparent)` }}>
                <div className="rounded-2xl bg-[#080e18] px-4 py-4 text-center">
                  <div className="text-2xl md:text-3xl font-black mb-1" style={{ color: s.color }}>
                    <AnimatedCounter target={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-[10px] text-white/35 uppercase tracking-wider">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050a12] to-transparent" />
      </section>

      {/* ── CAD Section ── */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(88,101,242,0.06),transparent)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-full px-4 py-1.5 text-xs text-[#818cf8] font-mono uppercase tracking-widest mb-4">
              ◈ Panel CAD
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Centrum{' '}
              <span className="bg-gradient-to-r from-[#5865F2] to-[#818cf8] bg-clip-text text-transparent">
                Dowodzenia
              </span>
            </h2>
            <p className="text-white/40 max-w-lg mx-auto text-base">
              Pełny system zarządzania służbami w czasie rzeczywistym. Dostępny dla każdej roli — od Cywila po Admina.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { icon: '🚨', title: 'Zgłoszenia 112',    desc: 'System priorytetów CRITICAL / HIGH / MEDIUM / LOW w czasie rzeczywistym.',  color: '#ef4444' },
              { icon: '🚓', title: 'Jednostki online',   desc: 'Callsign, status i lokalizacja wszystkich aktywnych służb na żywo.',         color: '#3b82f6' },
              { icon: '📡', title: 'Radio służbowe',     desc: 'Kanały per służba — Dyspozytornia, ALFA, BRAVO, EMS, Straż i więcej.',       color: '#818cf8' },
              { icon: '💬', title: 'Proximity Chat',     desc: 'Czat lokacyjny — rozmawiaj z graczami w tej samej lokacji na mapie.',        color: '#30d158' },
            ].map(f => (
              <GlowCard key={f.title} color={f.color}>
                <div className="p-5 h-full">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl mb-4"
                    style={{ background: f.color + '15', border: `1px solid ${f.color}30` }}>
                    {f.icon}
                  </div>
                  <div className="font-bold text-white mb-2 text-sm">{f.title}</div>
                  <div className="text-xs text-white/40 leading-relaxed">{f.desc}</div>
                </div>
              </GlowCard>
            ))}
          </div>

          <div className="text-center">
            <Link href="/cad"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-[#30d158] to-[#00c8ff] text-black font-black px-10 py-4 rounded-2xl text-sm transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-2xl shadow-[#30d158]/20">
              Otwórz CAD →
            </Link>
            <p className="text-white/20 text-xs mt-3">Zaloguj się przez Discord aby uzyskać dostęp do swojej roli</p>
          </div>
        </div>
      </section>

      {/* ── O nas ── */}
      <section id="about" className="py-28 px-6 relative bg-[#070d17]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_20%_50%,rgba(48,209,88,0.04),transparent)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#30d158]/10 border border-[#30d158]/20 rounded-full px-4 py-1.5 text-xs text-[#30d158] font-mono uppercase tracking-widest mb-4">
              ◈ O serwerze
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Czym jest <span className="text-[#30d158]">Greenville RP</span>?
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Pełnoprawny serwer Roleplay na Roblox. Stwórz postać, zarejestruj pojazd, zdobądź pracę i żyj w mieście.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: '🪪', title: 'Tożsamość RP',        desc: 'Dowód osobisty, PESEL, konto bankowe i unikalna historia postaci.',     color: '#30d158' },
              { icon: '🚔', title: 'Służby mundurowe',    desc: 'Policja, EMS, Straż, DOT — złóż podanie i zacznij patrolować.',        color: '#3b82f6' },
              { icon: '🚗', title: 'Pojazdy i licencje',  desc: 'Rejestracja aut, kategorie praw jazdy, mandaty i kontrole drogowe.',    color: '#f59e0b' },
              { icon: '⚖️', title: 'System prawny',       desc: 'Mandaty, areszty, sprawy — pełen kodeks karny RP.',                    color: '#ef4444' },
              { icon: '📱', title: 'Telefon RP',           desc: 'Własny numer, połączenia, SMS-y do innych graczy na żywo.',            color: '#a855f7' },
              { icon: '🎪', title: 'Sesje RP',             desc: 'Regularne sesje organizowane przez Hostów z zapisami i ogłoszeniami.', color: '#00c8ff' },
            ].map(f => (
              <div key={f.title}
                className="group relative rounded-2xl p-px transition-all duration-300 hover:-translate-y-1"
                style={{ background: `linear-gradient(135deg, transparent, ${f.color}15, transparent)` }}>
                <div className="rounded-2xl bg-[#070d17] border border-white/[0.06] group-hover:border-white/10 p-6 h-full transition-colors">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <div className="font-bold text-white mb-2 group-hover:text-[#30d158] transition-colors">{f.title}</div>
                  <div className="text-sm text-white/40 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Służby ── */}
      <section id="sluzby" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,rgba(0,200,255,0.05),transparent)]" />
        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#00c8ff]/10 border border-[#00c8ff]/20 rounded-full px-4 py-1.5 text-xs text-[#00c8ff] font-mono uppercase tracking-widest mb-4">
              ◈ Służby mundurowe
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Dołącz do <span className="text-[#00c8ff]">służb</span>
            </h2>
            <p className="text-white/40 max-w-lg mx-auto">
              Każda służba ma własny panel CAD, procedury i możliwości. Złóż podanie przez bot Discord.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: '🚔', name: 'Policja',        tag: 'FVMPD / OCSO / WSP', color: '#3b82f6',  desc: 'Utrzymuj porządek i ścigaj przestępców' },
              { icon: '🚑', name: 'EMS',             tag: 'Fox Mountain Medical', color: '#ec4899', desc: 'Ratuj życie i udzielaj pomocy medycznej' },
              { icon: '🚒', name: 'Straż Pożarna',  tag: 'BFD / GFR',           color: '#f97316', desc: 'Gaś pożary i ratuj uwięzionych' },
              { icon: '🚧', name: 'DOT',             tag: 'Wisconsin DOT',        color: '#f59e0b', desc: 'Zarządzaj ruchem i drogami' },
              { icon: '📡', name: 'Dyspozytornia',  tag: 'OCC',                  color: '#818cf8', desc: 'Koordynuj wszystkie służby' },
            ].map(s => (
              <div key={s.name}
                className="group relative rounded-2xl p-px transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ background: `linear-gradient(160deg, ${s.color}40, transparent 60%)` }}>
                <div className="rounded-2xl bg-[#050a12] border border-white/[0.05] p-5 h-full text-center">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{s.icon}</div>
                  <div className="font-black text-white mb-1">{s.name}</div>
                  <div className="text-[10px] font-mono mb-3 opacity-50" style={{ color: s.color }}>{s.tag}</div>
                  <div className="text-xs text-white/35 leading-snug">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-2xl px-6 py-3 text-sm text-white/40">
              Wejdź na Discord i użyj{' '}
              <code className="text-[#00c8ff] bg-[#00c8ff]/10 px-2 py-0.5 rounded-md font-mono text-xs">/aplikuj</code>{' '}
              aby złożyć podanie
            </div>
          </div>
        </div>
      </section>

      {/* ── Newsy ── */}
      <section id="news" className="py-28 px-6 bg-[#070d17]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-[#30d158]/10 border border-[#30d158]/20 rounded-full px-4 py-1.5 text-xs text-[#30d158] font-mono uppercase tracking-widest mb-4">
              ◈ Aktualności
            </div>
            <h2 className="text-4xl md:text-5xl font-black">
              Najnowsze <span className="text-[#30d158]">ogłoszenia</span>
            </h2>
          </div>

          {news.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-center text-3xl mx-auto mb-4">📋</div>
              <p className="text-white/30 mb-4">Brak ogłoszeń — sprawdź nasz Discord po najnowsze informacje.</p>
              <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer"
                className="text-sm text-[#5865F2] hover:text-[#818cf8] transition-colors">
                Przejdź na Discord →
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {news.map((n) => {
                  const col = CATEGORY_COLORS[n.category] ?? { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10' };
                  return (
                    <div key={n.id}
                      className={`group rounded-2xl border bg-[#070d17] hover:-translate-y-1 transition-all duration-300 overflow-hidden ${n.pinned ? 'border-[#30d158]/25' : 'border-white/[0.06]'}`}>
                      {n.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.imageUrl} alt={n.title} className="w-full h-36 object-cover" />
                      )}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          {n.pinned && <span className="text-[#30d158] text-xs">📌</span>}
                          <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${col.bg} ${col.text} ${col.border}`}>
                            {n.category}
                          </span>
                          <span className="text-xs text-white/25 ml-auto">{formatDate(n.createdAt)}</span>
                        </div>
                        <div className="font-bold text-white mb-2 group-hover:text-[#30d158] transition-colors leading-snug">{n.title}</div>
                        <div className="text-sm text-white/40 line-clamp-3 leading-relaxed">{n.content}</div>
                        <div className="text-xs text-white/20 mt-3 pt-3 border-t border-white/[0.05]">— {n.author.discordUsername}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mt-8">
                <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer"
                  className="text-sm text-white/30 hover:text-[#30d158] transition-colors">
                  Więcej ogłoszeń na Discordzie →
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(88,101,242,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(88,101,242,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,101,242,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 rounded-full bg-[#5865F2] blur-2xl opacity-30" />
            <div className="relative w-20 h-20 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center">
              <DiscordIcon className="w-10 h-10 text-[#5865F2]" />
            </div>
          </div>

          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Zaloguj się przez{' '}
            <span className="text-[#5865F2]">Discord</span>
          </h2>
          <p className="text-white/40 mb-10 leading-relaxed">
            Bot automatycznie zsynchronizuje Twoje role. Zyskasz dostęp do panelu gracza,<br className="hidden md:block" />
            portalu służb i systemu CAD dostosowanego do Twojej roli.
          </p>

          {isLoggedIn ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 text-[#30d158] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
                Zalogowany jako {userName}
              </div>
              <Link href="/portal"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-[#30d158] to-[#00c8ff] text-black font-black px-10 py-4 rounded-2xl text-sm transition-all hover:opacity-90 hover:-translate-y-0.5 shadow-2xl shadow-[#30d158]/20">
                Otwórz Mój Panel →
              </Link>
            </div>
          ) : (
            <button onClick={() => signIn('discord')}
              className="inline-flex items-center gap-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black px-12 py-5 rounded-2xl text-base transition-all hover:-translate-y-0.5 shadow-2xl shadow-[#5865F2]/30">
              <DiscordIcon className="w-6 h-6" />
              Zaloguj się z Discord
            </button>
          )}

          <p className="text-white/15 text-xs mt-6">
            Synchronizacja ról następuje automatycznie po zalogowaniu.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.05] px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center font-black text-black text-xs">G</div>
            <span className="font-bold text-sm">
              <span className="text-[#30d158]">GREENVILLE</span>
              <span className="text-white/40"> RP</span>
            </span>
          </div>
          <div className="text-xs text-white/20">
            © {new Date().getFullYear()} Greenville RP · Wszelkie prawa zastrzeżone
          </div>
          <div className="flex gap-5 text-xs text-white/25">
            <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Discord</a>
            <Link href="/cad" className="hover:text-[#5865F2] transition-colors">CAD</Link>
            <Link href="/login" className="hover:text-white transition-colors">Logowanie</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.053a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}
