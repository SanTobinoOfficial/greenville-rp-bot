'use client';

import { useEffect, useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import Link from 'next/link';

// ─── Counter ─────────────────────────────────────────────────────────────────
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

// ─── Types ────────────────────────────────────────────────────────────────────
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

function ago(d: Date | string) {
  return new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
}

const NEWS_CAT_COLOR: Record<string, string> = {
  Ogłoszenie: '#5865F2', Sesja: '#16a34a', Aktualizacja: '#7c3aed',
  Ważne: '#dc2626', Rekrutacja: '#d97706', Wydarzenie: '#0284c7',
};

// ─── Layout helpers ───────────────────────────────────────────────────────────
const MAX = 1100;
const section = (extra?: React.CSSProperties): React.CSSProperties => ({
  padding: '80px 24px',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  ...extra,
});
const inner = (maxWidth = MAX): React.CSSProperties => ({
  maxWidth, margin: '0 auto',
});
const sectionLabel = (color = '#5865F2'): React.CSSProperties => ({
  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase' as const, color, marginBottom: 8,
});
const heading: React.CSSProperties = {
  fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 800,
  margin: '0 0 10px', letterSpacing: '-0.03em', color: '#f4f4f8',
  lineHeight: 1.15,
};
const body: React.CSSProperties = {
  fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0,
};
const card: React.CSSProperties = {
  background: '#16161d', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.07)', padding: '20px 22px',
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LandingClient({ stats, news, isLoggedIn, userName }: Props) {
  return (
    <div style={{ background: '#0c0c10', color: '#e4e4f0', fontFamily: "'Inter', -apple-system, sans-serif", overflowX: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(12,12,16,0.94)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: MAX, margin: '0 auto', padding: '0 24px', height: 54, display: 'flex', alignItems: 'center', gap: 32 }}>

          {/* Logo */}
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: '#5865F2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, color: '#fff', fontSize: 13,
            }}>G</div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#f4f4f8', letterSpacing: '-0.01em' }}>
              Greenville <span style={{ color: 'rgba(255,255,255,0.3)' }}>RP</span>
            </span>
          </a>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
            {[['O nas', '#about'], ['Służby', '#sluzby'], ['Aktualności', '#news']].map(([label, href]) => (
              <a key={href} href={href} style={{ padding: '5px 11px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', transition: 'color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.85)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
                {label}
              </a>
            ))}
            <Link href="/cad" style={{ padding: '5px 11px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
              CAD
            </Link>
          </div>

          {/* Auth */}
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link href="/cad" style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, color: '#fff', background: '#5865F2', textDecoration: 'none' }}>
                Panel →
              </Link>
              <button onClick={() => signOut({ callbackUrl: '/' })}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.22)', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>
                Wyloguj
              </button>
            </div>
          ) : (
            <button onClick={() => signIn('discord')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <DiscordIcon size={15} /> Zaloguj się
            </button>
          )}
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section id="hero" style={{ padding: '100px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* One subtle gradient — not 3 overlapping blobs */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(88,101,242,0.1) 0%, transparent 65%)' }} />

        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
          {/* Online badge — only when session is active */}
          {stats.ongoingSession && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)', color: '#22c55e', marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Sesja RP aktualnie trwa
            </div>
          )}

          <h1 style={{ fontSize: 'clamp(40px, 7vw, 68px)', fontWeight: 800, margin: '0 0 18px', letterSpacing: '-0.04em', lineHeight: 1.05, color: '#f4f4f8' }}>
            Greenville&nbsp;<span style={{ color: '#5865F2' }}>Roleplay</span>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, maxWidth: 460, margin: '0 auto 36px', fontWeight: 400 }}>
            Największy polski serwer Roleplay na Roblox.<br />
            Stwórz postać, zdobądź pracę lub dołącz do służb.
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, background: '#5865F2', color: '#fff', textDecoration: 'none' }}>
              <DiscordIcon size={16} /> Dołącz do Discord
            </a>
            {isLoggedIn ? (
              <Link href="/cad" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, color: '#f4f4f8', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                Mój Panel
              </Link>
            ) : (
              <button onClick={() => signIn('discord')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14, color: '#f4f4f8', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                Zaloguj się
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'center' }}>
            {[
              { label: 'Członkowie', v: stats.memberCount, sfx: '+' },
              { label: 'Zweryfikowanych', v: stats.verifiedUsers, sfx: '' },
              { label: 'Sesji RP', v: stats.totalSessions, sfx: '' },
              { label: 'Uptime', v: 99, sfx: '%' },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, padding: '0 20px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#f4f4f8', letterSpacing: '-0.03em' }}>
                  <Counter to={s.v} suffix={s.sfx} />
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── O NAS ──────────────────────────────────────────────────────────── */}
      <section id="about" style={section()}>
        <div style={inner()}>
          <div style={{ marginBottom: 40 }}>
            <p style={sectionLabel()}>O serwerze</p>
            <h2 style={heading}>Czym jest Greenville RP?</h2>
            <p style={{ ...body, maxWidth: 440 }}>
              Pełnoprawny serwer Roleplay na Roblox z własnym systemem postaci, pojazdów i służb mundurowych.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {[
              { label: 'Tożsamość RP',       desc: 'Dowód osobisty, PESEL, konto bankowe i historia postaci.' },
              { label: 'Służby mundurowe',   desc: 'Policja, EMS, Straż, DOT — złóż podanie i zacznij patrolować.' },
              { label: 'Pojazdy i licencje', desc: 'Rejestracja aut, kategorie praw jazdy, mandaty i kontrole drogowe.' },
              { label: 'System prawny',      desc: 'Mandaty, areszty, nakazy — kodeks karny RP.' },
              { label: 'Telefon RP',         desc: 'Własny numer, połączenia i SMS do innych graczy.' },
              { label: 'Sesje RP',           desc: 'Regularne sesje organizowane przez Hostów z zapisami.' },
            ].map(f => (
              <div key={f.label} style={card}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f4f4f8', marginBottom: 5 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.33)', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAD ────────────────────────────────────────────────────────────── */}
      <section style={section({ background: '#0e0e14' })}>
        <div style={inner()}>
          <div style={{ marginBottom: 40 }}>
            <p style={sectionLabel()}>Panel CAD</p>
            <h2 style={heading}>Centrum Dowodzenia</h2>
            <p style={{ ...body, maxWidth: 440 }}>
              System zarządzania służbami w czasie rzeczywistym — od cywila po administratora.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 28 }}>
            {[
              { title: 'Zgłoszenia 112',   desc: 'System priorytetów CRITICAL / HIGH / MEDIUM / LOW z dysponowaniem jednostek.' },
              { title: 'Jednostki online', desc: 'Callsign i status wszystkich aktywnych służb w czasie rzeczywistym.' },
              { title: 'Radio służbowe',   desc: 'Kanały Dyspozytornia, Alfa, Bravo, EMS, Straż i inne.' },
              { title: 'Proximity Chat',   desc: 'Czat lokacyjny z mapą Greenville.' },
            ].map(f => (
              <div key={f.title} style={card}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#f4f4f8', marginBottom: 5 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.33)', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          <Link href="/cad" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 7, fontWeight: 600, fontSize: 13, background: '#5865F2', color: '#fff', textDecoration: 'none' }}>
            Otwórz CAD →
          </Link>
        </div>
      </section>

      {/* ── SŁUŻBY ─────────────────────────────────────────────────────────── */}
      <section id="sluzby" style={section()}>
        <div style={inner()}>
          <div style={{ marginBottom: 40 }}>
            <p style={sectionLabel()}>Służby mundurowe</p>
            <h2 style={heading}>Dołącz do służb</h2>
            <p style={{ ...body, maxWidth: 440 }}>
              Każda służba ma własny panel CAD, procedury i kompetencje. Aplikuj przez Discord.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 28 }}>
            {[
              { name: 'Policja',       tag: 'FVMPD · OCSO · WSP', desc: 'Utrzymuj porządek i ścigaj przestępców' },
              { name: 'EMS',           tag: 'Fox Mountain Medical', desc: 'Ratuj życie i udzielaj pomocy medycznej' },
              { name: 'Straż',         tag: 'BFD · GFR',            desc: 'Gaś pożary i ratuj uwięzionych' },
              { name: 'DOT',           tag: 'Wisconsin DOT',         desc: 'Zarządzaj ruchem i infrastrukturą' },
              { name: 'Dyspozytornia', tag: 'OCC',                   desc: 'Koordynuj wszystkie jednostki' },
            ].map(s => (
              <div key={s.name} style={card}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#f4f4f8', marginBottom: 3 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: '#5865F2', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 7 }}>{s.tag}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 7, fontSize: 13, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)' }}>
            Użyj{' '}
            <code style={{ color: '#818cf8', background: 'rgba(88,101,242,0.1)', padding: '1px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>/aplikuj</code>
            {' '}na Discord aby złożyć podanie
          </div>
        </div>
      </section>

      {/* ── NEWSY ──────────────────────────────────────────────────────────── */}
      <section id="news" style={section({ background: '#0e0e14' })}>
        <div style={inner(1000)}>
          <div style={{ marginBottom: 40 }}>
            <p style={sectionLabel()}>Aktualności</p>
            <h2 style={heading}>Najnowsze ogłoszenia</h2>
          </div>

          {news.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.22)', marginBottom: 12, fontSize: 14 }}>Brak ogłoszeń.</p>
              <a href="https://discord.gg/BU8EBPsYXV" target="_blank" rel="noopener noreferrer" style={{ color: '#5865F2', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                Przejdź na Discord →
              </a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
              {news.map(n => {
                const catColor = NEWS_CAT_COLOR[n.category] ?? '#6b7280';
                return (
                  <div key={n.id} style={{ background: '#16161d', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {n.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.imageUrl} alt={n.title} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                    )}
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4, color: catColor, background: `${catColor}15` }}>
                          {n.category}
                        </span>
                        {n.pinned && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)' }}>Przypięte</span>}
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>{ago(n.createdAt)}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#f4f4f8', marginBottom: 5, lineHeight: 1.4 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.33)', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {n.content}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)', marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {n.author.discordUsername}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section style={section()}>
        <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, margin: '0 auto 22px', background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DiscordIcon size={22} color="#fff" />
          </div>

          <h2 style={{ fontSize: 'clamp(20px, 3.5vw, 30px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.03em', color: '#f4f4f8' }}>
            Gotowy na dołączenie?
          </h2>
          <p style={{ ...body, marginBottom: 28, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Zaloguj się przez Discord. Bot zsynchronizuje Twoje role i otrzymasz dostęp do systemu CAD.
          </p>

          {isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Zalogowany jako {userName}
              </span>
              <Link href="/cad" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, fontWeight: 700, fontSize: 14, background: '#5865F2', color: '#fff', textDecoration: 'none' }}>
                Otwórz Panel →
              </Link>
            </div>
          ) : (
            <button onClick={() => signIn('discord')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 26px', borderRadius: 8, fontWeight: 700, fontSize: 14, background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <DiscordIcon size={17} /> Zaloguj się z Discord
            </button>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 24px' }}>
        <div style={{ maxWidth: MAX, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>Greenville RP</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>© {new Date().getFullYear()}</span>
          <div style={{ display: 'flex', gap: 18 }}>
            {[
              { label: 'Discord', href: 'https://discord.gg/BU8EBPsYXV', ext: true },
              { label: 'CAD', href: '/cad', ext: false },
              { label: 'Logowanie', href: '/login', ext: false },
            ].map(l => l.ext ? (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', textDecoration: 'none' }}>{l.label}</a>
            ) : (
              <Link key={l.label} href={l.href} style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', textDecoration: 'none' }}>{l.label}</Link>
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
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.053a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}
