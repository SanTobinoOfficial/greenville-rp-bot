'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

// ─── Animated number counter ────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const duration = 2000;
    const step = Math.max(1, Math.ceil(target / (duration / 16)));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target]);

  return <span ref={ref}>{count.toLocaleString('pl-PL')}{suffix}</span>;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Ogłoszenie:   { bg: 'bg-blue-500/15',   text: 'text-blue-300'   },
  Sesja:        { bg: 'bg-green-500/15',  text: 'text-green-300'  },
  Aktualizacja: { bg: 'bg-purple-500/15', text: 'text-purple-300' },
  Ważne:        { bg: 'bg-red-500/15',    text: 'text-red-300'    },
  Rekrutacja:   { bg: 'bg-yellow-500/15', text: 'text-yellow-300' },
  Wydarzenie:   { bg: 'bg-cyan-500/15',   text: 'text-cyan-300'   },
};

// ─── Props ───────────────────────────────────────────────────────────────────
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
  stats: {
    memberCount: number;
    verifiedUsers: number;
    totalSessions: number;
    ongoingSession: boolean;
  };
  news: NewsItem[];
  isLoggedIn: boolean;
  userName: string | null;
  userAvatar: string | null;
  accessLevel: number;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function LandingClient({ stats, news, isLoggedIn, userName, userAvatar, accessLevel }: Props) {
  // suppress unused warnings — reserved for future use
  void userAvatar; void accessLevel;

  const navLinks = [
    { label: 'Start',    href: '#hero'   },
    { label: 'O nas',    href: '#about'  },
    { label: 'Służby',   href: '#sluzby' },
    { label: 'Newsy',    href: '#news'   },
  ];

  return (
    <div className="min-h-screen bg-[#070d14] text-white font-sans overflow-x-hidden">

      {/* ── Thin accent bar ── */}
      <div className="h-[2px] bg-gradient-to-r from-[#30d158] via-[#00c8ff] to-[#30d158]" />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-[#070d14]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center font-black text-black text-sm shadow-lg shadow-[#30d158]/30">
              G
            </div>
            <span className="font-bold text-lg tracking-wide">
              <span className="text-[#30d158]">GREENVILLE</span>
              <span className="text-white"> RP</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="text-sm text-white/60 hover:text-[#30d158] transition-colors font-medium">
                {l.label}
              </a>
            ))}
            <Link href="/cad" className="text-sm text-white/60 hover:text-[#5865F2] transition-colors font-medium">
              CAD
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                {/* Portal gracza — dla wszystkich */}
                <Link
                  href="/portal"
                  className="hidden sm:inline-flex items-center gap-2 bg-[#30d158]/15 hover:bg-[#30d158]/25 text-[#30d158] border border-[#30d158]/30 text-sm font-medium px-4 py-2 rounded-lg transition-all"
                >
                  Mój Panel
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  Wyloguj
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-lg shadow-[#5865F2]/30"
              >
                <DiscordIcon className="w-4 h-4" />
                Login z Discord
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="hero" className="relative min-h-[88vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(48,209,88,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(0,200,255,0.05)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(48,209,88,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(48,209,88,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

        <div className="relative text-center px-6 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#30d158]/10 border border-[#30d158]/25 rounded-full px-4 py-1.5 text-sm text-[#30d158] font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
            {stats.ongoingSession ? 'Sesja RP aktywna' : 'Serwer aktywny'}
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-6 leading-none">
            <span className="text-white">GREENVILLE</span>
            <br />
            <span className="bg-gradient-to-r from-[#30d158] to-[#00c8ff] bg-clip-text text-transparent">
              ROLEPLAY
            </span>
          </h1>

          <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Największy polski serwer Roleplay na Roblox. Dołącz, buduj swoją postać,
            zdobywaj uprawnienia i kształtuj miasto Greenville!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
            <a
              href="https://discord.gg/BU8EBPsYXV"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold px-8 py-4 rounded-xl text-sm transition-all shadow-xl shadow-[#5865F2]/30 hover:scale-105"
            >
              <DiscordIcon className="w-5 h-5" />
              Dołącz do Discord
            </a>
            {isLoggedIn ? (
              <Link
                href="/portal"
                className="inline-flex items-center gap-2 bg-[#30d158]/15 hover:bg-[#30d158]/25 text-[#30d158] font-bold px-8 py-4 rounded-xl text-sm transition-all border border-[#30d158]/30 hover:scale-105"
              >
                ▶ Mój Panel gracza
              </Link>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="inline-flex items-center gap-2 bg-[#30d158]/15 hover:bg-[#30d158]/25 text-[#30d158] font-bold px-8 py-4 rounded-xl text-sm transition-all border border-[#30d158]/30 hover:scale-105"
              >
                ▶ Mój Panel gracza
              </button>
            )}
            {isLoggedIn && (
              <Link
                href="/cad"
                className="inline-flex items-center gap-2 bg-[#5865F2]/15 hover:bg-[#5865F2]/25 text-[#818cf8] font-bold px-8 py-4 rounded-xl text-sm transition-all border border-[#5865F2]/30 hover:scale-105"
              >
                🚨 Otwórz CAD
              </Link>
            )}
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: 'Członkowie Discord',    value: stats.memberCount,  suffix: '+' },
              { label: 'Zweryfikowani gracze',  value: stats.verifiedUsers, suffix: '' },
              { label: 'Przeprowadzone sesje',  value: stats.totalSessions, suffix: '' },
              { label: 'Uptime serwera',        value: 99,                  suffix: '%' },
            ].map(s => (
              <div key={s.label} className="bg-white/3 border border-white/8 rounded-xl p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-black text-[#30d158]">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAD Preview Section ── */}
      <section className="py-24 px-6 bg-[#0d1117]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[#5865F2] text-xs font-mono uppercase tracking-widest mb-3">PANEL CAD</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Panel CAD —{' '}
              <span className="bg-gradient-to-r from-[#5865F2] to-[#818cf8] bg-clip-text text-transparent">
                Centrum Dowodzenia
              </span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-base leading-relaxed">
              Pełny system zarządzania służbami w czasie rzeczywistym. Zgłoszenia, units, radio, proximity chat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              {
                icon: '🚨',
                title: 'Zgłoszenia 112',
                desc: 'Twórz i zarządzaj zgłoszeniami w czasie rzeczywistym. System priorytetów CRITICAL / HIGH / MEDIUM / LOW.',
                color: '#ef4444',
              },
              {
                icon: '🚓',
                title: 'Jednostki online',
                desc: 'Podgląd wszystkich aktywnych jednostek z ich statusem i callsignem na żywo.',
                color: '#3b82f6',
              },
              {
                icon: '📡',
                title: 'Kanały radiowe',
                desc: 'Radio per służba — DYSPOZYTORNIA, ALFA, BRAVO, EMS, STRAŻ i więcej.',
                color: '#818cf8',
              },
              {
                icon: '💬',
                title: 'Proximity Chat',
                desc: 'Czat lokacyjny — rozmawiaj z graczami w tej samej lokacji na mapie Greenville.',
                color: '#22c55e',
              },
            ].map(f => (
              <div
                key={f.title}
                className="bg-[#070d14] border border-white/8 rounded-xl p-5 hover:border-white/16 transition-all group"
                style={{ boxShadow: `0 0 24px ${f.color}08` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4 transition-all group-hover:scale-110"
                  style={{ background: f.color + '20', border: `1px solid ${f.color}30` }}
                >
                  {f.icon}
                </div>
                <div className="font-bold text-white mb-2 text-sm">{f.title}</div>
                <div className="text-xs text-white/50 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/cad"
              className="inline-flex items-center gap-3 bg-[#22c55e] hover:bg-[#16a34a] text-black font-black px-10 py-4 rounded-xl text-base transition-all shadow-xl shadow-[#22c55e]/25 hover:scale-105"
            >
              Otwórz CAD →
            </Link>
            <p className="text-white/25 text-xs mt-3">Zaloguj się przez Discord aby korzystać ze wszystkich funkcji</p>
          </div>
        </div>
      </section>

      {/* ── O nas ── */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[#30d158] text-xs font-mono uppercase tracking-widest mb-3">O SERWERZE</div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Czym jest <span className="text-[#30d158]">Greenville RP</span>?
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Pełnoprawny serwer Roleplay oparty na grze Roblox. Stwórz postać, zarejestruj pojazd, zdobądź pracę i żyj w mieście Greenville!
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '🪪', title: 'Tożsamość RP',       desc: 'Stwórz unikalną postać z dowodem osobistym, PESEL-em i historią.' },
              { icon: '🚔', title: 'Służby mundurowe',   desc: 'Dołącz do Policji, EMS, Straży Pożarnej lub DOT i patroluj ulice.' },
              { icon: '🚗', title: 'Rejestracja pojazdów', desc: 'Zarejestruj swój samochód, zdobądź prawo jazdy i korzystaj z dróg legalnie.' },
              { icon: '⚖️', title: 'System prawny',      desc: 'Mandaty, grzywny, areszty — pełen system prawny inspirowany rzeczywistością.' },
              { icon: '📱', title: 'Telefon RP',          desc: 'Dzwoń i pisz SMS-y do innych graczy przez własny numer telefonu.' },
              { icon: '🎪', title: 'Sesje RP',            desc: 'Regularne sesje organizowane przez Hostów z ogłoszeniami i zapisami.' },
            ].map(f => (
              <div key={f.title} className="bg-[#0d1117] border border-white/8 rounded-xl p-6 hover:border-[#30d158]/30 transition-all group">
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="font-bold text-white mb-2 group-hover:text-[#30d158] transition-colors">{f.title}</div>
                <div className="text-sm text-white/50">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Służby ── */}
      <section id="sluzby" className="py-24 px-6 bg-[#0a0f18]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[#00c8ff] text-xs font-mono uppercase tracking-widest mb-3">SŁUŻBY</div>
            <h2 className="text-4xl font-black">Dołącz do <span className="text-[#00c8ff]">służb mundurowych</span></h2>
            <p className="text-white/50 mt-3 max-w-lg mx-auto">Każda służba ma własny panel, procedury i możliwości. Złóż podanie przez bot Discord.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: '🚔', name: 'Policja',       color: '#003087', desc: 'Utrzymuj porządek' },
              { icon: '🚑', name: 'EMS',           color: '#c0392b', desc: 'Ratuj życie' },
              { icon: '🚒', name: 'Straż Pożarna', color: '#e74c3c', desc: 'Gaś pożary' },
              { icon: '🚧', name: 'DOT',           color: '#e67e22', desc: 'Zarządzaj drogami' },
              { icon: '🚕', name: 'Taksówkarz',    color: '#f1c40f', desc: 'Przewoź pasażerów' },
            ].map(s => (
              <div
                key={s.name}
                className="bg-[#0d1117] border border-white/8 rounded-xl p-5 text-center hover:scale-105 transition-all cursor-default"
                style={{ boxShadow: `0 0 20px ${s.color}15` }}
              >
                <div className="text-3xl mb-2">{s.icon}</div>
                <div className="font-bold text-sm mb-1">{s.name}</div>
                <div className="text-xs text-white/40">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-sm text-white/40">Wejdź na Discord i użyj komendy <code className="text-[#00c8ff]">/aplikuj</code> aby złożyć podanie</p>
          </div>
        </div>
      </section>

      {/* ── Newsy ── */}
      <section id="news" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[#30d158] text-xs font-mono uppercase tracking-widest mb-3">AKTUALNOŚCI</div>
            <h2 className="text-4xl font-black">Najnowsze <span className="text-[#30d158]">ogłoszenia</span></h2>
          </div>

          {news.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-lg">Brak ogłoszeń — sprawdź nasz Discord po najnowsze informacje.</p>
              <a
                href="https://discord.gg/BU8EBPsYXV"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm text-[#5865F2] hover:underline"
              >
                Przejdź na Discord →
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {news.map((n) => {
                  const colors = CATEGORY_COLORS[n.category] ?? { bg: 'bg-white/10', text: 'text-white/60' };
                  return (
                    <div
                      key={n.id}
                      className={`bg-[#0d1117] border rounded-xl p-5 hover:border-[#30d158]/50 transition-all hover:-translate-y-0.5 ${
                        n.pinned ? 'border-[#30d158]/30' : 'border-white/8'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {n.pinned && <span className="text-[#30d158] text-xs">📌</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                          {n.category}
                        </span>
                        <span className="text-xs text-white/30 ml-auto">{formatDate(n.createdAt)}</span>
                      </div>
                      {n.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={n.imageUrl} alt={n.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                      )}
                      <div className="font-semibold text-white mb-1">{n.title}</div>
                      <div className="text-sm text-white/50 line-clamp-3">{n.content}</div>
                      <div className="text-xs text-white/20 mt-3">— {n.author.discordUsername}</div>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mt-8">
                <a
                  href="https://discord.gg/BU8EBPsYXV"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/40 hover:text-[#30d158] transition-colors"
                >
                  Więcej ogłoszeń na Discordzie →
                </a>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── CTA Login ── */}
      <section className="py-24 px-6 bg-[#0a0f18]">
        <div className="max-w-2xl mx-auto text-center">
          <DiscordIcon className="w-16 h-16 mx-auto text-[#5865F2] mb-6" />
          <h2 className="text-3xl font-black mb-4">
            Zaloguj się <span className="text-[#5865F2]">Discordem</span>
          </h2>
          <p className="text-white/50 mb-8">
            Bot automatycznie zsynchronizuje Twoje role z serwera Discord.
            Zyskasz dostęp do panelu gracza dopasowanego do Twojej roli.
          </p>
          {isLoggedIn ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-[#30d158] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" />
                Zalogowany jako {userName}
              </div>
              <Link
                href="/portal"
                className="inline-flex items-center gap-2 bg-[#30d158] hover:bg-[#27ae60] text-black font-bold px-8 py-4 rounded-xl text-sm transition-all shadow-xl shadow-[#30d158]/30"
              >
                Otwórz Mój Panel →
              </Link>
            </div>
          ) : (
            <button
              onClick={() => signIn('discord')}
              className="inline-flex items-center gap-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold px-10 py-4 rounded-xl text-base transition-all shadow-xl shadow-[#5865F2]/30 hover:scale-105"
            >
              <DiscordIcon className="w-5 h-5" />
              Zaloguj się z Discord
            </button>
          )}
          <div className="mt-4 text-xs text-white/20">
            Synchronizacja ról następuje automatycznie po zalogowaniu.
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#30d158] to-[#00c8ff] flex items-center justify-center font-black text-black text-xs">
              G
            </div>
            <span className="font-bold text-sm"><span className="text-[#30d158]">GREENVILLE</span> RP</span>
          </div>
          <div className="text-xs text-white/30">
            © {new Date().getFullYear()} Greenville RP. Wszelkie prawa zastrzeżone.
          </div>
          <div className="flex gap-4 text-xs text-white/30">
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
