'use client';
// Dashboard — /komendy — Panel komend bota Discord
// Allows staff to execute bot commands from browser
// Wymaga: Staff+

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Member {
  id: string;
  tag: string;
  username: string;
  displayName: string;
  avatar: string;
  roles: { id: string; name: string }[];
}

interface Channel { id: string; name: string; type: number; }

type CmdResult = { ok: boolean; error?: string; caseNumber?: number; autoAction?: string; [key: string]: unknown };

// ── Access levels (must match dashboard/lib/auth.ts) ─────────────────────────
const ACCESS = { HELPER: 1, MOD: 2, ADMIN: 3, OWNER: 4 };

// ── Command definitions ───────────────────────────────────────────────────────
const COMMANDS = [
  // Moderacja
  {
    id: 'warn', label: 'Warn', emoji: '⚠️', category: 'Moderacja', minLevel: ACCESS.HELPER, color: 'yellow',
    desc: 'Ostrzeżenie gracza. Przy 3 warnach → auto-mute 24h. Przy 5 → auto-ban 7 dni.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'reason', label: 'Powód', type: 'text', required: true, placeholder: 'Powód ostrzeżenia...' },
      { key: 'duration', label: 'Czas wygaśnięcia (opcjonalnie)', type: 'text', required: false, placeholder: 'np. 7d, 30d' },
    ],
  },
  {
    id: 'ban', label: 'Ban', emoji: '🔨', category: 'Moderacja', minLevel: ACCESS.MOD, color: 'red',
    desc: 'Zbanuj gracza z serwera. Możliwy czasowy lub permanentny.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'reason', label: 'Powód', type: 'text', required: true, placeholder: 'Powód bana...' },
      { key: 'duration', label: 'Czas', type: 'select', required: false, options: [
        { value: '', label: 'Permanentny' },
        { value: '1h', label: '1 godzina' }, { value: '1d', label: '1 dzień' },
        { value: '7d', label: '7 dni' }, { value: '30d', label: '30 dni' },
      ]},
    ],
  },
  {
    id: 'unban', label: 'Unban', emoji: '✅', category: 'Moderacja', minLevel: ACCESS.MOD, color: 'green',
    desc: 'Odbanuj gracza — podaj jego Discord ID.',
    fields: [
      { key: 'targetDiscordId', label: 'Discord ID gracza', type: 'text', required: true, placeholder: 'np. 123456789012345678' },
      { key: 'reason', label: 'Powód (opcjonalnie)', type: 'text', required: false, placeholder: 'Powód unban...' },
    ],
  },
  {
    id: 'kick', label: 'Kick', emoji: '👢', category: 'Moderacja', minLevel: ACCESS.MOD, color: 'orange',
    desc: 'Wyrzuć gracza z serwera (może wrócić).',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'reason', label: 'Powód', type: 'text', required: true, placeholder: 'Powód kicka...' },
    ],
  },
  {
    id: 'mute', label: 'Mute', emoji: '🔇', category: 'Moderacja', minLevel: ACCESS.HELPER, color: 'purple',
    desc: 'Wycisz gracza na podany czas.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'reason', label: 'Powód', type: 'text', required: true, placeholder: 'Powód mute...' },
      { key: 'duration', label: 'Czas', type: 'select', required: true, options: [
        { value: '30m', label: '30 minut' }, { value: '1h', label: '1 godzina' },
        { value: '6h', label: '6 godzin' }, { value: '12h', label: '12 godzin' },
        { value: '24h', label: '24 godziny' }, { value: '7d', label: '7 dni' },
      ]},
    ],
  },
  {
    id: 'unmute', label: 'Unmute', emoji: '🔊', category: 'Moderacja', minLevel: ACCESS.HELPER, color: 'teal',
    desc: 'Zdejmij wyciszenie z gracza.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'reason', label: 'Powód (opcjonalnie)', type: 'text', required: false, placeholder: 'Powód unmute...' },
    ],
  },
  {
    id: 'clearwarns', label: 'Usuń warny', emoji: '🧹', category: 'Moderacja', minLevel: ACCESS.MOD, color: 'blue',
    desc: 'Wyczyść wszystkie aktywne ostrzeżenia gracza.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
    ],
  },
  {
    id: 'notatka', label: 'Notatka', emoji: '📝', category: 'Moderacja', minLevel: ACCESS.HELPER, color: 'gray',
    desc: 'Dodaj notatkę moderacyjną do profilu gracza.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'content', label: 'Treść notatki', type: 'textarea', required: true, placeholder: 'Treść notatki...' },
    ],
  },
  // RP
  {
    id: 'mandat', label: 'Mandat RP', emoji: '📋', category: 'Służby RP', minLevel: ACCESS.HELPER, color: 'yellow',
    desc: 'Wystaw mandat, grzywnę lub areszt graczowi.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'typ', label: 'Typ', type: 'select', required: true, options: [
        { value: 'mandat', label: 'Mandat' }, { value: 'grzywna', label: 'Grzywna' }, { value: 'areszt', label: 'Areszt' },
      ]},
      { key: 'reason', label: 'Powód', type: 'text', required: true, placeholder: 'Powód mandatu...' },
      { key: 'kwota', label: 'Kwota ($)', type: 'number', required: false, placeholder: 'Opcjonalna kwota...' },
    ],
  },
  {
    id: 'zatrzymaj', label: 'Zatrzymaj', emoji: '🚨', category: 'Służby RP', minLevel: ACCESS.HELPER, color: 'red',
    desc: 'Zatrzymaj gracza RP (dodaje rolę Zatrzymany).',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'reason', label: 'Powód zatrzymania', type: 'text', required: true, placeholder: 'Powód zatrzymania...' },
    ],
  },
  {
    id: 'zwolnij', label: 'Zwolnij', emoji: '🔓', category: 'Służby RP', minLevel: ACCESS.HELPER, color: 'green',
    desc: 'Zwolnij zatrzymanego gracza RP.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'reason', label: 'Uwagi (opcjonalnie)', type: 'text', required: false, placeholder: 'Uwagi przy zwolnieniu...' },
    ],
  },
  // Sesje
  {
    id: 'sesja', label: 'Utwórz sesję', emoji: '🎪', category: 'Sesje RP', minLevel: ACCESS.HELPER, color: 'indigo',
    desc: 'Utwórz sesję RP i wyślij ogłoszenie na kanał sesji.',
    fields: [
      { key: 'data', label: 'Data (DD.MM.RRRR)', type: 'text', required: true, placeholder: 'np. 25.12.2025' },
      { key: 'godzina', label: 'Godzina (HH:MM)', type: 'text', required: true, placeholder: 'np. 19:00' },
      { key: 'maksGraczy', label: 'Maks. graczy', type: 'number', required: true, placeholder: '2-50' },
      { key: 'opis', label: 'Opis (opcjonalnie)', type: 'textarea', required: false, placeholder: 'Opis sesji...' },
    ],
  },
  {
    id: 'peacetime', label: 'Peacetime', emoji: '🕊️', category: 'Sesje RP', minLevel: ACCESS.HELPER, color: 'green',
    desc: 'Ustaw tryb peacetime/priority serwera.',
    fields: [
      { key: 'status', label: 'Tryb', type: 'select', required: true, options: [
        { value: 'PEACETIME', label: '🕊️ PEACETIME — zakaz scen crime' },
        { value: 'PRIORITY_1', label: '⚠️ PRIORITY 1 — lekkie crime' },
        { value: 'PRIORITY_2', label: '🟠 PRIORITY 2 — pełna aktywność' },
        { value: 'PRIORITY_3', label: '🔴 PRIORITY 3 — najwyższy priorytet' },
        { value: 'OFF', label: '✅ Zakończ peacetime' },
      ]},
    ],
  },
  // Ogłoszenia
  {
    id: 'announce', label: 'Ogłoszenie', emoji: '📢', category: 'Ogłoszenia', minLevel: ACCESS.MOD, color: 'blue',
    desc: 'Wyślij embed-ogłoszenie na wybrany kanał Discord.',
    fields: [
      { key: 'channelId', label: 'Kanał', type: 'channel', required: true },
      { key: 'title', label: 'Tytuł', type: 'text', required: false, placeholder: 'Tytuł ogłoszenia...' },
      { key: 'message', label: 'Treść', type: 'textarea', required: true, placeholder: 'Treść ogłoszenia...' },
      { key: 'pingEveryone', label: 'Ping @everyone', type: 'checkbox', required: false },
    ],
  },
  // Role
  {
    id: 'role', label: 'Nadaj/Zabierz rolę', emoji: '🏷️', category: 'Role', minLevel: ACCESS.ADMIN, color: 'pink',
    desc: 'Nadaj lub zabierz rolę Discord graczowi.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'roleId', label: 'ID Roli', type: 'text', required: true, placeholder: 'Discord Role ID...' },
      { key: 'action', label: 'Akcja', type: 'select', required: true, options: [
        { value: 'add', label: 'Nadaj rolę' }, { value: 'remove', label: 'Zabierz rolę' },
      ]},
    ],
  },
  // Praca RP
  {
    id: 'set-job', label: 'Ustaw pracę gracza', emoji: '💼', category: 'Praca RP', minLevel: ACCESS.HELPER, color: 'blue',
    desc: 'Ręcznie przypisz pracę graczowi (odpowiednik /ustaw-prace). Pomija cooldown.',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
      { key: 'jobId', label: 'ID pracy', type: 'text', required: true, placeholder: 'np. burger_knight_cashier, fox_valley_police...' },
      { key: 'resetCooldown', label: 'Zresetuj cooldown', type: 'checkbox', required: false },
    ],
  },
  {
    id: 'clear-job', label: 'Wyczyść pracę gracza', emoji: '🗑️', category: 'Praca RP', minLevel: ACCESS.HELPER, color: 'red',
    desc: 'Usuń aktualną pracę gracza (ustawia bezrobotnego).',
    fields: [
      { key: 'targetDiscordId', label: 'Gracz', type: 'member', required: true },
    ],
  },
] as const;

