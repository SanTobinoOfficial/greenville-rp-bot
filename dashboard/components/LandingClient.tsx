'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

// ─── Animated counter ───────────────────────────────────────────────────────
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!to) return;
    let n = 0;
    const step = Math.max(1, Math.ceil(to / 60));
    const t = setInterval(() => { n = Math.min(n + step, to); setV(n); if (n >= to) clearInterval(t); }, 20);
    return () => clearInterval(t);
  }, [to]);
  return <>{v.toLocaleString('pl-PL')}{suffix}</>;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface NewsItem {
  id: string; title: string; content: string; category: string;
  imageUrl: string | null; pinned: boolean; createdAt: Date | string;
  author: { discordUsername: string };
}
interface Props {
  stats: { memberCount: number; verifiedUsers: number; totalSessions: number; ongoingSession: boolean };
  news: NewsItem[];
  isLoggedIn: boolean; userName: string | null; userAvatar: string | null; accessLevel: number;
}

const NEWS_COLORS: Record<string, string> = {
  Ogłoszenie: '#3b82f6', Sesja: '#30d158', Aktualizacja: '#a855f7',
  Ważne: '#ef4444', Rekrutacja: '#f59e0b', Wydarzenie: '#00c8ff',
};

function ago(d: Date | string) {
  return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function LandingClient({ stats, news, isLoggedIn, userName }: Props) {
  return (
    <div style={{ background: '#04080f', color: '#fff', fontFamily: "'Inter', sans-serif", overflowX: 'hidden' }}>

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(4,8,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(48,209,88,0.12)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <a href="#hero" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #30d158, #00c8ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, color: '#000', fontSize: 14,
              boxShadow: '0 0 16px rgba(48,209,88,0.5)',
            }}>G</div>
            <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              <span style={{ color: '#30d158' }}>Greenville</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}> RP</span>
            </span>
          </a>

          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {[['Start','#hero'],['O nas','#about'],['Służby','#sluzby'],['Newsy','#news']].map(([l,h]) => (
              <a key={h} href={h} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                {l}
              </a>
            ))}
            <Link href="/cad" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, color: '#818cf8', textDecoration: 'none' }}>CAD</Link>
          </div>

          {/* Auth */}
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link href="/portal" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                color: '#30d158', border: '1px solid rgba(48,209,88,0.35)',
                background: 'rgba(48,209,88,0.06)', textDecoration: 'none',
                boxShadow: '0 0 12px rgba(48,209,88,0.08)',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#30d158', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Mój Panel
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'pointer' }}>
                Wyloguj
              </button>
            </div>
          ) : (
            <button onClick={() => signIn('discord')} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(88,101,242,0.4)',
            }}>
              <DiscordIcon size={16} /> Discord
            </button>
          )}
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section id="hero" style={{ position: 'relative', minHeight: '92vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Radial glow blobs */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(48,209,88,0.13) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 50% at 85% 80%, rgba(0,200,255,0.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 40% at 10% 60%, rgba(88,101,242,0.06) 0%, transparent 60%)' }} />
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(#30d158 1px,transparent 1px),linear-gradient(90deg,#30d158 1px,transparent 1px)',
          backgroundSize: '64px 64px',
        }} />

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: 900, margin: '0 auto' }}>
          {/* Live badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600,
            border: '1px solid rgba(48,209,88,0.3)', background: 'rgba(48,209,88,0.06)',
            color: '#30d158', marginBottom: 36, letterSpacing: '0.05em',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#30d158', display: 'inline-block', boxShadow: '0 0 8px #30d158' }} />
            {stats.ongoingSession ? '🟢 Sesja RP aktualnie trwa' : 'Serwer online · Polska #1 Roblox RP'}
          </div>

          {/* Title */}
          <h1 style={{ margin: '0 0 20px', lineHeight: 0.9, letterSpacing: '-0.04em', fontWeight: 900 }}>
            <span style={{ display: 'block', fontSize: 'clamp(72px, 14vw, 144px)', color: '#fff', textShadow: '0 0 80px rgba(255,255,255,0.1)' }}>
              GREEN
            </span>
            <span style={{
              display: 'block', fontSize: 'clamp(72px, 14vw, 144px)',
              background: 'linear-gradient(90deg, #30d158, #00e87a, #00c8ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(48,209,88,0.6))',
            }}>
              VILLE
            </span>
            <span style={{ display: 'block', fontSize: 'clamp(16px, 3vw, 28px)', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.6em', fontWeight: 700, marginTop: 8 }}>
              ROLEPLAY
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 44px', fontWeight: 400 }}>
            Największy polski serwer Roleplay na Roblox.<br />
            Stwórz postać, zdobądź pracę lub buduj swoje imperium.
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 64 }}>
            <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 28px', borderRadius: 12, fontWeight: 800, fontSize: 14,
              background: '#5865F2', color: '#fff', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(88,101,242,0.45), 0 0 0 1px rgba(88,101,242,0.5)',
              transition: 'transform .15s, box-shadow .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(88,101,242,0.6), 0 0 0 1px rgba(88,101,242,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(88,101,242,0.45), 0 0 0 1px rgba(88,101,242,0.5)'; }}>
              <DiscordIcon size={17} /> Dołącz do Discord
            </a>
            {isLoggedIn ? (
              <Link href="/portal" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                color: '#30d158', textDecoration: 'none',
                border: '1px solid rgba(48,209,88,0.4)', background: 'rgba(48,209,88,0.07)',
                boxShadow: '0 8px 24px rgba(48,209,88,0.15)',
              }}>▶ Mój Panel gracza</Link>
            ) : (
              <button onClick={() => signIn('discord')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 12, fontWeight: 800, fontSize: 14,
                color: '#30d158', border: '1px solid rgba(48,209,88,0.4)',
                background: 'rgba(48,209,88,0.07)', cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(48,209,88,0.15)',
              }}>▶ Mój Panel gracza</button>
            )}
            <Link href="/cad" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '13px 28px', borderRadius: 12, fontWeight: 800, fontSize: 14,
              color: '#818cf8', textDecoration: 'none',
              border: '1px solid rgba(129,140,248,0.35)', background: 'rgba(129,140,248,0.07)',
              boxShadow: '0 8px 24px rgba(129,140,248,0.12)',
            }}>🚨 Otwórz CAD</Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 720, margin: '0 auto' }}>
            {[
              { label: 'Członkowie Discord', v: stats.memberCount, sfx: '+', c: '#30d158' },
              { label: 'Zweryfikowani gracze', v: stats.verifiedUsers, sfx: '', c: '#00c8ff' },
              { label: 'Sesje RP', v: stats.totalSessions, sfx: '', c: '#818cf8' },
              { label: 'Uptime', v: 99, sfx: '%', c: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 14,
                border: `1px solid ${s.c}25`, padding: '16px 12px', textAlign: 'center',
                boxShadow: `0 0 24px ${s.c}12, inset 0 0 24px ${s.c}06`,
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.c, lineHeight: 1, textShadow: `0 0 20px ${s.c}80` }}>
                  <Counter to={s.v} suffix={s.sfx} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(transparent, #04080f)', pointerEvents: 'none' }} />
      </section>

      {/* ══ CAD SECTION ═════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: '#070d17', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(88,101,242,0.07) 0%, transparent 70%)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', color: '#818cf8', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>◈ Panel CAD</div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.03em' }}>
              Centrum <span style={{ color: '#818cf8', textShadow: '0 0 30px rgba(129,140,248,0.5)' }}>Dowodzenia</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
              Pełny system zarządzania służbami w czasie rzeczywistym dla każdej roli.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 48 }}>
            {[
              { icon: '🚨', title: 'Zgłoszenia 112',   desc: 'System priorytetów CRITICAL / HIGH / MEDIUM / LOW.',             c: '#ef4444' },
              { icon: '🚓', title: 'Jednostki online',  desc: 'Callsign i status wszystkich aktywnych służb na żywo.',           c: '#3b82f6' },
              { icon: '📡', title: 'Radio służbowe',    desc: 'Kanały DYSPOZYTORNIA, ALFA, BRAVO, EMS, Straż i więcej.',        c: '#818cf8' },
              { icon: '💬', title: 'Proximity Chat',    desc: 'Czat lokacyjny — rozmawiaj z graczami na mapie Greenville.',     c: '#30d158' },
            ].map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.025)', borderRadius: 16,
                border: `1px solid ${f.c}30`, padding: 24,
                boxShadow: `0 4px 32px ${f.c}15, 0 0 0 1px ${f.c}10`,
                transition: 'transform .2s, box-shadow .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 40px ${f.c}30, 0 0 0 1px ${f.c}25`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 32px ${f.c}15, 0 0 0 1px ${f.c}10`; }}>
                <div style={{ fontSize: 28, marginBottom: 14, filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#fff' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <Link href="/cad" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '14px 36px', borderRadius: 12, fontWeight: 800, fontSize: 15,
              background: 'linear-gradient(90deg, #30d158, #00c8ff)',
              color: '#000', textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(48,209,88,0.3)',
            }}>Otwórz CAD →</Link>
          </div>
        </div>
      </section>

      {/* ══ O NAS ════════════════════════════════════════════════════════════ */}
      <section id="about" style={{ padding: '100px 24px', position: 'relative' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', color: '#30d158', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>◈ O serwerze</div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.03em' }}>
              Czym jest <span style={{ color: '#30d158', textShadow: '0 0 30px rgba(48,209,88,0.5)' }}>Greenville RP</span>?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>
              Pełnoprawny serwer Roleplay na Roblox — stwórz postać, zdobądź pracę i żyj w mieście.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            {[
              { icon: '🪪', title: 'Tożsamość RP',        desc: 'Dowód osobisty, PESEL, konto bankowe i unikalna historia postaci.',     c: '#30d158' },
              { icon: '🚔', title: 'Służby mundurowe',    desc: 'Policja, EMS, Straż, DOT — złóż podanie i zacznij patrolować.',        c: '#3b82f6' },
              { icon: '🚗', title: 'Pojazdy i licencje',  desc: 'Rejestracja aut, kategorie praw jazdy, mandaty i kontrole drogowe.',    c: '#f59e0b' },
              { icon: '⚖️', title: 'System prawny',       desc: 'Mandaty, areszty, sprawy — pełen kodeks karny RP inspirowany prawem.', c: '#ef4444' },
              { icon: '📱', title: 'Telefon RP',           desc: 'Własny numer, połączenia i SMS-y do innych graczy na żywo.',           c: '#a855f7' },
              { icon: '🎪', title: 'Sesje RP',             desc: 'Regularne sesje organizowane przez Hostów z zapisami i ogłoszeniami.', c: '#00c8ff' },
            ].map(f => (
              <div key={f.title} style={{
                background: 'rgba(255,255,255,0.022)', borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)', padding: '22px 24px',
                transition: 'transform .2s, border-color .2s, box-shadow .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = `${f.c}45`; e.currentTarget.style.boxShadow = `0 8px 32px ${f.c}18`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = ''; }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#fff' }}>{f.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SŁUŻBY ═══════════════════════════════════════════════════════════ */}
      <section id="sluzby" style={{ padding: '100px 24px', background: '#070d17', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 50% at 80% 50%, rgba(0,200,255,0.06) 0%, transparent 60%)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', color: '#00c8ff', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>◈ Służby mundurowe</div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.03em' }}>
              Dołącz do <span style={{ color: '#00c8ff', textShadow: '0 0 30px rgba(0,200,255,0.5)' }}>służb</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, maxWidth: 440, margin: '0 auto' }}>
              Każda służba ma własny panel CAD, procedury i kompetencje. Złóż podanie przez Discord.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { icon: '🚔', name: 'Policja',       tag: 'FVMPD · OCSO · WSP', c: '#3b82f6',  desc: 'Utrzymuj porządek i ścigaj przestępców' },
              { icon: '🚑', name: 'EMS',            tag: 'Fox Mountain Medical', c: '#ec4899', desc: 'Ratuj życie i udzielaj pomocy' },
              { icon: '🚒', name: 'Straż',          tag: 'BFD · GFR',           c: '#f97316', desc: 'Gaś pożary i ratuj uwięzionych' },
              { icon: '🚧', name: 'DOT',            tag: 'Wisconsin DOT',        c: '#f59e0b', desc: 'Zarządzaj ruchem i drogami' },
              { icon: '📡', name: 'Dyspozytornia', tag: 'OCC',                  c: '#818cf8', desc: 'Koordynuj wszystkie służby' },
            ].map(s => (
              <div key={s.name} style={{
                background: 'rgba(255,255,255,0.025)', borderRadius: 16, padding: '24px 16px',
                textAlign: 'center',
                border: `1px solid ${s.c}30`,
                boxShadow: `0 4px 24px ${s.c}15, inset 0 0 40px ${s.c}05`,
                transition: 'transform .2s, box-shadow .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 16px 48px ${s.c}35, inset 0 0 40px ${s.c}10`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 24px ${s.c}15, inset 0 0 40px ${s.c}05`; }}>
                <div style={{ fontSize: 38, marginBottom: 10, filter: `drop-shadow(0 0 12px ${s.c}80)` }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: s.c, fontFamily: 'monospace', fontWeight: 600, marginBottom: 10, letterSpacing: '0.05em' }}>{s.tag}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 24px', borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)',
            }}>
              Wejdź na Discord i użyj{' '}
              <code style={{ color: '#00c8ff', background: 'rgba(0,200,255,0.1)', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}>/aplikuj</code>
              aby złożyć podanie
            </div>
          </div>
        </div>
      </section>

      {/* ══ NEWSY ════════════════════════════════════════════════════════════ */}
      <section id="news" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.3em', color: '#30d158', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'monospace' }}>◈ Aktualności</div>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, margin: 0, letterSpacing: '-0.03em' }}>
              Najnowsze <span style={{ color: '#30d158', textShadow: '0 0 30px rgba(48,209,88,0.5)' }}>ogłoszenia</span>
            </h2>
          </div>

          {news.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>Brak ogłoszeń — sprawdź nasz Discord.</p>
              <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer" style={{ color: '#5865F2', textDecoration: 'none', fontSize: 14 }}>Przejdź na Discord →</a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {news.map(n => {
                const c = NEWS_COLORS[n.category] ?? '#fff';
                return (
                  <div key={n.id} style={{
                    background: 'rgba(255,255,255,0.025)', borderRadius: 16, overflow: 'hidden',
                    border: n.pinned ? `1px solid rgba(48,209,88,0.3)` : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: n.pinned ? '0 4px 24px rgba(48,209,88,0.1)' : 'none',
                    transition: 'transform .2s, box-shadow .2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = n.pinned ? '0 4px 24px rgba(48,209,88,0.1)' : 'none'; }}>
                    {n.imageUrl && <img src={n.imageUrl} alt={n.title} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />}
                    <div style={{ padding: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        {n.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
                          color: c, background: `${c}15`, border: `1px solid ${c}30`,
                        }}>{n.category}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>{ago(n.createdAt)}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, lineHeight: 1.4 }}>{n.title}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>— {n.author.discordUsername}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: '#070d17', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(88,101,242,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(88,101,242,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(88,101,242,0.025) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, margin: '0 auto 28px',
            background: 'rgba(88,101,242,0.15)', border: '1px solid rgba(88,101,242,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 48px rgba(88,101,242,0.25)',
          }}>
            <DiscordIcon size={36} color="#5865F2" />
          </div>

          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, margin: '0 0 14px', letterSpacing: '-0.03em' }}>
            Zaloguj się przez{' '}
            <span style={{ color: '#5865F2', textShadow: '0 0 30px rgba(88,101,242,0.6)' }}>Discord</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 15, lineHeight: 1.7, marginBottom: 36 }}>
            Bot zsynchronizuje Twoje role. Zyskasz dostęp do panelu gracza, portalu służb i systemu CAD.
          </p>

          {isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#30d158', fontWeight: 600, fontSize: 15 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158', boxShadow: '0 0 10px #30d158', display: 'inline-block' }} />
                Zalogowany jako {userName}
              </div>
              <Link href="/portal" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 36px', borderRadius: 12, fontWeight: 800, fontSize: 15,
                background: 'linear-gradient(90deg,#30d158,#00c8ff)', color: '#000', textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(48,209,88,0.3)',
              }}>Otwórz Mój Panel →</Link>
            </div>
          ) : (
            <button onClick={() => signIn('discord')} style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '15px 40px', borderRadius: 12, fontWeight: 800, fontSize: 15,
              background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 40px rgba(88,101,242,0.45)',
            }}>
              <DiscordIcon size={20} /> Zaloguj się z Discord
            </button>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)', marginTop: 20 }}>Synchronizacja ról następuje automatycznie po zalogowaniu.</p>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════════════════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#30d158,#00c8ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 11 }}>G</div>
            <span style={{ fontWeight: 700, fontSize: 13 }}><span style={{ color: '#30d158' }}>GREENVILLE</span><span style={{ color: 'rgba(255,255,255,0.3)' }}> RP</span></span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>© {new Date().getFullYear()} Greenville RP</div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Discord','https://discord.gg/BU8EBPsYXV',true],['CAD','/cad',false],['Logowanie','/login',false]].map(([l,h,ext]) => (
              ext ? (
                <a key={l as string} href={h as string} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>{l}</a>
              ) : (
                <Link key={l as string} href={h as string} style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>{l as string}</Link>
              )
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
}

function DiscordIcon({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.053a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
  );
}
