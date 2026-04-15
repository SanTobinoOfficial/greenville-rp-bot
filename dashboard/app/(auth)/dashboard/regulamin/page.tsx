'use client';

import { useState, useEffect } from 'react';

export default function RegulaminPage() {
  const [text, setText] = useState('');
  const [channelId, setChannelId] = useState('');
  const [messageId, setMessageId] = useState('');
  const [color, setColor] = useState('#5865F2');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/regulamin')
      .then(r => r.json())
      .then(data => {
        setText(data.text ?? '');
        setChannelId(data.channelId ?? '');
        setMessageId(data.messageId ?? '');
        setColor(data.color ?? '#5865F2');
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/regulamin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, channelId, messageId, color }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.discord?.messageId) setMessageId(data.discord.messageId);
        setMsg({
          ok: true,
          text: data.discord?.sent
            ? `✅ Zapisano i zaktualizowano embed na Discordzie!`
            : `💾 Zapisano. ${data.discord?.reason ?? data.discord?.error ?? 'Brak skonfigurowanego kanału — ustaw go w Ustawieniach → Kanały.'}`,
        });
      } else {
        setMsg({ ok: false, text: `❌ ${data.error}` });
      }
    } catch {
      setMsg({ ok: false, text: '❌ Błąd sieci' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-white/50 text-sm">Ładowanie...</div>;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">📋 Regulamin Serwera</h1>
        <p className="text-white/50 text-sm mt-1">
          Edytuj regulamin. Po zapisaniu bot automatycznie zaktualizuje embed na Discordzie.
        </p>
      </div>

      {/* Config */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Konfiguracja Discord</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-white/50 uppercase tracking-wide">ID kanału #regulamin</label>
            <input value={channelId} onChange={e => setChannelId(e.target.value)}
              placeholder="Skopiuj ID kanału (prawy klik)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-white/50 uppercase tracking-wide">ID wiadomości (opcjonalnie — do edycji istniejącej)</label>
            <input value={messageId} onChange={e => setMessageId(e.target.value)}
              placeholder="Zostaw puste żeby wysłać nową"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-white/50 uppercase tracking-wide">Kolor embeda</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent" />
          <input type="text" value={color} onChange={e => setColor(e.target.value)}
            className="w-28 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none" />
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white/[0.04] border border-white/10 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">Treść Regulaminu</h3>
          <span className="text-xs text-white/30">{text.length} znaków</span>
        </div>
        <p className="text-xs text-white/40">
          Puste linie między sekcjami tworzą osobne pola embeda. Pierwsza linia pierwszego bloku = opis główny. Kolejne bloki: pierwsza linia = tytuł pola, reszta = treść.
        </p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={24}
          placeholder={`Witaj na serwerze Greenville RP! Zapoznaj się z regulaminem przed grą.\n\n§1 Zasady Ogólne\n1. Szanuj innych graczy i staff.\n2. Zakaz spamu, reklam, obrażania.\n3. Słuchaj poleceń staffu.\n\n§2 RolePlay\n1. Zawsze zachowuj klimat RP (In-Character).\n2. Zakaz używania wiedzy OOC w grze.\n3. Zakaz powertripowania i metagamingu.\n\n§3 Służby\n1. Służby działają wg regulaminów wewnętrznych.\n2. Zakaz nadużywania uprawnień służbowych.\n\n§4 Sankcje\nŁamanie regulaminu skutkuje karą adekwatną do przewinienia.`}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/15 focus:outline-none focus:border-blue-500/50 font-mono resize-y leading-relaxed"
        />
      </div>

      {/* Preview */}
      {text && (
        <div className="bg-white/[0.02] border-l-4 rounded-r-xl p-4 space-y-3" style={{ borderColor: color }}>
          <div className="text-xs text-white/40 uppercase tracking-wide">Podgląd embeda</div>
          <div className="font-bold text-white text-base">📋 Regulamin Serwera — Greenville RP</div>
          {text.split('\n\n').filter(Boolean).map((section, i) => {
            const lines = section.split('\n');
            if (i === 0) return <div key={i} className="text-sm text-white/70 whitespace-pre-wrap">{section}</div>;
            return (
              <div key={i} className="border-t border-white/10 pt-2 space-y-1">
                <div className="text-sm font-semibold text-white">{lines[0]}</div>
                <div className="text-xs text-white/60 whitespace-pre-wrap">{lines.slice(1).join('\n')}</div>
              </div>
            );
          })}
          <div className="text-xs text-white/25 pt-1 border-t border-white/10">Greenville RP — Regulamin • Ostatnia aktualizacja: teraz</div>
        </div>
      )}

      {msg && (
        <div className={`p-3 rounded-xl text-sm border ${msg.ok ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
          {msg.text}
        </div>
      )}

      <button onClick={save} disabled={saving || !text.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
        {saving ? '⏳ Zapisywanie i wysyłanie na Discord...' : '📤 Zapisz i Zaktualizuj na Discordzie'}
      </button>
    </div>
  );
}