type CmdDef = typeof COMMANDS[number];

// ── Colors ────────────────────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  yellow:  'border-yellow-500/40 bg-yellow-500/5 hover:bg-yellow-500/10',
  red:     'border-red-500/40 bg-red-500/5 hover:bg-red-500/10',
  green:   'border-green-500/40 bg-green-500/5 hover:bg-green-500/10',
  orange:  'border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10',
  purple:  'border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10',
  teal:    'border-teal-500/40 bg-teal-500/5 hover:bg-teal-500/10',
  blue:    'border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10',
  indigo:  'border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10',
  gray:    'border-gray-500/40 bg-gray-500/5 hover:bg-gray-500/10',
  pink:    'border-pink-500/40 bg-pink-500/5 hover:bg-pink-500/10',
};

const BADGE_COLOR_MAP: Record<string, string> = {
  yellow: 'bg-yellow-500/20 text-yellow-300', red: 'bg-red-500/20 text-red-300',
  green:  'bg-green-500/20 text-green-300',  orange: 'bg-orange-500/20 text-orange-300',
  purple: 'bg-purple-500/20 text-purple-300', teal: 'bg-teal-500/20 text-teal-300',
  blue:   'bg-blue-500/20 text-blue-300',    indigo: 'bg-indigo-500/20 text-indigo-300',
  gray:   'bg-gray-500/20 text-gray-300',    pink: 'bg-pink-500/20 text-pink-300',
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function KomendyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [botOnline, setBotOnline] = useState<boolean | null>(null);

  const [selectedCmd, setSelectedCmd] = useState<CmdDef | null>(null);
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CmdResult | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const userLevel = (session?.user as { accessLevel?: number })?.accessLevel ?? 0;

  // Load members + channels + bot status
  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      fetch('/api/bot/guild?resource=members').then(r => r.json()),
      fetch('/api/bot/guild?resource=channels').then(r => r.json()),
      fetch('/api/bot/guild').then(r => r.json()),
    ]).then(([membersData, channelsData, guildData]) => {
      if (membersData.ok) setMembers(membersData.members ?? []);
      if (channelsData.ok) setChannels(channelsData.channels?.filter((c: Channel) => c.type === 0) ?? []);
      setBotOnline(guildData.ok ?? false);
    }).catch(() => setBotOnline(false))
      .finally(() => setLoadingData(false));
  }, [status]);

  const selectCmd = useCallback((cmd: CmdDef) => {
    setSelectedCmd(cmd);
    setFormData({});
    setMemberSearch('');
    setResult(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCmd) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/bot/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cmd: selectedCmd.id, ...formData }),
      });
      const data: CmdResult = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'Błąd połączenia z serwerem' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') return <div className="flex items-center justify-center h-full text-gray-400">Ładowanie...</div>;
  if (!session || userLevel < ACCESS.HELPER) {
    router.push('/dashboard');
    return null;
  }

  // Available commands filtered by user level
  const availableCmds = COMMANDS.filter(c => userLevel >= c.minLevel);
  const categories = ['all', ...Array.from(new Set(availableCmds.map(c => c.category)))];
  const filteredCmds = categoryFilter === 'all' ? availableCmds : availableCmds.filter(c => c.category === categoryFilter);

  const filteredMembers = memberSearch.length > 1
    ? members.filter(m => m.tag.toLowerCase().includes(memberSearch.toLowerCase()) || m.displayName.toLowerCase().includes(memberSearch.toLowerCase())).slice(0, 10)
    : [];

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0d1021] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              ⚡ Panel Komend Bota
            </h1>
            <p className="text-gray-400 text-sm mt-1">Wykonuj komendy Discord bezpośrednio z przeglądarki</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
              botOnline === null ? 'border-gray-600 bg-gray-600/20 text-gray-400' :
              botOnline ? 'border-green-500/40 bg-green-500/20 text-green-300' : 'border-red-500/40 bg-red-500/20 text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${botOnline ? 'bg-green-400 animate-pulse' : botOnline === null ? 'bg-gray-400' : 'bg-red-400'}`} />
              {botOnline === null ? 'Sprawdzanie...' : botOnline ? 'Bot online' : 'Bot offline'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-81px)]">
        {/* Sidebar — command list */}
        <div className="w-72 border-r border-white/10 bg-[#0d1021] flex flex-col">
          {/* Category filter */}
          <div className="p-3 border-b border-white/10 flex flex-wrap gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {cat === 'all' ? 'Wszystkie' : cat}
              </button>
            ))}
          </div>

          {/* Command list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredCmds.map(cmd => (
              <button
                key={cmd.id}
                onClick={() => selectCmd(cmd)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                  selectedCmd?.id === cmd.id
                    ? `${COLOR_MAP[cmd.color]} border-opacity-100 ring-1 ring-inset ring-white/10`
                    : 'border-transparent hover:border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cmd.emoji}</span>
                  <div>
                    <div className="text-sm font-medium text-white">{cmd.label}</div>
                    <div className="text-xs text-gray-500">{cmd.category}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedCmd ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h2 className="text-xl font-bold text-white mb-2">Wybierz komendę</h2>
              <p className="text-gray-400 text-sm max-w-sm">
                Wybierz komendę z listy po lewej stronie aby wykonać ją bezpośrednio z panelu administracyjnego.
              </p>
              <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
                {filteredCmds.slice(0, 6).map(cmd => (
                  <button
                    key={cmd.id}
                    onClick={() => selectCmd(cmd)}
                    className={`p-4 rounded-xl border text-left transition-all ${COLOR_MAP[cmd.color]}`}
                  >
                    <div className="text-2xl mb-2">{cmd.emoji}</div>
                    <div className="font-medium text-white text-sm">{cmd.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{cmd.category}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {/* Command header */}
              <div className={`p-6 rounded-2xl border mb-6 ${COLOR_MAP[selectedCmd.color]}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{selectedCmd.emoji}</span>
                      <div>
                        <h2 className="text-xl font-bold text-white">{selectedCmd.label}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE_COLOR_MAP[selectedCmd.color]}`}>
                          {selectedCmd.category}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">{selectedCmd.desc}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCmd(null)}
                    className="text-gray-500 hover:text-white transition-colors text-xl"
                  >×</button>
                </div>
              </div>

              {/* Result */}
              {result && (
                <div className={`p-4 rounded-xl border mb-6 ${
                  result.ok
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{result.ok ? '✅' : '❌'}</span>
                    <div>
                      {result.ok ? (
                        <div>
                          <div className="font-medium">Komenda wykonana pomyślnie!</div>
                          {result.caseNumber && <div className="text-sm mt-1">Case #{result.caseNumber}</div>}
                          {result.autoAction && <div className="text-sm mt-1">Auto-akcja: {String(result.autoAction)}</div>}
                          {result.activeWarns !== undefined && <div className="text-sm mt-1">Aktywne warny: {String(result.activeWarns)}</div>}
                          {result.fineId && <div className="text-sm mt-1">ID mandatu: {String(result.fineId)}</div>}
                          {result.sessionId && <div className="text-sm mt-1">Sesja ID: {String(result.sessionId)}</div>}
                          {result.clearedCount !== undefined && <div className="text-sm mt-1">Usunięto warnów: {String(result.clearedCount)}</div>}
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">Błąd wykonania komendy</div>
                          <div className="text-sm mt-1">{result.error}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {selectedCmd.fields.map((field) => {
                  const f = field as { key: string; label: string; type: string; required: boolean; placeholder?: string; options?: { value: string; label: string }[] };
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-300">
                        {f.label} {f.required && <span className="text-red-400">*</span>}
                      </label>

                      {f.type === 'member' && (
                        <div className="relative">
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={e => { setMemberSearch(e.target.value); setFormData(prev => ({ ...prev, [f.key]: '' })); }}
                            placeholder="Szukaj gracza..."
                            className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                          />
                          {formData[f.key] && (
                            <div className="mt-1 text-xs text-green-400">
                              ✓ Wybrany: {members.find(m => m.id === formData[f.key])?.tag ?? formData[f.key]}
                            </div>
                          )}
                          {filteredMembers.length > 0 && !formData[f.key] && (
                            <div className="absolute z-10 w-full mt-1 bg-[#1a1f2e] border border-white/10 rounded-xl overflow-hidden shadow-xl">
                              {filteredMembers.map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, [f.key]: m.id }));
                                    setMemberSearch(m.tag);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={m.avatar} alt="" className="w-7 h-7 rounded-full" />
                                  <div>
                                    <div className="text-sm text-white">{m.displayName}</div>
                                    <div className="text-xs text-gray-400">{m.tag}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {loadingData && <div className="text-xs text-gray-500 mt-1">Ładowanie listy graczy...</div>}
                        </div>
                      )}

                      {f.type === 'channel' && (
                        <select
                          required={f.required}
                          value={String(formData[f.key] ?? '')}
                          onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        >
                          <option value="">Wybierz kanał...</option>
                          {channels.map(ch => (
                            <option key={ch.id} value={ch.id}>#{ch.name}</option>
                          ))}
                        </select>
                      )}

                      {f.type === 'select' && (
                        <select
                          required={f.required}
                          value={String(formData[f.key] ?? '')}
                          onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        >
                          {f.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {(f.type === 'text' || f.type === 'number') && (
                        <input
                          type={f.type}
                          required={f.required}
                          value={String(formData[f.key] ?? '')}
                          onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
                        />
                      )}

                      {f.type === 'textarea' && (
                        <textarea
                          required={f.required}
                          value={String(formData[f.key] ?? '')}
                          onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          rows={4}
                          className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm resize-none"
                        />
                      )}

                      {f.type === 'checkbox' && (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData[f.key])}
                            onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.checked }))}
                            className="w-4 h-4 accent-indigo-500"
                          />
                          <span className="text-sm text-gray-300">Tak</span>
                        </label>
                      )}
                    </div>
                  );
                })}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !botOnline}
                    className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all ${
                      loading || !botOnline
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Wykonywanie...
                      </span>
                    ) : !botOnline ? '🔴 Bot offline' : `${selectedCmd.emoji} Wykonaj: ${selectedCmd.label}`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
