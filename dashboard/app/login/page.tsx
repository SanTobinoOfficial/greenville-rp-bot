// Strona logowania przez Discord OAuth2

'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0c10', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#5865F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 20, margin: '0 auto 16px' }}>
            G
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f8', margin: '0 0 5px', letterSpacing: '-0.02em' }}>
            Greenville RP
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
            Portal gracza i panel staffu
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#16161d', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '28px 24px' }}>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 7, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#fca5a5', lineHeight: 1.5 }}>
              Błąd logowania. Sprawdź czy masz dostęp do serwera Discord.
            </div>
          )}

          <button
            onClick={() => signIn('discord', { callbackUrl: '/cad' })}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '11px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, background: '#5865F2', color: '#fff', border: 'none', cursor: 'pointer', transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#4752c4')}
            onMouseLeave={e => (e.currentTarget.style.background = '#5865F2')}
          >
            <DiscordIcon size={18} />
            Zaloguj przez Discord
          </button>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 18, marginBottom: 0, lineHeight: 1.6 }}>
            Musisz być członkiem serwera Discord<br />aby zalogować się do systemu.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'rgba(255,255,255,0.12)' }}>
          © {new Date().getFullYear()} Greenville RP
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0c0c10' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #5865F2', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function DiscordIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.053a19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}
