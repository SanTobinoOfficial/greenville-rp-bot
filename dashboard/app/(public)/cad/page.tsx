'use client';
// AURORA Greenville RP — Uniwersalny Panel CAD v4.0
// Dostępny dla wszystkich: admin, służby, Security Guard, Taxi, cywile, itp.
// Popup: window.open('/cad','GreenvilleCAD','width=1440,height=900,resizable=yes')

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPY
// ─────────────────────────────────────────────────────────────────────────────

type CadRole =
  | 'OWNER' | 'ADMIN' | 'MOD' | 'STAFF'
  | 'POLICJA' | 'EMS' | 'STRAZ' | 'DOT' | 'SM' | 'DYSPOZYTORNIA'
  | 'OCHRONA' | 'TAKSOWKARZ' | 'KIEROWCA_BUS' | 'RATOWNIK' | 'PRACOWNIK'
  | 'CYWIL';

type UnitStatus    = 'AVAILABLE' | 'BUSY' | 'ON_SCENE' | 'TRAFFIC_STOP' | 'TRANSPORT' | 'PURSUIT' | 'PATROL' | 'OFFLINE';
type CallPriority  = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type CallStatus    = 'PENDING' | 'ACTIVE' | 'CLOSED';
type ServerPriority= 'PEACETIME' | 'PRIORITY_1' | 'PRIORITY_2' | 'PRIORITY_3';
type RadioChannel  = 'DYSPOZYTORNIA'|'KOMENDA'|'ALFA'|'BRAVO'|'EMS'|'STRAŻ'|'TAKTYCZNY'|'DOT'|'TAXI'|'OCHRONA'|'BUS'|'PRACOWNICY';
type ChatTabId     = 'radio' | 'proximity' | 'system';

interface CadUser  { cadRole: CadRole; discordId: string|null; name: string; robloxName: string|null; currentJob: string|null; unit: { callsign: string; status: UnitStatus; service: string; onDutySince: string }|null; }
interface Unit     { id: string; discordId: string; callsign: string; name: string; service: string; cadRole: string; status: UnitStatus; onDutySince: string; }
interface CadCall  { id: string; number: number; nature: string; location: string; description?: string; priority: CallPriority; status: CallStatus; dispatchedTo: string[]; createdAt: string; }
interface Warrant  { id: string; targetName: string; robloxName?: string; reason: string; issuedByName: string; createdAt: string; }
interface PlateResult { id: string; tablica: string; marka: string; model: string; rok: number; kolor: string; owner: { robloxName: string; phone?: string; activeWarns: number; isArrested: boolean }; }
interface RadioMsg { id: string; callsign: string; channel: RadioChannel; content: string; type: string; timestamp: string; }
interface ProxMsg  { id: string; userId: string; username: string; content: string; timestamp: string; }
interface Location { id: string; name: string; emoji: string; description?: string; }

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURACJA
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<CadRole, { label: string; color: string; icon: string; short: string }> = {
  OWNER:       { label: 'Właściciel',     color: '#f59e0b', icon: '👑', short: 'OWN' },
  ADMIN:       { label: 'Administrator',  color: '#ef4444', icon: '🔴', short: 'ADM' },
  MOD:         { label: 'Moderator',      color: '#f97316', icon: '🟠', short: 'MOD' },
  STAFF:       { label: 'Staff',          color: '#eab308', icon: '🟡', short: 'STF' },
  POLICJA:     { label: 'Policja',        color: '#3b82f6', icon: '🚔', short: 'PLC' },
  EMS:         { label: 'EMS',            color: '#ec4899', icon: '🚑', short: 'EMS' },
  STRAZ:       { label: 'Straż Pożarna',  color: '#f97316', icon: '🚒', short: 'FIR' },
  DOT:         { label: 'DOT',            color: '#ff8c00', icon: '🚧', short: 'DOT' },
  SM:          { label: 'Sec. Manager',   color: '#8b5cf6', icon: '🛡️', short: 'SM'  },
  DYSPOZYTORNIA:{ label: 'Dyspozytornia', color: '#818cf8', icon: '📡', short: 'DYS' },
  OCHRONA:     { label: 'Ochrona',        color: '#6366f1', icon: '🔒', short: 'OCH' },
  TAKSOWKARZ:  { label: 'Taksówkarz',     color: '#f1c40f', icon: '🚕', short: 'TAX' },
  KIEROWCA_BUS:{ label: 'Kierowca Bus',   color: '#10b981', icon: '🚌', short: 'BUS' },
  RATOWNIK:    { label: 'Ratownik',       color: '#06b6d4', icon: '🏊', short: 'RAT' },
  PRACOWNIK:   { label: 'Pracownik',      color: '#9ca3af', icon: '👷', short: 'PRW' },
  CYWIL:       { label: 'Cywil',          color: '#6b7280', icon: '👤', short: 'CYV' },
};

const UNIT_STATUS: Record<UnitStatus, { label: string; color: string; bg: string }> = {
  AVAILABLE:    { label: 'Dostępny',       color: '#22c55e', bg: 'bg-green-500/20 border-green-500/40' },
  BUSY:         { label: 'Zajęty',          color: '#eab308', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  ON_SCENE:     { label: 'Na miejscu',      color: '#3b82f6', bg: 'bg-blue-500/20 border-blue-500/40' },
  TRAFFIC_STOP: { label: 'Kontrola',        color: '#06b6d4', bg: 'bg-cyan-500/20 border-cyan-500/40' },
  TRANSPORT:    { label: 'Transport',       color: '#a855f7', bg: 'bg-purple-500/20 border-purple-500/40' },
  PURSUIT:      { label: '⚡ Pościg',       color: '#ef4444', bg: 'bg-red-500/20 border-red-500/40' },
  PATROL:       { label: 'Patrol',          color: '#14b8a6', bg: 'bg-teal-500/20 border-teal-500/40' },
  OFFLINE:      { label: 'Offline',         color: '#6b7280', bg: 'bg-gray-500/20 border-gray-500/40' },
};

const PRIO_CFG: Record<CallPriority, { label: string; color: string; dot: string; border: string }> = {
  LOW:      { label: 'NISKI',     color: '#9ca3af', dot: 'bg-gray-400',                          border: 'border-l-gray-500' },
  MEDIUM:   { label: 'ŚREDNI',    color: '#eab308', dot: 'bg-yellow-400',                        border: 'border-l-yellow-500' },
  HIGH:     { label: 'WYSOKI',    color: '#f97316', dot: 'bg-orange-500',                        border: 'border-l-orange-500' },
  CRITICAL: { label: 'KRYTYCZNY', color: '#ef4444', dot: 'bg-red-500 animate-pulse',             border: 'border-l-red-500' },
};

const SERVER_PRIO: Record<ServerPriority, { label: string; color: string; bg: string; desc: string }> = {
  PEACETIME:  { label: 'PEACETIME',  color: '#22c55e', bg: 'bg-green-500/10 border-green-500/40',  desc: 'Zakaz scen kryminalnych' },
  PRIORITY_1: { label: 'PRIORITY 1', color: '#eab308', bg: 'bg-yellow-500/10 border-yellow-500/40', desc: 'Lekkie sceny crime' },
  PRIORITY_2: { label: 'PRIORITY 2', color: '#f97316', bg: 'bg-orange-500/10 border-orange-500/40', desc: 'Pełna aktywność' },
  PRIORITY_3: { label: 'PRIORITY 3', color: '#ef4444', bg: 'bg-red-500/10 border-red-500/40',       desc: '⚡ Najwyższy priorytet!' },
};

const CH_CFG: Record<RadioChannel, { color: string; roles: CadRole[] }> = {
  DYSPOZYTORNIA: { color: '#818cf8', roles: ['OWNER','ADMIN','MOD','STAFF','POLICJA','EMS','STRAZ','DOT','SM','DYSPOZYTORNIA'] },
  KOMENDA:       { color: '#f59e0b', roles: ['OWNER','ADMIN','MOD','POLICJA','SM'] },
  ALFA:          { color: '#3b82f6', roles: ['OWNER','ADMIN','POLICJA'] },
  BRAVO:         { color: '#10b981', roles: ['OWNER','ADMIN','POLICJA'] },
  EMS:           { color: '#ec4899', roles: ['OWNER','ADMIN','MOD','EMS'] },
  'STRAŻ':       { color: '#f97316', roles: ['OWNER','ADMIN','MOD','STRAZ'] },
  TAKTYCZNY:     { color: '#8b5cf6', roles: ['OWNER','ADMIN','POLICJA'] },
  DOT:           { color: '#ff8c00', roles: ['OWNER','ADMIN','MOD','DOT'] },
  TAXI:          { color: '#f1c40f', roles: ['OWNER','ADMIN','TAKSOWKARZ'] },
  OCHRONA:       { color: '#6366f1', roles: ['OWNER','ADMIN','SM','OCHRONA'] },
  BUS:           { color: '#10b981', roles: ['OWNER','ADMIN','KIEROWCA_BUS'] },
  PRACOWNICY:    { color: '#9ca3af', roles: ['OWNER','ADMIN','PRACOWNIK','RATOWNIK'] },
};

// Moduły (zakładki główne) dostępne per rola
const ROLE_MODULES: Record<CadRole, string[]> = {
  OWNER:        ['staff','panel','calls','units','warrants','plates','map','arrests','medical','fire','road','dispatch'],
  ADMIN:        ['staff','panel','calls','units','warrants','plates','map','arrests','dispatch'],
  MOD:          ['staff','panel','calls','units','warrants','plates','map'],
  STAFF:        ['staff','panel','calls','units','map'],
  POLICJA:      ['panel','calls','units','warrants','plates','map','arrests'],
  EMS:          ['panel','calls','units','map','medical'],
  STRAZ:        ['panel','calls','units','map','fire'],
  DOT:          ['panel','calls','units','map','road'],
  SM:           ['panel','calls','units','warrants','map','patrol_log'],
  DYSPOZYTORNIA:['panel','calls','units','warrants','plates','map','dispatch'],
  OCHRONA:      ['panel','calls','map','patrol_log','incident'],
  TAKSOWKARZ:   ['panel','map','rides'],
  KIEROWCA_BUS: ['panel','map','rides'],
  RATOWNIK:     ['panel','calls','map','medical'],
  PRACOWNIK:    ['panel','map'],
  CYWIL:        ['panel','emergency_call','calls_view','map'],
};

const MODULE_LABEL: Record<string, { label: string }> = {
  calls:         { label: 'Zgłoszenia'  },
  calls_view:    { label: 'Zdarzenia'   },
  units:         { label: 'Jednostki'   },
  warrants:      { label: 'Nakazy'      },
  plates:        { label: 'Tablice'     },
  map:           { label: 'Mapa'        },
  arrests:       { label: 'Areszty'     },
  medical:       { label: 'Medyczny'    },
  fire:          { label: 'Pożarniczy'  },
  road:          { label: 'Drogowy'     },
  dispatch:      { label: 'Dyspozytura' },
  patrol_log:    { label: 'Patrol'      },
  incident:      { label: 'Incydenty'   },
  rides:         { label: 'Kursy'       },
  emergency_call:{ label: 'Zgłoś 112'  },
  panel:         { label: 'Panel'       },
  staff:         { label: 'Staff'       },
};

const CALL_NATURES: Record<CadRole, string[]> = {
  OWNER:        ['Wypadek drogowy','Pościg','Strzelanina','Napad','Bójka','Pożar','Pogotowie','Włamanie','Inne'],
  ADMIN:        ['Wypadek drogowy','Pościg','Strzelanina','Napad','Bójka','Pożar','Pogotowie','Włamanie','Inne'],
  MOD:          ['Wypadek drogowy','Pościg','Strzelanina','Napad','Bójka','Pożar','Pogotowie','Inne'],
  STAFF:        ['Wypadek drogowy','Pościg','Inne'],
  POLICJA:      ['Wypadek drogowy','Pościg','Strzelanina','Napad','Bójka','Włamanie','Kontrola','Mandat','Inne'],
  EMS:          ['Wypadek z ofiarami','Zawał','Udar','Utonięcie','Przedawkowanie','Uraz','Inne medyczne'],
  STRAZ:        ['Pożar budynku','Pożar pojazdu','Pożar lasu','Wypadek z uwięzionymi','Wyciek gazu','Inne'],
  DOT:          ['Wypadek blokujący','Uszkodzone znaki','Awaria sygnalizacji','Dziura','Zamknięcie drogi','Inne'],
  SM:           ['Zakłócenie porządku','Wandalizm','Nielegalne parkowanie','Agresja','Podejrzana osoba','Inne'],
  DYSPOZYTORNIA:['Wypadek drogowy','Pościg','Strzelanina','Napad','Bójka','Pożar','Pogotowie','Włamanie','Inne'],
  OCHRONA:      ['Zakłócenie porządku','Podejrzana osoba','Kradzież','Bójka','Wandalizm','Inne'],
  TAKSOWKARZ:   [], KIEROWCA_BUS: [], RATOWNIK: ['Utonięcie','Uraz','Wypadek przy basenie','Zasłabnięcie'],
  PRACOWNIK:    [], CYWIL: ['Wypadek drogowy','Pożar','Napad','Osoba nieprzytomna','Awaria','Inne nagłe'],
};

const UNIT_STATUSES_FOR_ROLE: Record<CadRole, UnitStatus[]> = {
  OWNER:        ['AVAILABLE','BUSY','ON_SCENE','TRAFFIC_STOP','TRANSPORT','PURSUIT','OFFLINE'],
  ADMIN:        ['AVAILABLE','BUSY','ON_SCENE','TRAFFIC_STOP','TRANSPORT','PURSUIT','OFFLINE'],
  MOD:          ['AVAILABLE','BUSY','ON_SCENE','OFFLINE'],
  STAFF:        ['AVAILABLE','BUSY','OFFLINE'],
  POLICJA:      ['AVAILABLE','BUSY','ON_SCENE','TRAFFIC_STOP','TRANSPORT','PURSUIT','OFFLINE'],
  EMS:          ['AVAILABLE','BUSY','ON_SCENE','TRANSPORT','OFFLINE'],
  STRAZ:        ['AVAILABLE','BUSY','ON_SCENE','OFFLINE'],
  DOT:          ['AVAILABLE','BUSY','ON_SCENE','OFFLINE'],
  SM:           ['AVAILABLE','BUSY','ON_SCENE','PATROL','OFFLINE'],
  DYSPOZYTORNIA:['AVAILABLE','BUSY','OFFLINE'],
  OCHRONA:      ['AVAILABLE','PATROL','BUSY','OFFLINE'],
  TAKSOWKARZ:   ['AVAILABLE','BUSY','OFFLINE'],
  KIEROWCA_BUS: ['AVAILABLE','BUSY','OFFLINE'],
  RATOWNIK:     ['AVAILABLE','PATROL','BUSY','OFFLINE'],
  PRACOWNIK:    ['AVAILABLE','BUSY','OFFLINE'],
  CYWIL:        [],
};

const LOCATIONS: Location[] = [
  { id: 'centrum',       name: 'Centrum Greenville',    emoji: '🏙️' },
  { id: 'szpital',       name: 'Szpital / Fox Mountain', emoji: '🏥' },
  { id: 'komisariat',    name: 'Komisariat Policji',    emoji: '🚔' },
  { id: 'straz_pozarna', name: 'Straż Pożarna',         emoji: '🚒' },
  { id: 'lotnisko',      name: 'Lotnisko',              emoji: '✈️' },
  { id: 'port',          name: 'Port / Nabrzeże',       emoji: '⚓' },
  { id: 'ratusz',        name: 'Ratusz / Town Hall',    emoji: '🏛️' },
  { id: 'targ',          name: 'Targ / Market',         emoji: '🛒' },
  { id: 'park',          name: 'Park Narodowy',         emoji: '🌲' },
  { id: 'szkola',        name: 'Szkoła / Uczelnia',     emoji: '🏫' },
  { id: 'restauracja',   name: 'Dzielnica Restauracji', emoji: '🍔' },
  { id: 'warsztat',      name: 'Warsztaty / Mechanicy', emoji: '🔧' },
  { id: 'salon_aut',     name: 'Salony Samochodowe',    emoji: '🚗' },
  { id: 'bank',          name: 'Bank / Credit Union',   emoji: '🏦' },
  { id: 'przedmiescia',  name: 'Przedmieścia',          emoji: '🏘️' },
];

// Pozycje pinezek lokacji na mapie (% od lewej i góry)
const LOCATION_COORDS: Record<string, { x: number; y: number }> = {
  centrum:       { x: 50, y: 45 },
  szpital:       { x: 65, y: 30 },
  komisariat:    { x: 38, y: 42 },
  straz_pozarna: { x: 28, y: 38 },
  lotnisko:      { x: 78, y: 18 },
  port:          { x: 72, y: 68 },
  ratusz:        { x: 47, y: 52 },
  targ:          { x: 33, y: 57 },
  park:          { x: 18, y: 28 },
  szkola:        { x: 55, y: 62 },
  restauracja:   { x: 44, y: 57 },
  warsztat:      { x: 23, y: 62 },
  salon_aut:     { x: 61, y: 58 },
  bank:          { x: 41, y: 47 },
  przedmiescia:  { x: 18, y: 72 },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────

const fmtTime  = (iso: string) => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtAgo   = (iso: string) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); return d < 60 ? `${d}s` : d < 3600 ? `${Math.floor(d/60)}m` : `${Math.floor(d/3600)}h`; };
const fmtDate  = (iso: string) => new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function hasModule(role: CadRole, mod: string) { return ROLE_MODULES[role]?.includes(mod) ?? false; }
function getRadioChannels(role: CadRole): RadioChannel[] {
  return (Object.keys(CH_CFG) as RadioChannel[]).filter(ch => CH_CFG[ch].roles.includes(role));
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOM COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ background: color }} />;
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' as const, background: color + '1e', color, border: `1px solid ${color}30` }}>
      {children}
    </span>
  );
}

function PrioBar({ priority }: { priority: CallPriority }) {
  const cfg = PRIO_CFG[priority];
  return (
    <span className={priority === 'CRITICAL' ? 'animate-pulse' : ''}
      style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' as const, background: cfg.color + '1e', color: cfg.color, border: `1px solid ${cfg.color}30` }}>
      {cfg.label}
    </span>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border border-white/10 border-t-[#5865F2] rounded-full animate-spin" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROXIMITY CHAT
// ─────────────────────────────────────────────────────────────────────────────

function ProximityChat({ location, username }: { location: Location; username: string }) {
  const [msgs, setMsgs] = useState<ProxMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const lastTs = useRef('');
  const atBottom = useRef(true);

  const poll = useCallback(async () => {
    try {
      const url = `/api/cad/proximity-chat?location=${location.id}${lastTs.current ? `&since=${encodeURIComponent(lastTs.current)}` : ''}`;
      const data: ProxMsg[] = await fetch(url).then(r => r.ok ? r.json() : []);
      if (data.length > 0) {
        setMsgs(prev => [...prev, ...data].slice(-150));
        lastTs.current = data[data.length - 1].timestamp;
        if (!atBottom.current) setUnread(n => n + data.length);
      }
    } catch {}
  }, [location.id]);

  useEffect(() => { setMsgs([]); lastTs.current = ''; setUnread(0); poll(); const iv = setInterval(poll, 3000); return () => clearInterval(iv); }, [location.id, poll]);

  useEffect(() => {
    if (atBottom.current) { endRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); }
  }, [msgs]);

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    if (atBottom.current) setUnread(0);
  }

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await fetch('/api/cad/proximity-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locationId: location.id, content: input }) });
      setInput('');
      await poll();
      setTimeout(() => { atBottom.current = true; endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } finally { setSending(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.07] flex-shrink-0 bg-[#0c0c10]">
        <span className="text-sm">{location.emoji}</span>
        <span className="text-xs font-semibold text-white truncate">{location.name}</span>
        {unread > 0 && <span className="ml-auto text-xs bg-[#5865F2] text-white px-2 py-0.5 rounded-full font-bold">{unread}</span>}
      </div>
      <div onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {msgs.length === 0 && <div className="text-center text-white/25 text-xs pt-8">Brak wiadomości w tej lokacji</div>}
        {msgs.map(m => (
          <div key={m.id} className="flex gap-2 hover:bg-white/[0.03] rounded px-1 py-0.5">
            <span className="text-white/25 flex-shrink-0 font-mono text-xs pt-0.5">{fmtTime(m.timestamp)}</span>
            <span className="font-semibold text-[#818cf8] flex-shrink-0 text-xs">{m.username}:</span>
            <span className="text-white/40 break-words text-xs">{m.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {!atBottom.current && unread > 0 && (
        <button onClick={() => { atBottom.current = true; endRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); }}
          className="mx-3 mb-1 text-xs text-[#5865F2] hover:text-[#818cf8] text-center transition-colors">
          ↓ {unread} nowych wiadomości
        </button>
      )}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.07] flex gap-2 flex-shrink-0">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Jako ${username}…`}
          className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
        <button onClick={send} disabled={sending || !input.trim()}
          className="bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-40 text-white rounded-lg px-3 py-2 text-xs font-medium transition-colors">
          {sending ? <Spinner /> : 'Wyślij'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RADIO CHAT
// ─────────────────────────────────────────────────────────────────────────────

function RadioChat({ role, callsign }: { role: CadRole; callsign: string }) {
  const channels = getRadioChannels(role);
  const [ch, setCh] = useState<RadioChannel>(channels[0] ?? 'DYSPOZYTORNIA');
  const [msgs, setMsgs] = useState<RadioMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const lastTs = useRef('');
  const atBottom = useRef(true);

  const poll = useCallback(async () => {
    try {
      const url = `/api/cad/chat?channel=${ch}${lastTs.current ? `&since=${encodeURIComponent(lastTs.current)}` : ''}`;
      const data: RadioMsg[] = await fetch(url).then(r => r.ok ? r.json() : []);
      if (data.length > 0) {
        setMsgs(prev => [...prev, ...data].slice(-200));
        lastTs.current = data[data.length - 1].timestamp;
        if (!atBottom.current) setUnread(n => n + data.length);
      }
    } catch {}
  }, [ch]);

  useEffect(() => { setMsgs([]); lastTs.current = ''; setUnread(0); poll(); const iv = setInterval(poll, 2000); return () => clearInterval(iv); }, [ch, poll]);
  useEffect(() => { if (atBottom.current) { endRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnread(0); } }, [msgs]);

  async function send() {
    if (!input.trim() || sending || !callsign) return;
    setSending(true);
    try {
      await fetch('/api/cad/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callsign, channel: ch, content: input, type: 'RADIO' }) });
      setInput('');
      await poll();
      setTimeout(() => { atBottom.current = true; endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } finally { setSending(false); }
  }

  if (channels.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-xs text-white/25 px-4 text-center">Twoja rola nie ma dostępu do radia.</div>;
  }

  const chColor = CH_CFG[ch]?.color ?? '#818cf8';

  return (
    <div className="flex flex-col h-full">
      {/* Channel selector */}
      <div className="px-2 py-2 border-b border-white/[0.07] flex flex-wrap gap-1 flex-shrink-0 bg-[#0c0c10]">
        {channels.map(c => (
          <button key={c} onClick={() => setCh(c)}
            className={`text-xs px-2 py-1 rounded-md font-bold transition-all ${c === ch ? 'text-white' : 'text-white/25 hover:text-white/40'}`}
            style={c === ch ? { background: CH_CFG[c].color + '33', border: `1px solid ${CH_CFG[c].color}66` } : { border: '1px solid transparent' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {msgs.length === 0 && <div className="text-center text-white/25 text-xs pt-8">Brak transmisji na {ch}</div>}
        {msgs.map(m => (
          <div key={m.id} className="flex gap-2 hover:bg-white/[0.03] rounded px-1 py-0.5">
            <span className="text-white/25 font-mono text-xs flex-shrink-0 pt-0.5">{fmtTime(m.timestamp)}</span>
            <span className="font-bold text-xs flex-shrink-0" style={{ color: CH_CFG[m.channel]?.color ?? chColor }}>[{m.channel}]</span>
            <span className="text-white/40 text-xs flex-shrink-0">{m.callsign}:</span>
            <span className="text-white/80 text-xs break-words">{m.content}</span>
          </div>
        ))}
        {unread > 0 && !atBottom.current && (
          <div className="text-center text-xs text-white/25">↓ {unread} nowych</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/[0.07] flex-shrink-0">
        {!callsign ? (
          <p className="text-xs text-white/25 text-center py-1">Ustaw callsign aby nadawać</p>
        ) : (
          <div className="flex gap-2">
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-mono font-bold" style={{ color: chColor }}>{callsign}</span>
              <span className="text-white/25 text-xs">→</span>
            </div>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={`Nadaj na ${ch}…`}
              className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            <button onClick={send} disabled={sending || !input.trim()}
              className="disabled:opacity-40 text-white rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              style={{ background: chColor + '33', border: `1px solid ${chColor}55` }}>
              {sending ? <Spinner /> : '📡'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALLS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function CallsPanel({ role, callsign, readonly = false }: { role: CadRole; callsign: string; readonly?: boolean }) {
  const [calls, setCalls] = useState<CadCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nature: '', location: '', description: '', priority: 'MEDIUM' });
  const [creating, setCreating] = useState(false);
  const natures = CALL_NATURES[role] ?? [];

  const load = useCallback(async () => { try { setCalls(await fetch('/api/cad/calls').then(r => r.json())); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);

  async function createCall() {
    if (!form.nature || !form.location) return;
    setCreating(true);
    try {
      await fetch('/api/cad/calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setForm({ nature: '', location: '', description: '', priority: 'MEDIUM' });
      await load();
    } finally { setCreating(false); }
  }

  async function dispatch(id: string) {
    const call = calls.find(c => c.id === id);
    if (!call || !callsign) return;
    const already = call.dispatchedTo.includes(callsign);
    await fetch('/api/cad/calls', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, dispatchedTo: already ? call.dispatchedTo.filter(x => x !== callsign) : [...call.dispatchedTo, callsign], status: 'ACTIVE' }) });
    await load();
  }

  async function closeCall(id: string) {
    await fetch('/api/cad/calls', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'CLOSED' }) });
    await load();
  }

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Nowe zgłoszenie (nie dla readonly) */}
      {!readonly && natures.length > 0 && (
        <div className="bg-[#16161d] rounded-xl p-4 border border-white/[0.07] flex-shrink-0">
          <SLabel>Nowe zgłoszenie</SLabel>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select value={form.nature} onChange={e => setForm(p => ({ ...p, nature: e.target.value }))}
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2] transition-colors">
              <option value="">Rodzaj zdarzenia…</option>
              {natures.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2] transition-colors">
              {(['LOW','MEDIUM','HIGH','CRITICAL'] as CallPriority[]).map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Lokacja / adres…"
              className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            <button onClick={createCall} disabled={creating || !form.nature || !form.location}
              className="bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-40 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1">
              {creating ? <Spinner /> : '+ Utwórz'}
            </button>
          </div>
          {form.nature && (
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Opis (opcjonalnie)…"
              className="mt-2 w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
          )}
        </div>
      )}

      {/* Lista zgłoszeń */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && <div className="flex justify-center pt-8"><Spinner /></div>}
        {!loading && calls.length === 0 && <div className="text-center text-white/25 text-sm pt-8">Brak aktywnych zgłoszeń</div>}
        {calls.map(c => {
          const prio = PRIO_CFG[c.priority];
          const isDispatched = callsign && c.dispatchedTo.includes(callsign);
          return (
            <div key={c.id} className={`bg-[#16161d] rounded-xl border-l-4 border border-white/[0.07] p-4 transition-all ${prio.border} ${isDispatched ? 'ring-1 ring-[#5865F2]/40' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-white/25">#{c.number}</span>
                  <PrioBar priority={c.priority} />
                  <span className="text-sm font-semibold text-white">{c.nature}</span>
                </div>
                <span className="text-xs text-white/25 flex-shrink-0 font-mono">{fmtAgo(c.createdAt)}</span>
              </div>
              <div className="text-xs text-white/40 mb-1.5 flex items-center gap-1">
                <span className="text-white/25">📍</span> {c.location}
              </div>
              {c.description && <div className="text-xs text-white/25 mb-2">{c.description}</div>}
              {c.dispatchedTo.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {c.dispatchedTo.map(cs => <Pill key={cs} color="#5865F2">{cs}</Pill>)}
                </div>
              )}
              {!readonly && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-white/[0.07]">
                  {callsign && (
                    <button onClick={() => dispatch(c.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDispatched ? 'bg-[#5865F2]/20 text-[#818cf8] hover:bg-[#5865F2]/30 border border-[#5865F2]/40' : 'bg-white/5 text-white/40 hover:bg-white/10 border border-white/[0.07]'}`}>
                      {isDispatched ? '✓ W drodze' : '→ Dysponuj mnie'}
                    </button>
                  )}
                  <button onClick={() => closeCall(c.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                    Zamknij
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNITS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function UnitsPanel() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => { try { setUnits(await fetch('/api/cad/units').then(r => r.json())); } catch {} finally { setLoading(false); } };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  const grouped: Record<string, Unit[]> = {};
  units.forEach(u => { if (!grouped[u.service]) grouped[u.service] = []; grouped[u.service].push(u); });

  return (
    <div className="p-4 overflow-y-auto h-full space-y-4">
      {loading && <div className="flex justify-center pt-8"><Spinner /></div>}
      {!loading && units.length === 0 && <div className="text-center text-white/25 text-sm pt-8">Brak aktywnych jednostek</div>}
      {Object.entries(grouped).map(([service, serviceUnits]) => (
        <div key={service}>
          <SLabel>{service} ({serviceUnits.length})</SLabel>
          <div className="space-y-1.5">
            {serviceUnits.map(u => {
              const st = UNIT_STATUS[u.status] ?? UNIT_STATUS.OFFLINE;
              return (
                <div key={u.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-sm ${st.bg}`}>
                  <Dot color={st.color} />
                  <span className="font-mono font-bold text-white text-xs">{u.callsign}</span>
                  <span className="text-white/40 truncate flex-1 text-xs">{u.name}</span>
                  <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
                  <span className="text-xs text-white/25 font-mono">{fmtAgo(u.onDutySince)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WARRANTS PANEL
// ─────────────────────────────────────────────────────────────────────────────

function WarrantsPanel({ canAdd }: { canAdd: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Warrant[]>([]);
  const [form, setForm] = useState({ targetName: '', robloxName: '', reason: '' });
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await fetch(`/api/cad/warrants?name=${encodeURIComponent(query)}`).then(r => r.json())); }
      finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const load = async () => { try { setResults(await fetch('/api/cad/warrants').then(r => r.json())); } catch {} };
    if (query.length < 2) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addWarrant() {
    if (!form.targetName || !form.reason) return;
    setAdding(true);
    try {
      await fetch('/api/cad/warrants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setForm({ targetName: '', robloxName: '', reason: '' });
      setResults(await fetch('/api/cad/warrants').then(r => r.json()));
    } finally { setAdding(false); }
  }

  async function removeWarrant(id: string) {
    await fetch(`/api/cad/warrants?id=${id}`, { method: 'DELETE' });
    setResults(prev => prev.filter(w => w.id !== id));
  }

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj po nazwie gracza lub nicku Roblox…"
        className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors flex-shrink-0" />

      {canAdd && (
        <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4 flex-shrink-0">
          <SLabel>Nowy nakaz</SLabel>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={form.targetName} onChange={e => setForm(p => ({ ...p, targetName: e.target.value }))} placeholder="Imię i nazwisko RP…"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.robloxName} onChange={e => setForm(p => ({ ...p, robloxName: e.target.value }))} placeholder="Nick Roblox (opcja)…"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
          </div>
          <div className="flex gap-2">
            <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Powód…"
              className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            <button onClick={addWarrant} disabled={adding || !form.targetName || !form.reason}
              className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-40 text-red-400 rounded-lg px-4 py-2 text-xs font-semibold transition-colors">
              {adding ? <Spinner /> : '+ Nakaz'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && <div className="flex justify-center pt-4"><Spinner /></div>}
        {!loading && results.length === 0 && <div className="text-center text-white/25 text-sm pt-8">Brak aktywnych nakazów</div>}
        {results.map(w => (
          <div key={w.id} className="bg-[#16161d] border border-red-500/30 border-l-4 border-l-red-500 rounded-xl p-4">
            <div className="flex justify-between items-start mb-1.5">
              <span className="font-semibold text-sm text-red-400">{w.targetName}</span>
              {canAdd && <button onClick={() => removeWarrant(w.id)} className="text-xs text-white/25 hover:text-red-400 transition-colors">Unieważnij</button>}
            </div>
            {w.robloxName && <div className="text-xs text-white/25 mb-1">Roblox: {w.robloxName}</div>}
            <div className="text-xs text-white/40">{w.reason}</div>
            <div className="text-xs text-white/25 mt-2 font-mono">wystawił: {w.issuedByName} · {fmtDate(w.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLATES PANEL
// ─────────────────────────────────────────────────────────────────────────────

function PlatesPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PlateResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) { setResult(null); setNotFound(false); return; }
    const t = setTimeout(async () => {
      setLoading(true); setNotFound(false);
      try {
        const data = await fetch(`/api/cad/plates?q=${encodeURIComponent(query)}`).then(r => r.json());
        setResult(data[0] ?? null);
        setNotFound(!data[0]);
      } finally { setLoading(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="p-4 flex flex-col gap-4">
      <input value={query} onChange={e => setQuery(e.target.value.toUpperCase())} placeholder="Wpisz numer tablicy… (min 3 znaki)"
        className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white font-mono uppercase placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
      {loading && <div className="flex justify-center"><Spinner /></div>}
      {notFound && <div className="text-center text-white/25 text-sm">Nie znaleziono pojazdu</div>}
      {result && (
        <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-mono font-black text-xl text-white tracking-widest">{result.tablica}</span>
            <div className="flex gap-2">
              {result.owner.isArrested && <Pill color="#ef4444">ZATRZYMANY</Pill>}
              {result.owner.activeWarns > 0 && <Pill color="#f97316">WARNY: {result.owner.activeWarns}</Pill>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[['Marka', result.marka],['Model', result.model],['Rok', result.rok],['Kolor', result.kolor]].map(([l,v]) => (
              <div key={l as string} className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                <div className="text-white/25 mb-0.5">{l}</div>
                <div className="text-white font-medium">{v}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.07] pt-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-white/25">Właściciel</span>
              <span className="text-white font-medium">{result.owner.robloxName}</span>
            </div>
            {result.owner.phone && (
              <div className="flex justify-between">
                <span className="text-white/25">Telefon</span>
                <span className="text-white font-mono">{result.owner.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATROL LOG (OCHRONA / SM)
// ─────────────────────────────────────────────────────────────────────────────

interface PatrolEntry { id: string; time: string; type: 'START'|'END'|'NOTE'|'INCIDENT'; content: string; }

function PatrolLogPanel({ callsign, role }: { callsign: string; role: CadRole }) {
  const [log, setLog] = useState<PatrolEntry[]>([]);
  const [note, setNote] = useState('');
  const [onDuty, setOnDuty] = useState(false);

  function add(type: PatrolEntry['type'], content: string) {
    setLog(prev => [...prev, { id: Date.now().toString(), time: new Date().toISOString(), type, content }]);
  }

  function startDuty() { setOnDuty(true); add('START', `${callsign || 'JEDNOSTKA'} rozpoczął(a) służbę`); }
  function endDuty()   { setOnDuty(false); add('END',   `${callsign || 'JEDNOSTKA'} zakończył(a) służbę`); }
  function addNote()   { if (!note.trim()) return; add('NOTE', note); setNote(''); }

  const typeColor: Record<PatrolEntry['type'], string> = { START: '#22c55e', END: '#ef4444', NOTE: '#94a3b8', INCIDENT: '#f97316' };
  const typeLabel: Record<PatrolEntry['type'], string> = { START: '▶ Rozpoczęcie', END: '■ Zakończenie', NOTE: '📝 Notatka', INCIDENT: '⚠️ Incydent' };

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex gap-2 flex-shrink-0">
        {!onDuty
          ? <button onClick={startDuty} className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-[#22c55e] rounded-lg py-2.5 text-xs font-semibold transition-colors">▶ Rozpocznij służbę</button>
          : <button onClick={endDuty}   className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg py-2.5 text-xs font-semibold transition-colors">■ Zakończ służbę</button>
        }
      </div>
      {onDuty && (
        <div className="flex gap-2 flex-shrink-0">
          <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Dodaj notatkę do dziennika…"
            className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
          <button onClick={addNote} disabled={!note.trim()} className="bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/[0.07] text-white/40 rounded-lg px-3 text-xs transition-colors">Dodaj</button>
          <button onClick={() => add('INCIDENT', `Incydent ${new Date().toLocaleTimeString('pl-PL')}`)}
            className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg px-3 text-xs transition-colors">⚠️</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {log.length === 0 && <div className="text-center text-white/25 text-sm pt-8">Dziennik patrolu pusty</div>}
        {[...log].reverse().map(e => (
          <div key={e.id} className="flex gap-2 text-xs bg-[#16161d] border border-white/[0.07] rounded-xl px-3 py-2.5">
            <span className="text-white/25 font-mono text-xs flex-shrink-0">{fmtTime(e.time)}</span>
            <span className="flex-shrink-0 font-medium text-xs" style={{ color: typeColor[e.type] }}>{typeLabel[e.type]}</span>
            <span className="text-white/40 text-xs">{e.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RIDE LOG (TAKSÓWKARZ / KIEROWCA BUS)
// ─────────────────────────────────────────────────────────────────────────────

interface Ride { id: string; from: string; to: string; passenger: string; fare?: number; startTime: string; endTime?: string; }

function RideLogPanel({ role }: { role: CadRole }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [form, setForm] = useState({ from: '', to: '', passenger: '', fare: '' });
  const [active, setActive] = useState<Ride | null>(null);

  function startRide() {
    if (!form.from || !form.to) return;
    const ride: Ride = { id: Date.now().toString(), from: form.from, to: form.to, passenger: form.passenger || 'Pasażer', fare: form.fare ? parseInt(form.fare) : undefined, startTime: new Date().toISOString() };
    setActive(ride);
    setForm({ from: '', to: '', passenger: '', fare: '' });
  }
  function endRide() {
    if (!active) return;
    setRides(prev => [{ ...active, endTime: new Date().toISOString() }, ...prev]);
    setActive(null);
  }

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {active ? (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex-shrink-0">
          <div className="text-sm font-semibold text-[#22c55e] mb-3 flex items-center gap-2">🚗 Kurs w toku</div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
              <div className="text-white/25 mb-0.5">Z</div>
              <div className="text-white">{active.from}</div>
            </div>
            <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
              <div className="text-white/25 mb-0.5">Do</div>
              <div className="text-white">{active.to}</div>
            </div>
            <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
              <div className="text-white/25 mb-0.5">Pasażer</div>
              <div className="text-white">{active.passenger}</div>
            </div>
            {active.fare && (
              <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                <div className="text-white/25 mb-0.5">Opłata</div>
                <div className="text-white">{active.fare} $</div>
              </div>
            )}
          </div>
          <button onClick={endRide} className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-[#22c55e] rounded-lg py-2 text-xs font-semibold transition-colors">✓ Zakończ kurs</button>
        </div>
      ) : (
        <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4 flex-shrink-0">
          <SLabel>Nowy kurs</SLabel>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))} placeholder="Odbiór…"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} placeholder="Cel…"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.passenger} onChange={e => setForm(p => ({ ...p, passenger: e.target.value }))} placeholder="Pasażer (opcja)…"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.fare} onChange={e => setForm(p => ({ ...p, fare: e.target.value }))} placeholder="Opłata $" type="number"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
          </div>
          <button onClick={startRide} disabled={!form.from || !form.to}
            className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-40 border border-yellow-500/30 text-yellow-400 rounded-lg py-2 text-xs font-semibold transition-colors">
            🚗 Rozpocznij kurs
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        <SLabel>Historia kursów ({rides.length})</SLabel>
        {rides.length === 0 && <div className="text-center text-white/25 text-sm pt-4">Brak zakończonych kursów</div>}
        {rides.map(r => (
          <div key={r.id} className="bg-[#16161d] border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-white/40">{r.from} → {r.to}</span>
              {r.fare && <span className="text-yellow-400 font-mono font-semibold">{r.fare}$</span>}
            </div>
            <div className="text-xs text-white/25 font-mono">{r.passenger} · {fmtDate(r.startTime)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY CALL (CYWIL / każdy)
// ─────────────────────────────────────────────────────────────────────────────

function EmergencyCallPanel({ onSent }: { onSent?: () => void }) {
  const [form, setForm] = useState({ nature: '', location: '', description: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const natures = ['Wypadek drogowy','Pożar','Napad / rabunek','Osoba nieprzytomna','Strzelanina','Bójka','Awaria gazowa','Inne nagłe'];

  async function submit() {
    if (!form.nature || !form.location) return;
    setSending(true);
    try {
      await fetch('/api/cad/calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, priority: 'HIGH' }) });
      setDone(true);
      setTimeout(() => { setDone(false); setForm({ nature: '', location: '', description: '' }); onSent?.(); }, 5000);
    } finally { setSending(false); }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center text-3xl">✅</div>
        <div className="text-[#22c55e] font-bold text-lg">Zgłoszenie wysłane!</div>
        <div className="text-white/40 text-sm">Służby zostały powiadomione. Pozostań na miejscu i czekaj na pomoc.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto w-full">
      <div className="text-center py-2">
        <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🆘</div>
        <h2 className="text-lg font-bold text-white">Zgłoszenie awaryjne 112</h2>
        <p className="text-white/25 text-xs mt-1">Zgłoś zdarzenie służbom ratunkowym</p>
      </div>
      <div>
        <SLabel>Rodzaj zdarzenia *</SLabel>
        <div className="grid grid-cols-2 gap-2">
          {natures.map(n => (
            <button key={n} onClick={() => setForm(p => ({ ...p, nature: n }))}
              className={`text-xs px-3 py-2.5 rounded-xl border transition-all text-left ${form.nature === n ? 'border-red-500/60 bg-red-500/20 text-red-300' : 'border-white/[0.07] bg-[#16161d] text-white/40 hover:border-red-500/30 hover:text-white'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <SLabel>Dokładna lokalizacja *</SLabel>
        <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Ulica, skrzyżowanie, budynek…"
          className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors" />
      </div>
      <div>
        <SLabel>Opis sytuacji</SLabel>
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Opisz co się stało…"
          className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 resize-none transition-colors" />
      </div>
      <button onClick={submit} disabled={sending || !form.nature || !form.location}
        className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl py-3 font-bold text-sm transition-colors">
        {sending ? '📡 Wysyłanie…' : '🆘 Wyślij zgłoszenie do służb'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP PANEL (interaktywna mapa z pinezkami lokacji)
// ─────────────────────────────────────────────────────────────────────────────

function MapPanel({
  locations,
  selectedLocation,
  onLocationSelect,
  mapImageUrl,
}: {
  locations: Location[];
  selectedLocation: Location;
  onLocationSelect: (loc: Location) => void;
  mapImageUrl?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col bg-[#0c0c10] relative overflow-hidden">
      {/* Map background */}
      <div className="flex-1 relative">
        {mapImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mapImageUrl} alt="Mapa Greenville" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        ) : (
          <>
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #5865F2 0%, transparent 60%)' }} />
            {/* Grid lines placeholder */}
            <div className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'linear-gradient(#818cf8 1px, transparent 1px), linear-gradient(90deg, #818cf8 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            {/* City label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
              <div className="text-6xl opacity-20">🗺️</div>
              <p className="text-white/25 text-xs text-center px-4">
                Mapa Greenville RP<br />
                <span className="text-white/10">Wgraj w Ustawieniach → CAD → URL mapy</span>
              </p>
            </div>
          </>
        )}

        {/* Location pins */}
        {locations.map(loc => {
          const coords = LOCATION_COORDS[loc.id] ?? { x: 50, y: 50 };
          const isSelected = selectedLocation.id === loc.id;
          const isHovered  = hovered === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => onLocationSelect(loc)}
              onMouseEnter={() => setHovered(loc.id)}
              onMouseLeave={() => setHovered(null)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 group"
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              title={loc.name}
            >
              {/* Tooltip */}
              {(isHovered || isSelected) && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap
                  bg-[#16161d] border border-white/[0.07] rounded-lg px-2.5 py-1 text-xs font-semibold text-white shadow-xl pointer-events-none"
                  style={isSelected ? { borderColor: '#5865F2', color: '#818cf8' } : {}}>
                  {loc.emoji} {loc.name}
                </div>
              )}
              {/* Pin */}
              <div className={`
                flex items-center justify-center rounded-full border-2 text-base transition-all duration-150
                ${isSelected
                  ? 'w-10 h-10 bg-[#5865F2] border-[#818cf8] shadow-lg shadow-[#5865F2]/40'
                  : 'w-8 h-8 bg-[#16161d]/90 border-white/[0.07] hover:border-[#5865F2]/60 hover:bg-[#16161d] hover:scale-110'}
              `}>
                {loc.emoji}
              </div>
              {/* Pulse ring for selected */}
              {isSelected && (
                <div className="absolute inset-0 rounded-full border-2 border-[#5865F2]/40 animate-ping pointer-events-none" />
              )}
            </button>
          );
        })}

        {/* Bottom info bar */}
        <div className="absolute bottom-3 left-3 bg-[#0c0c10]/90 border border-white/[0.07] rounded-xl px-3 py-2 backdrop-blur-sm z-20 max-w-xs">
          <div className="text-xs text-white/25 mb-0.5">Twoja lokacja (Proximity Chat)</div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span>{selectedLocation.emoji}</span>
            <span>{selectedLocation.name}</span>
          </div>
        </div>

        {/* Help hint */}
        <div className="absolute bottom-3 right-3 bg-[#0c0c10]/80 border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-xs text-white/25 z-20">
          Kliknij pinezką aby dołączyć do chatu lokacji
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAFF PANEL (ADMIN / MOD / STAFF — zamiast dashboardu)
// ─────────────────────────────────────────────────────────────────────────────

interface AppItem {
  id: string;
  type: string;
  status: string;
  content: string;
  createdAt: string;
  user: { discordUsername: string; robloxUsername?: string | null; discordId: string } | null;
}
interface PlayerItem {
  id: string;
  discordId: string;
  discordUsername: string;
  robloxUsername?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}
interface SessionItem {
  id: string;
  status: string;
  date: string;
  description?: string | null;
  _count: { signups: number };
}

const SESSION_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  UPCOMING:  { label: 'Nadchodząca', color: '#3b82f6', bg: 'bg-blue-500/10 border-blue-500/30' },
  ONGOING:   { label: '🟢 Trwa teraz', color: '#22c55e', bg: 'bg-green-500/10 border-green-500/30' },
  ENDED:     { label: 'Zakończona',  color: '#6b7280', bg: 'bg-gray-500/10 border-gray-500/20' },
  CANCELLED: { label: 'Odwołana',   color: '#ef4444', bg: 'bg-red-500/10 border-red-500/20' },
};

function PodaniaPanel() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setApps(await fetch('/api/applications?status=PENDING&type=SERVICE').then(r => r.ok ? r.json() : [])); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, action: 'ACCEPTED' | 'REJECTED') {
    setActing(id);
    try {
      await fetch('/api/review-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, action }),
      });
      await load();
    } finally { setActing(null); }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center justify-between flex-shrink-0">
        <SLabel>Oczekujące podania ({apps.length})</SLabel>
        <button onClick={load} className="text-xs text-white/25 hover:text-white/40 transition-colors">↻ Odśwież</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && <div className="flex justify-center pt-8"><Spinner /></div>}
        {!loading && apps.length === 0 && (
          <div className="text-center py-12">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-white/25 text-sm">Brak oczekujących podań</p>
          </div>
        )}
        {apps.map(app => (
          <div key={app.id} className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-xs font-semibold text-white">{app.user?.discordUsername ?? '?'}</div>
                {app.user?.robloxUsername && <div className="text-xs text-white/25">@{app.user.robloxUsername}</div>}
              </div>
              <span className="text-xs text-white/25 font-mono flex-shrink-0">{fmtAgo(app.createdAt)}</span>
            </div>
            <div className="text-xs text-white/40 mb-3 line-clamp-4 leading-relaxed">{app.content}</div>
            <div className="flex gap-2 pt-2 border-t border-white/[0.07]">
              <button onClick={() => review(app.id, 'ACCEPTED')} disabled={acting === app.id}
                className="flex-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-[#22c55e] rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:opacity-40">
                {acting === app.id ? '…' : '✓ Akceptuj'}
              </button>
              <button onClick={() => review(app.id, 'REJECTED')} disabled={acting === app.id}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:opacity-40">
                ✕ Odrzuć
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraczePanel({ accessLevel }: { accessLevel: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [warnTarget, setWarnTarget] = useState<{ id: string; name: string } | null>(null);
  const [warnReason, setWarnReason] = useState('');
  const [acting, setActing] = useState(false);
  const [warnDone, setWarnDone] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await fetch(`/api/players/search?q=${encodeURIComponent(query)}`).then(r => r.ok ? r.json() : [])); }
      catch {} finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  async function issueWarn() {
    if (!warnTarget || !warnReason.trim()) return;
    setActing(true);
    try {
      await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: warnTarget.id, type: 'WARN', reason: warnReason }),
      });
      setWarnDone(true);
      setTimeout(() => { setWarnTarget(null); setWarnReason(''); setWarnDone(false); }, 2000);
    } finally { setActing(false); }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <input value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Szukaj gracza (nick Discord lub Roblox)…"
        className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors flex-shrink-0" />

      {/* Warn form */}
      {warnTarget && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex-shrink-0">
          {warnDone ? (
            <div className="text-center text-[#22c55e] text-xs font-semibold py-1">✅ Warn wystawiony dla {warnTarget.name}</div>
          ) : (
            <>
              <div className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Ostrzeżenie → {warnTarget.name}</div>
              <input value={warnReason} onChange={e => setWarnReason(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && issueWarn()}
                placeholder="Powód ostrzeżenia…"
                className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-yellow-500/50 mb-2 transition-colors" />
              <div className="flex gap-2">
                <button onClick={issueWarn} disabled={acting || !warnReason.trim()}
                  className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 disabled:opacity-40 text-yellow-400 rounded-lg py-1.5 text-xs font-semibold transition-colors">
                  {acting ? '…' : '⚠️ Wyślij warn'}
                </button>
                <button onClick={() => setWarnTarget(null)} className="px-3 text-xs text-white/25 hover:text-white/40 transition-colors">Anuluj</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {searching && <div className="flex justify-center pt-4"><Spinner /></div>}
        {!searching && query.length >= 2 && results.length === 0 && (
          <div className="text-center text-white/25 text-xs pt-6">Nie znaleziono gracza</div>
        )}
        {query.length < 2 && !searching && (
          <div className="text-center text-white/25 text-xs pt-6">Wpisz min. 2 znaki aby szukać</div>
        )}
        {results.map(p => (
          <div key={p.id} className="bg-[#16161d] border border-white/[0.07] rounded-xl p-3">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <div className="text-xs font-semibold text-white">{p.discordUsername}</div>
                {p.robloxUsername && <div className="text-xs text-white/25">Roblox: @{p.robloxUsername}</div>}
                <div className="text-xs text-white/10 font-mono mt-0.5">{p.discordId}</div>
              </div>
              {p.verifiedAt
                ? <span className="text-xs text-[#22c55e] flex-shrink-0">✓ Zweryfik.</span>
                : <span className="text-xs text-yellow-500 flex-shrink-0">⚠ Niezweryf.</span>
              }
            </div>
            {accessLevel >= 2 && (
              <button onClick={() => { setWarnTarget({ id: p.id, name: p.discordUsername }); setWarnReason(''); }}
                className="text-xs bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 rounded-lg px-3 py-1 transition-colors mt-1">
                ⚠️ Warn
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SesjePanel() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/sessions').then(r => r.ok ? r.json() : []).then(setSessions).catch(() => setSessions([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <SLabel>Sesje RP</SLabel>
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && <div className="flex justify-center pt-8"><Spinner /></div>}
        {!loading && sessions.length === 0 && <div className="text-center text-white/25 text-sm pt-8">Brak sesji</div>}
        {sessions.map(s => {
          const cfg = SESSION_STATUS_CFG[s.status] ?? SESSION_STATUS_CFG.ENDED;
          return (
            <div key={s.id} className={`rounded-xl border p-4 ${cfg.bg}`}>
              <div className="flex justify-between items-start mb-1.5">
                <span className="text-xs font-semibold text-white">
                  {new Date(s.date).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              {s.description && <div className="text-xs text-white/40 mb-1">{s.description}</div>}
              <div className="text-xs text-white/25">👥 {s._count.signups} zapisanych</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type StaffSubTab = 'podania' | 'gracze' | 'sesje';

function StaffPanel({ accessLevel }: { accessLevel: number }) {
  const tabs = [
    { id: 'podania' as StaffSubTab, label: '📋 Podania', minLevel: 1 },
    { id: 'sesje'   as StaffSubTab, label: '🎪 Sesje',   minLevel: 1 },
    { id: 'gracze'  as StaffSubTab, label: '🔍 Gracze',  minLevel: 2 },
  ].filter(t => accessLevel >= t.minLevel);

  const [tab, setTab] = useState<StaffSubTab>(tabs[0]?.id ?? 'podania');

  const roleBadge = accessLevel >= 4 ? { label: '👑 Owner', color: '#f59e0b' }
                  : accessLevel >= 3 ? { label: '🔴 Admin', color: '#ef4444' }
                  : accessLevel >= 2 ? { label: '🟠 Mod',   color: '#f97316' }
                  :                    { label: '🟡 Staff',  color: '#eab308' };

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="border-b border-white/[0.07] flex items-end px-3 pt-2 gap-1 bg-[#0c0c10] flex-shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap
              ${tab === t.id ? 'text-white border-b-[#5865F2] bg-[#5865F2]/10' : 'text-white/25 border-b-transparent hover:text-white/40'}`}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto mb-1.5 flex-shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-md font-bold"
            style={{ background: roleBadge.color + '20', color: roleBadge.color, border: `1px solid ${roleBadge.color}35` }}>
            {roleBadge.label}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'podania' && <PodaniaPanel />}
        {tab === 'sesje'   && <SesjePanel />}
        {tab === 'gracze'  && <GraczePanel accessLevel={accessLevel} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER PANEL (przeniesiony z /portal)
// ─────────────────────────────────────────────────────────────────────────────

interface PortalUser {
  robloxUsername?: string | null;
  character?: { firstName: string; lastName: string; gender: string; documentId: string; peselRp: string } | null;
  vehicles?: Array<{ id: string; marka: string; model: string; rok: number; tablica: string }>;
  licenses?: Array<{ id: string; kategoria: string }>;
  finesReceived?: Array<{ id: string }>;
  casesAsTarget?: Array<{ type: string }>;
  arrests?: Array<{ id: string }>;
  dutyLogs?: Array<{ action: string; service: string; createdAt: string }>;
}
interface PortalSession {
  status: string;
  date: string;
  description?: string | null;
  signups: Array<{ userId: string }>;
}

function PlayerPanel({ hasSession }: { hasSession: boolean }) {
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [upcoming, setUpcoming] = useState<PortalSession | null>(null);
  const [ongoing, setOngoing] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSession) { setLoading(false); return; }
    fetch('/api/portal/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setPortalUser(d.user); setUpcoming(d.upcomingSession); setOngoing(d.ongoingSession); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [hasSession]);

  if (!hasSession) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="text-4xl">👤</div>
        <p className="text-white/25 text-sm">Zaloguj się, aby zobaczyć swój panel gracza</p>
        <button onClick={() => signIn('discord')} className="text-xs bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#818cf8] rounded-lg px-4 py-2 transition-colors font-medium">
          Zaloguj przez Discord
        </button>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

  const u = portalUser;
  const isArrested    = (u?.arrests?.length ?? 0) > 0;
  const activeWarns   = u?.casesAsTarget?.filter(c => c.type === 'WARN').length ?? 0;
  const activeFines   = u?.finesReceived?.length ?? 0;
  const isVerified    = !!u?.robloxUsername;
  const activeSession = ongoing ?? upcoming;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">

      {/* ALERT: zatrzymany */}
      {isArrested && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🚔</span>
          <div>
            <div className="font-bold text-red-400 text-sm">JESTEŚ ZATRZYMANY/A</div>
            <div className="text-xs text-white/60">Poczekaj na zwolnienie przez Policję</div>
          </div>
        </div>
      )}

      {/* Niezweryfikowany */}
      {!isVerified && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-yellow-400 text-xs font-semibold mb-1">Konto niezweryfikowane</p>
          <p className="text-white/25 text-xs">Połącz konto Roblox na Discordzie (<span className="text-[#22c55e]">/weryfikacja</span>)</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Pojazdy',     value: u?.vehicles?.length ?? 0,  color: '#22c55e' },
          { label: 'Prawa jazdy', value: u?.licenses?.length ?? 0,  color: '#00c8ff' },
          { label: 'Warny',       value: activeWarns,                color: activeWarns > 0 ? '#eab308' : '#475569' },
          { label: 'Mandaty',     value: activeFines,                color: activeFines > 0 ? '#ef4444' : '#475569' },
        ].map(s => (
          <div key={s.label} className="bg-[#16161d] border border-white/[0.07] rounded-xl p-3 text-center">
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/25 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Postać */}
      <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span>🪪</span>
          <span className="text-xs font-semibold text-white">Moja postać</span>
        </div>
        {u?.character ? (
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-white/25">Imię i nazwisko</span>
              <span className="text-white font-medium">{u.character.firstName} {u.character.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/25">Płeć</span>
              <span className="text-white/40">{u.character.gender}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/25">Nr dokumentu</span>
              <span className="font-mono blur-sm hover:blur-none transition-all cursor-pointer text-white/40">{u.character.documentId}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/25">Brak postaci. Użyj <span className="text-[#22c55e]">#tworzenie-postaci</span> na Discordzie.</p>
        )}
      </div>

      {/* Pojazdy */}
      {(u?.vehicles?.length ?? 0) > 0 && (
        <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>🚗</span>
            <span className="text-xs font-semibold text-white">Moje pojazdy</span>
          </div>
          <div className="space-y-1.5">
            {u!.vehicles!.slice(0, 5).map(v => (
              <div key={v.id} className="flex justify-between items-center text-xs">
                <span className="text-white/40">{v.marka} {v.model} ({v.rok})</span>
                <span className="font-mono text-[#22c55e] font-semibold">{v.tablica}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prawa jazdy */}
      {(u?.licenses?.length ?? 0) > 0 && (
        <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>🪪</span>
            <span className="text-xs font-semibold text-white">Prawa jazdy</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {u!.licenses!.map(l => (
              <span key={l.id} className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{ background: '#22c55e18', border: '1px solid #22c55e30', color: '#22c55e' }}>
                ✅ Kat. {l.kategoria}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sesja RP */}
      {activeSession && (
        <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>🎪</span>
            <span className="text-xs font-semibold text-white">Sesja RP</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium mb-2
            ${activeSession.status === 'ONGOING' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
            {activeSession.status === 'ONGOING' ? '🟢 Trwa teraz' : '🔵 Planowana'}
          </div>
          <div className="text-xs text-white/70">
            {new Date(activeSession.date).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          {activeSession.description && <div className="text-xs text-white/25 mt-1">{activeSession.description}</div>}
          <div className="text-xs text-white/25 mt-1">👥 {activeSession.signups.length} zapisanych</div>
        </div>
      )}

      {/* Ostatnie służby */}
      {(u?.dutyLogs?.length ?? 0) > 0 && (
        <div className="bg-[#16161d] border border-[#00c8ff]/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span>🚔</span>
            <span className="text-xs font-semibold text-[#00c8ff]">Ostatnie służby</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {u!.dutyLogs!.slice(0, 4).map((log, i) => (
              <div key={i} className="bg-[#0c0c10] border border-white/[0.07] rounded-lg p-2 text-center">
                <div className={`text-xs font-medium ${log.action === 'ON_DUTY' ? 'text-green-400' : 'text-red-400'}`}>
                  {log.action === 'ON_DUTY' ? '🟢 ON' : '🔴 OFF'}
                </div>
                <div className="text-xs text-white/25 mt-0.5 truncate">{log.service}</div>
                <div className="text-xs text-white/25/60">{new Date(log.createdAt).toLocaleDateString('pl-PL')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARRESTS PANEL (POLICJA / ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

interface ArrestRecord { id: string; targetName: string; robloxName?: string; officerName: string; reason: string; charges: string[]; active: boolean; createdAt: string; }

function ArrestsPanel({ canAdd, callsign }: { canAdd: boolean; callsign: string }) {
  const [records, setRecords] = useState<ArrestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ targetName: '', robloxName: '', reason: '', charges: '' });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setRecords(await fetch('/api/cad/arrests').then(r => r.ok ? r.json() : [])); }
    catch { setRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  async function arrest() {
    if (!form.targetName || !form.reason) return;
    setAdding(true);
    try {
      await fetch('/api/cad/arrests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, charges: form.charges.split(',').map(s => s.trim()).filter(Boolean), officerCallsign: callsign }),
      });
      setForm({ targetName: '', robloxName: '', reason: '', charges: '' });
      setShowForm(false);
      await load();
    } finally { setAdding(false); }
  }

  async function release(id: string) {
    await fetch(`/api/cad/arrests?id=${id}`, { method: 'PATCH' });
    await load();
  }

  const filtered = records.filter(r => !query || r.targetName.toLowerCase().includes(query.toLowerCase()) || r.robloxName?.toLowerCase().includes(query.toLowerCase()));
  const active = filtered.filter(r => r.active);
  const released = filtered.filter(r => !r.active);

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      {/* Toolbar */}
      <div className="flex gap-2 flex-shrink-0">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Szukaj zatrzymanego…"
          className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
        {canAdd && (
          <button onClick={() => setShowForm(p => !p)}
            className="bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-red-400 rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap">
            {showForm ? '✕ Anuluj' : '+ Zatrzymaj'}
          </button>
        )}
        <button onClick={load} className="bg-white/5 hover:bg-white/10 border border-white/[0.07] text-white/30 rounded-lg px-3 py-2 text-xs transition-colors">↻</button>
      </div>

      {/* Form */}
      {showForm && canAdd && (
        <div className="bg-[#16161d] border border-red-500/20 rounded-xl p-4 flex-shrink-0 space-y-2">
          <SLabel>Nowe zatrzymanie</SLabel>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.targetName} onChange={e => setForm(p => ({...p, targetName: e.target.value}))} placeholder="Imię i nazwisko RP *"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors" />
            <input value={form.robloxName} onChange={e => setForm(p => ({...p, robloxName: e.target.value}))} placeholder="Nick Roblox"
              className="bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors" />
          </div>
          <input value={form.charges} onChange={e => setForm(p => ({...p, charges: e.target.value}))} placeholder="Zarzuty (oddziel przecinkami) np. Rozbój, Nielegalna broń"
            className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors" />
          <input value={form.reason} onChange={e => setForm(p => ({...p, reason: e.target.value}))} placeholder="Opis zdarzenia / podstawa prawna *"
            className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-colors" />
          <button onClick={arrest} disabled={adding || !form.targetName || !form.reason}
            className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-40 text-red-400 rounded-lg py-2 text-xs font-bold transition-colors">
            {adding ? 'Zatrzymywanie…' : '🚔 Potwierdź zatrzymanie'}
          </button>
        </div>
      )}

      {/* Lists */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {loading && <div className="flex justify-center pt-8"><Spinner /></div>}
        {!loading && (
          <>
            {/* Active */}
            <div>
              <SLabel>Aktywne zatrzymania ({active.length})</SLabel>
              {active.length === 0 && <div className="text-center text-white/25 text-xs py-4">Brak aktywnych zatrzymań</div>}
              <div className="space-y-2">
                {active.map(r => (
                  <div key={r.id} className="bg-[#16161d] border border-red-500/30 border-l-4 border-l-red-500 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1.5">
                      <div>
                        <span className="font-semibold text-sm text-red-300">{r.targetName}</span>
                        {r.robloxName && <span className="text-xs text-white/30 ml-2 font-mono">{r.robloxName}</span>}
                      </div>
                      {canAdd && (
                        <button onClick={() => release(r.id)} className="text-xs text-white/25 hover:text-green-400 border border-white/[0.07] hover:border-green-500/30 rounded px-2 py-0.5 transition-colors">
                          Zwolnij
                        </button>
                      )}
                    </div>
                    {r.charges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {r.charges.map((c, i) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-300">{c}</span>)}
                      </div>
                    )}
                    <div className="text-xs text-white/30">{r.reason}</div>
                    <div className="text-xs text-white/20 mt-1.5 font-mono">zatrzymał: {r.officerName} · {fmtDate(r.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Released */}
            {released.length > 0 && (
              <div>
                <SLabel>Zwolnieni ({released.length})</SLabel>
                <div className="space-y-1.5">
                  {released.slice(0, 10).map(r => (
                    <div key={r.id} className="bg-[#16161d] border border-white/[0.07] rounded-xl px-3 py-2.5 opacity-50">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/40">{r.targetName} {r.robloxName && <span className="text-white/20">· {r.robloxName}</span>}</span>
                        <span className="text-white/20 font-mono">{fmtDate(r.createdAt)}</span>
                      </div>
                      {r.charges.length > 0 && <div className="text-xs text-white/20 mt-0.5">{r.charges.join(', ')}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEDICAL PANEL (EMS / RATOWNIK)
// ─────────────────────────────────────────────────────────────────────────────

type PatientStatus = 'STABLE' | 'CRITICAL' | 'DECEASED' | 'TREATED';

interface Patient {
  id: string;
  name: string;
  robloxName?: string;
  condition: string;
  location: string;
  status: PatientStatus;
  notes: string;
  assignedTo: string;
  createdAt: string;
}

const PATIENT_STATUS_CFG: Record<PatientStatus, { label: string; color: string }> = {
  STABLE:   { label: 'Stabilny',    color: '#22c55e' },
  CRITICAL: { label: 'Krytyczny',   color: '#ef4444' },
  DECEASED: { label: 'Zgon',        color: '#6b7280' },
  TREATED:  { label: 'Wyleczony',   color: '#3b82f6' },
};

const MEDICAL_CONDITIONS = ['Wypadek drogowy','Zawał serca','Udar','Rana postrzałowa','Rana kłuta','Złamanie','Utonięcie','Przedawkowanie','Poparzenie','Utrata przytomności','Inne'];

function MedicalPanel({ cadRole, callsign }: { cadRole: CadRole; callsign: string }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState({ name: '', robloxName: '', condition: '', location: '', notes: '' });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [noteInput, setNoteInput] = useState('');

  function addPatient() {
    if (!form.name || !form.condition) return;
    const p: Patient = {
      id: Date.now().toString(),
      ...form,
      status: 'CRITICAL',
      assignedTo: callsign || cadRole,
      createdAt: new Date().toISOString(),
    };
    setPatients(prev => [p, ...prev]);
    setForm({ name: '', robloxName: '', condition: '', location: '', notes: '' });
    setShowForm(false);
    setSelected(p);
  }

  function updateStatus(id: string, status: PatientStatus) {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
  }

  function addNote(id: string) {
    if (!noteInput.trim()) return;
    const note = `[${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}] ${noteInput}`;
    setPatients(prev => prev.map(p => p.id === id ? { ...p, notes: p.notes ? p.notes + '\n' + note : note } : p));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, notes: prev.notes ? prev.notes + '\n' + note : note } : prev);
    setNoteInput('');
  }

  const active = patients.filter(p => p.status !== 'TREATED' && p.status !== 'DECEASED');
  const closed = patients.filter(p => p.status === 'TREATED' || p.status === 'DECEASED');

  return (
    <div className="flex h-full min-h-0">
      {/* Left: patient list */}
      <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="p-3 border-b border-white/[0.06] flex-shrink-0 flex gap-2">
          <button onClick={() => { setShowForm(p => !p); setSelected(null); }}
            className="flex-1 bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-400 rounded-lg py-2 text-xs font-semibold transition-colors">
            {showForm ? '✕ Anuluj' : '+ Nowy pacjent'}
          </button>
        </div>

        {showForm && (
          <div className="p-3 border-b border-white/[0.06] space-y-2 flex-shrink-0 bg-pink-500/5">
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Imię i nazwisko RP *"
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
            <input value={form.robloxName} onChange={e => setForm(p => ({...p, robloxName: e.target.value}))} placeholder="Nick Roblox"
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
            <select value={form.condition} onChange={e => setForm(p => ({...p, condition: e.target.value}))}
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-colors">
              <option value="">Rodzaj urazu *</option>
              {MEDICAL_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder="Lokalizacja"
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
            <button onClick={addPatient} disabled={!form.name || !form.condition}
              className="w-full bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 disabled:opacity-40 text-pink-400 rounded-lg py-1.5 text-xs font-bold transition-colors">
              Przyjmij pacjenta
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {active.length === 0 && closed.length === 0 && (
            <div className="text-center text-white/25 text-xs pt-8">Brak pacjentów</div>
          )}
          {[...active, ...closed].map(p => {
            const sc = PATIENT_STATUS_CFG[p.status];
            return (
              <button key={p.id} onClick={() => { setSelected(p); setShowForm(false); }}
                className="w-full text-left px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                style={{ background: selected?.id === p.id ? 'rgba(88,101,242,0.06)' : undefined }}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-semibold text-white/80 truncate">{p.name}</span>
                  <span className="text-xs ml-2 flex-shrink-0 font-bold" style={{ color: sc.color }}>{sc.label}</span>
                </div>
                <div className="text-xs text-white/30 truncate">{p.condition} · {p.location || '—'}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: patient details */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">🚑</div>
              <p className="text-white/25 text-sm">Wybierz pacjenta lub dodaj nowego</p>
            </div>
          </div>
        ) : (
          <>
            {/* Patient header */}
            <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-white">{selected.name}</h3>
                  {selected.robloxName && <div className="text-xs text-white/30 font-mono">{selected.robloxName}</div>}
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: PATIENT_STATUS_CFG[selected.status].color + '20', color: PATIENT_STATUS_CFG[selected.status].color }}>
                    {PATIENT_STATUS_CFG[selected.status].label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Uraz</div>
                  <div className="text-white">{selected.condition}</div>
                </div>
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Lokalizacja</div>
                  <div className="text-white">{selected.location || '—'}</div>
                </div>
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Przydzielony</div>
                  <div className="text-white font-mono">{selected.assignedTo}</div>
                </div>
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Czas</div>
                  <div className="text-white font-mono">{fmtAgo(selected.createdAt)} temu</div>
                </div>
              </div>
              {/* Status change */}
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(PATIENT_STATUS_CFG) as PatientStatus[]).map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
                    style={{
                      background: selected.status === s ? PATIENT_STATUS_CFG[s].color + '20' : 'transparent',
                      border: `1px solid ${selected.status === s ? PATIENT_STATUS_CFG[s].color + '40' : 'rgba(255,255,255,0.07)'}`,
                      color: selected.status === s ? PATIENT_STATUS_CFG[s].color : 'rgba(255,255,255,0.3)',
                    }}>
                    {PATIENT_STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
              <SLabel>Notatki medyczne</SLabel>
              <div className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-xl p-3 overflow-y-auto text-xs text-white/40 font-mono whitespace-pre-wrap min-h-0">
                {selected.notes || <span className="text-white/20">Brak notatek…</span>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <input value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote(selected.id)}
                  placeholder="Dodaj notatkę medyczną…"
                  className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-pink-500/50 transition-colors" />
                <button onClick={() => addNote(selected.id)} disabled={!noteInput.trim()}
                  className="bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 disabled:opacity-40 text-pink-400 rounded-lg px-3 text-xs transition-colors">Dodaj</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRE PANEL (STRAŻ POŻARNA)
// ─────────────────────────────────────────────────────────────────────────────

type FireType = 'BUILDING' | 'VEHICLE' | 'FOREST' | 'INDUSTRIAL' | 'EXPLOSION' | 'GAS_LEAK' | 'RESCUE' | 'OTHER';
type FireStatus = 'ACTIVE' | 'CONTAINED' | 'EXTINGUISHED';

interface FireIncident {
  id: string;
  type: FireType;
  location: string;
  status: FireStatus;
  hazards: string[];
  casualties: number;
  notes: string;
  assignedTo: string;
  createdAt: string;
}

const FIRE_TYPE_CFG: Record<FireType, { label: string; icon: string }> = {
  BUILDING:    { label: 'Pożar budynku',   icon: '🏠' },
  VEHICLE:     { label: 'Pożar pojazdu',   icon: '🚗' },
  FOREST:      { label: 'Pożar lasu',      icon: '🌲' },
  INDUSTRIAL:  { label: 'Pożar przemysłowy', icon: '🏭' },
  EXPLOSION:   { label: 'Wybuch',          icon: '💥' },
  GAS_LEAK:    { label: 'Wyciek gazu',     icon: '⚠️' },
  RESCUE:      { label: 'Ratownictwo',     icon: '🪢' },
  OTHER:       { label: 'Inne',            icon: '🔥' },
};

const FIRE_STATUS_CFG: Record<FireStatus, { label: string; color: string }> = {
  ACTIVE:      { label: 'Aktywny',         color: '#ef4444' },
  CONTAINED:   { label: 'Opanowany',       color: '#f97316' },
  EXTINGUISHED:{ label: 'Ugaszony',        color: '#22c55e' },
};

const FIRE_HAZARDS = ['Ludzie wewnątrz','Gaz','Materiały wybuchowe','Kolaps struktury','Substancje chemiczne','Brak dostępu','Pojazdy w pobliżu'];

function FirePanel({ callsign }: { callsign: string }) {
  const [incidents, setIncidents] = useState<FireIncident[]>([]);
  const [form, setForm] = useState<{ type: FireType; location: string; hazards: string[]; casualties: string }>({ type: 'BUILDING', location: '', hazards: [], casualties: '0' });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<FireIncident | null>(null);
  const [noteInput, setNoteInput] = useState('');

  function addIncident() {
    if (!form.location) return;
    const inc: FireIncident = {
      id: Date.now().toString(),
      ...form,
      casualties: parseInt(form.casualties) || 0,
      status: 'ACTIVE',
      notes: '',
      assignedTo: callsign || 'STRAZ',
      createdAt: new Date().toISOString(),
    };
    setIncidents(prev => [inc, ...prev]);
    setShowForm(false);
    setSelected(inc);
  }

  function updateStatus(id: string, status: FireStatus) {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
  }

  function addNote(id: string) {
    if (!noteInput.trim()) return;
    const note = `[${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}] ${noteInput}`;
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, notes: i.notes ? i.notes + '\n' + note : note } : i));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, notes: prev.notes ? prev.notes + '\n' + note : note } : prev);
    setNoteInput('');
  }

  function toggleHazard(h: string) {
    setForm(p => ({ ...p, hazards: p.hazards.includes(h) ? p.hazards.filter(x => x !== h) : [...p.hazards, h] }));
  }

  const active = incidents.filter(i => i.status === 'ACTIVE');
  const others = incidents.filter(i => i.status !== 'ACTIVE');

  return (
    <div className="flex h-full min-h-0">
      {/* Left list */}
      <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="p-3 border-b border-white/[0.06] flex-shrink-0">
          <button onClick={() => { setShowForm(p => !p); setSelected(null); }}
            className="w-full bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 rounded-lg py-2 text-xs font-semibold transition-colors">
            {showForm ? '✕ Anuluj' : '+ Nowy incydent'}
          </button>
        </div>

        {showForm && (
          <div className="p-3 border-b border-white/[0.06] space-y-2 flex-shrink-0 bg-orange-500/5">
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as FireType}))}
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/50">
              {(Object.keys(FIRE_TYPE_CFG) as FireType[]).map(t => (
                <option key={t} value={t}>{FIRE_TYPE_CFG[t].icon} {FIRE_TYPE_CFG[t].label}</option>
              ))}
            </select>
            <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder="Lokalizacja *"
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50" />
            <div>
              <div className="text-xs text-white/25 mb-1">Zagrożenia:</div>
              <div className="flex flex-wrap gap-1">
                {FIRE_HAZARDS.map(h => (
                  <button key={h} onClick={() => toggleHazard(h)}
                    className="text-xs px-2 py-0.5 rounded border transition-colors"
                    style={{ background: form.hazards.includes(h) ? 'rgba(249,115,22,0.2)' : 'transparent', border: `1px solid ${form.hazards.includes(h) ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.07)'}`, color: form.hazards.includes(h) ? '#fb923c' : 'rgba(255,255,255,0.3)' }}>
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30">Ofiary:</span>
              <input type="number" min="0" value={form.casualties} onChange={e => setForm(p => ({...p, casualties: e.target.value}))}
                className="w-16 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500/50" />
            </div>
            <button onClick={addIncident} disabled={!form.location}
              className="w-full bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 disabled:opacity-40 text-orange-400 rounded-lg py-1.5 text-xs font-bold transition-colors">
              🚒 Zarejestruj incydent
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {incidents.length === 0 && <div className="text-center text-white/25 text-xs pt-8">Brak incydentów</div>}
          {[...active, ...others].map(inc => {
            const sc = FIRE_STATUS_CFG[inc.status];
            const tc = FIRE_TYPE_CFG[inc.type];
            return (
              <button key={inc.id} onClick={() => { setSelected(inc); setShowForm(false); }}
                className="w-full text-left px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                style={{ background: selected?.id === inc.id ? 'rgba(88,101,242,0.06)' : undefined }}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-semibold text-white/80">{tc.icon} {tc.label}</span>
                  <span className="text-xs font-bold" style={{ color: sc.color }}>{sc.label}</span>
                </div>
                <div className="text-xs text-white/30 truncate">{inc.location}</div>
                {inc.hazards.length > 0 && <div className="text-xs text-orange-400/60 truncate mt-0.5">⚠️ {inc.hazards.slice(0,2).join(', ')}{inc.hazards.length > 2 ? '…' : ''}</div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">🚒</div>
              <p className="text-white/25 text-sm">Wybierz incydent lub utwórz nowy</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-white">{FIRE_TYPE_CFG[selected.type].icon} {FIRE_TYPE_CFG[selected.type].label}</h3>
                  <div className="text-xs text-white/30">{selected.location} · {fmtAgo(selected.createdAt)} temu</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Ofiary</div>
                  <div className="text-white font-bold text-lg">{selected.casualties}</div>
                </div>
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Jednostka</div>
                  <div className="text-white font-mono">{selected.assignedTo}</div>
                </div>
              </div>
              {selected.hazards.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {selected.hazards.map(h => <span key={h} className="text-xs px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300">⚠️ {h}</span>)}
                </div>
              )}
              <div className="flex gap-1.5">
                {(Object.keys(FIRE_STATUS_CFG) as FireStatus[]).map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
                    style={{ background: selected.status === s ? FIRE_STATUS_CFG[s].color + '20' : 'transparent', border: `1px solid ${selected.status === s ? FIRE_STATUS_CFG[s].color + '40' : 'rgba(255,255,255,0.07)'}`, color: selected.status === s ? FIRE_STATUS_CFG[s].color : 'rgba(255,255,255,0.3)' }}>
                    {FIRE_STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
              <SLabel>Dziennik akcji</SLabel>
              <div className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-xl p-3 overflow-y-auto text-xs text-white/40 font-mono whitespace-pre-wrap min-h-0">
                {selected.notes || <span className="text-white/20">Brak notatek…</span>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <input value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote(selected.id)}
                  placeholder="Dodaj wpis do dziennika…"
                  className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 transition-colors" />
                <button onClick={() => addNote(selected.id)} disabled={!noteInput.trim()}
                  className="bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 disabled:opacity-40 text-orange-400 rounded-lg px-3 text-xs transition-colors">Dodaj</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROAD PANEL (DOT)
// ─────────────────────────────────────────────────────────────────────────────

type RoadIncidentType = 'ACCIDENT' | 'ROAD_CLOSURE' | 'SIGN_DAMAGE' | 'SIGNAL_FAILURE' | 'POTHOLE' | 'DEBRIS' | 'FLOOD' | 'OTHER';
type RoadStatus = 'OPEN' | 'PARTIAL' | 'CLOSED' | 'RESOLVED';

interface RoadIncident {
  id: string;
  type: RoadIncidentType;
  location: string;
  road: string;
  status: RoadStatus;
  closureType: 'NONE' | 'PARTIAL' | 'FULL';
  notes: string;
  assignedTo: string;
  createdAt: string;
}

const ROAD_TYPE_CFG: Record<RoadIncidentType, { label: string; icon: string }> = {
  ACCIDENT:       { label: 'Wypadek blokujący',   icon: '💥' },
  ROAD_CLOSURE:   { label: 'Zamknięcie drogi',    icon: '🚧' },
  SIGN_DAMAGE:    { label: 'Uszkodzone znaki',     icon: '⚠️' },
  SIGNAL_FAILURE: { label: 'Awaria sygnalizacji',  icon: '🚦' },
  POTHOLE:        { label: 'Dziura w drodze',      icon: '🕳️' },
  DEBRIS:         { label: 'Szczątki na drodze',   icon: '🪨' },
  FLOOD:          { label: 'Zalana droga',         icon: '🌊' },
  OTHER:          { label: 'Inne',                 icon: '🔧' },
};

const ROAD_STATUS_CFG: Record<RoadStatus, { label: string; color: string }> = {
  OPEN:     { label: 'Otwarta',    color: '#22c55e' },
  PARTIAL:  { label: 'Częściowa', color: '#f97316' },
  CLOSED:   { label: 'Zamknięta', color: '#ef4444' },
  RESOLVED: { label: 'Rozwiązano', color: '#3b82f6' },
};

function RoadPanel({ callsign }: { callsign: string }) {
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [form, setForm] = useState<{ type: RoadIncidentType; location: string; road: string; closureType: 'NONE'|'PARTIAL'|'FULL' }>({ type: 'ACCIDENT', location: '', road: '', closureType: 'NONE' });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<RoadIncident | null>(null);
  const [noteInput, setNoteInput] = useState('');

  function addIncident() {
    if (!form.location) return;
    const inc: RoadIncident = {
      id: Date.now().toString(),
      ...form,
      status: form.closureType === 'FULL' ? 'CLOSED' : form.closureType === 'PARTIAL' ? 'PARTIAL' : 'OPEN',
      notes: '',
      assignedTo: callsign || 'DOT',
      createdAt: new Date().toISOString(),
    };
    setIncidents(prev => [inc, ...prev]);
    setShowForm(false);
    setSelected(inc);
  }

  function updateStatus(id: string, status: RoadStatus) {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev);
  }

  function addNote(id: string) {
    if (!noteInput.trim()) return;
    const note = `[${new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}] ${noteInput}`;
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, notes: i.notes ? i.notes + '\n' + note : note } : i));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, notes: prev.notes ? prev.notes + '\n' + note : note } : prev);
    setNoteInput('');
  }

  const active = incidents.filter(i => i.status !== 'RESOLVED');
  const resolved = incidents.filter(i => i.status === 'RESOLVED');

  return (
    <div className="flex h-full min-h-0">
      <div className="w-72 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        <div className="p-3 border-b border-white/[0.06] flex-shrink-0">
          <button onClick={() => { setShowForm(p => !p); setSelected(null); }}
            className="w-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg py-2 text-xs font-semibold transition-colors">
            {showForm ? '✕ Anuluj' : '+ Nowy incydent drogowy'}
          </button>
        </div>
        {showForm && (
          <div className="p-3 border-b border-white/[0.06] space-y-2 flex-shrink-0 bg-amber-500/5">
            <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value as RoadIncidentType}))}
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50">
              {(Object.keys(ROAD_TYPE_CFG) as RoadIncidentType[]).map(t => (
                <option key={t} value={t}>{ROAD_TYPE_CFG[t].icon} {ROAD_TYPE_CFG[t].label}</option>
              ))}
            </select>
            <input value={form.road} onChange={e => setForm(p => ({...p, road: e.target.value}))} placeholder="Nazwa drogi / ulicy"
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
            <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))} placeholder="Dokładna lokalizacja *"
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50" />
            <div>
              <div className="text-xs text-white/25 mb-1">Zamknięcie drogi:</div>
              <div className="flex gap-1.5">
                {(['NONE','PARTIAL','FULL'] as const).map(ct => (
                  <button key={ct} onClick={() => setForm(p => ({...p, closureType: ct}))}
                    className="flex-1 text-xs py-1 rounded border transition-colors"
                    style={{ background: form.closureType === ct ? 'rgba(245,158,11,0.2)' : 'transparent', border: `1px solid ${form.closureType === ct ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.07)'}`, color: form.closureType === ct ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
                    {ct === 'NONE' ? 'Brak' : ct === 'PARTIAL' ? 'Częściowe' : 'Pełne'}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addIncident} disabled={!form.location}
              className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 disabled:opacity-40 text-amber-400 rounded-lg py-1.5 text-xs font-bold transition-colors">
              🚧 Zarejestruj incydent
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {incidents.length === 0 && <div className="text-center text-white/25 text-xs pt-8">Brak incydentów drogowych</div>}
          {[...active, ...resolved].map(inc => {
            const sc = ROAD_STATUS_CFG[inc.status];
            const tc = ROAD_TYPE_CFG[inc.type];
            return (
              <button key={inc.id} onClick={() => { setSelected(inc); setShowForm(false); }}
                className="w-full text-left px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                style={{ background: selected?.id === inc.id ? 'rgba(88,101,242,0.06)' : undefined }}>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-semibold text-white/80">{tc.icon} {tc.label}</span>
                  <span className="text-xs font-bold" style={{ color: sc.color }}>{sc.label}</span>
                </div>
                <div className="text-xs text-white/30 truncate">{inc.road ? `${inc.road} — ` : ''}{inc.location}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-3 opacity-30">🚧</div>
              <p className="text-white/25 text-sm">Wybierz incydent lub utwórz nowy</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/[0.06] flex-shrink-0">
              <div className="mb-3">
                <h3 className="font-bold text-white">{ROAD_TYPE_CFG[selected.type].icon} {ROAD_TYPE_CFG[selected.type].label}</h3>
                <div className="text-xs text-white/30">{selected.road ? `${selected.road} · ` : ''}{selected.location} · {fmtAgo(selected.createdAt)} temu</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Zamknięcie</div>
                  <div className="text-white">{selected.closureType === 'NONE' ? 'Brak' : selected.closureType === 'PARTIAL' ? 'Częściowe' : 'Pełne'}</div>
                </div>
                <div className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                  <div className="text-white/25 mb-0.5">Jednostka</div>
                  <div className="text-white font-mono">{selected.assignedTo}</div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(ROAD_STATUS_CFG) as RoadStatus[]).map(s => (
                  <button key={s} onClick={() => updateStatus(selected.id, s)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
                    style={{ background: selected.status === s ? ROAD_STATUS_CFG[s].color + '20' : 'transparent', border: `1px solid ${selected.status === s ? ROAD_STATUS_CFG[s].color + '40' : 'rgba(255,255,255,0.07)'}`, color: selected.status === s ? ROAD_STATUS_CFG[s].color : 'rgba(255,255,255,0.3)' }}>
                    {ROAD_STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
              <SLabel>Dziennik interwencji</SLabel>
              <div className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-xl p-3 overflow-y-auto text-xs text-white/40 font-mono whitespace-pre-wrap min-h-0">
                {selected.notes || <span className="text-white/20">Brak notatek…</span>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <input value={noteInput} onChange={e => setNoteInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote(selected.id)}
                  placeholder="Dodaj wpis…"
                  className="flex-1 bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors" />
                <button onClick={() => addNote(selected.id)} disabled={!noteInput.trim()}
                  className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 disabled:opacity-40 text-amber-400 rounded-lg px-3 text-xs transition-colors">Dodaj</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCH PANEL (DYSPOZYTORNIA / ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

function DispatchPanel({ cadRole }: { cadRole: CadRole }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [calls, setCalls] = useState<CadCall[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [plateQuery, setPlateQuery] = useState('');
  const [plateResult, setPlateResult] = useState<PlateResult | null>(null);
  const [plateLoading, setPlateLoading] = useState(false);
  const [plateNotFound, setPlateNotFound] = useState(false);
  const [dispatchTab, setDispatchTab] = useState<'units'|'calls'|'plates'>('units');

  const loadUnits = async () => {
    setLoadingUnits(true);
    try { setUnits(await fetch('/api/cad/units').then(r => r.ok ? r.json() : [])); }
    catch { setUnits([]); }
    finally { setLoadingUnits(false); }
  };

  const loadCalls = async () => {
    setLoadingCalls(true);
    try { setCalls(await fetch('/api/cad/calls').then(r => r.ok ? r.json() : [])); }
    catch { setCalls([]); }
    finally { setLoadingCalls(false); }
  };

  useEffect(() => { loadUnits(); loadCalls(); const iv = setInterval(() => { loadUnits(); loadCalls(); }, 15_000); return () => clearInterval(iv); }, []);

  useEffect(() => {
    if (plateQuery.length < 3) { setPlateResult(null); setPlateNotFound(false); return; }
    const t = setTimeout(async () => {
      setPlateLoading(true); setPlateNotFound(false);
      try {
        const data = await fetch(`/api/cad/plates?q=${encodeURIComponent(plateQuery)}`).then(r => r.json());
        setPlateResult(data[0] ?? null);
        setPlateNotFound(!data[0]);
      } finally { setPlateLoading(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [plateQuery]);

  const byService = units.reduce<Record<string, Unit[]>>((acc, u) => { (acc[u.service] = acc[u.service] || []).push(u); return acc; }, {});
  const activeCalls = calls.filter(c => c.status !== 'CLOSED');
  const onlineCount = units.filter(u => u.status !== 'OFFLINE').length;

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="border-b border-white/[0.06] flex flex-shrink-0 px-3 pt-1 gap-1">
        {(['units','calls','plates'] as const).map(t => (
          <button key={t} onClick={() => setDispatchTab(t)}
            className="px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap"
            style={{ color: dispatchTab === t ? '#f4f4f8' : 'rgba(255,255,255,0.25)', borderBottomColor: dispatchTab === t ? '#5865F2' : 'transparent', background: dispatchTab === t ? 'rgba(88,101,242,0.08)' : 'transparent', border: 'none', borderBottom: dispatchTab === t ? '2px solid #5865F2' : '2px solid transparent' }}>
            {t === 'units' ? `Jednostki (${onlineCount}/${units.length})` : t === 'calls' ? `Zgłoszenia (${activeCalls.length})` : 'Tablice'}
          </button>
        ))}
        <div className="ml-auto flex items-center pb-1">
          <button onClick={() => { loadUnits(); loadCalls(); }} className="text-xs text-white/25 hover:text-white/40 px-2 py-1 rounded transition-colors">↻ Odśwież</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* UNITS */}
        {dispatchTab === 'units' && (
          <div className="p-4 space-y-4">
            {loadingUnits && <div className="flex justify-center pt-8"><Spinner /></div>}
            {!loadingUnits && units.length === 0 && <div className="text-center text-white/25 text-sm pt-8">Brak jednostek online</div>}
            {Object.entries(byService).map(([service, serviceUnits]) => (
              <div key={service}>
                <SLabel>{service} ({serviceUnits.length})</SLabel>
                <div className="space-y-1.5">
                  {serviceUnits.map(u => {
                    const st = UNIT_STATUS[u.status as UnitStatus] ?? UNIT_STATUS.OFFLINE;
                    return (
                      <div key={u.id} className="bg-[#16161d] border border-white/[0.07] rounded-xl px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Dot color={st.color} />
                          <div>
                            <div className="text-xs font-semibold font-mono text-white">{u.callsign}</div>
                            <div className="text-xs text-white/30 truncate max-w-[140px]">{u.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
                          <span className="text-xs text-white/20 font-mono">{fmtAgo(u.onDutySince)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CALLS */}
        {dispatchTab === 'calls' && (
          <div className="p-4 space-y-2">
            {loadingCalls && <div className="flex justify-center pt-8"><Spinner /></div>}
            {!loadingCalls && activeCalls.length === 0 && <div className="text-center text-white/25 text-sm pt-8">Brak aktywnych zgłoszeń</div>}
            {activeCalls.map(c => {
              const pc = PRIO_CFG[c.priority];
              return (
                <div key={c.id} className={`bg-[#16161d] border border-white/[0.07] border-l-4 rounded-xl p-3 ${pc.border}`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="font-mono text-xs text-white/30 mr-2">#{c.number}</span>
                      <span className="font-semibold text-sm text-white">{c.nature}</span>
                    </div>
                    <PrioBar priority={c.priority} />
                  </div>
                  <div className="text-xs text-white/40 mb-1">{c.location}</div>
                  {c.dispatchedTo.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {c.dispatchedTo.map(cs => <span key={cs} className="text-xs px-1.5 py-0.5 rounded bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#818cf8] font-mono">{cs}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PLATES */}
        {dispatchTab === 'plates' && (
          <div className="p-4 space-y-4">
            <input value={plateQuery} onChange={e => setPlateQuery(e.target.value.toUpperCase())} placeholder="Wpisz numer tablicy…"
              className="w-full bg-[#0c0c10] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white font-mono uppercase placeholder-white/20 focus:outline-none focus:border-[#5865F2] transition-colors" />
            {plateLoading && <div className="flex justify-center"><Spinner /></div>}
            {plateNotFound && <div className="text-center text-white/25 text-sm">Nie znaleziono pojazdu</div>}
            {plateResult && (
              <div className="bg-[#16161d] border border-white/[0.07] rounded-xl p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-xl text-white tracking-widest">{plateResult.tablica}</span>
                  <div className="flex gap-2">
                    {plateResult.owner.isArrested && <Pill color="#ef4444">ZATRZYMANY</Pill>}
                    {plateResult.owner.activeWarns > 0 && <Pill color="#f97316">WARNY: {plateResult.owner.activeWarns}</Pill>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[['Marka', plateResult.marka],['Model', plateResult.model],['Rok', plateResult.rok],['Kolor', plateResult.kolor]].map(([l,v]) => (
                    <div key={l as string} className="bg-[#0c0c10] rounded-lg px-3 py-2 border border-white/[0.07]">
                      <div className="text-white/25 mb-0.5">{l}</div>
                      <div className="text-white font-medium">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/[0.07] pt-3 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-white/25">Właściciel</span>
                    <span className="text-white font-medium">{plateResult.owner.robloxName}</span>
                  </div>
                  {plateResult.owner.phone && (
                    <div className="flex justify-between">
                      <span className="text-white/25">Telefon</span>
                      <span className="text-white font-mono">{plateResult.owner.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GŁÓWNA STRONA CAD
// ─────────────────────────────────────────────────────────────────────────────

export default function CadPage() {
  const { data: session, status: authStatus } = useSession();

  const [cadUser, setCadUser]             = useState<CadUser | null>(null);
  const [loadingUser, setLoadingUser]     = useState(true);
  const [activeTab, setActiveTab]         = useState<string>('');
  const [chatTab, setChatTab]             = useState<ChatTabId>('proximity');
  const [serverPrio, setServerPrio]       = useState<ServerPriority>('PRIORITY_2');
  const [callsign, setCallsign]           = useState('');
  const [editCallsign, setEditCallsign]   = useState(false);
  const [callsignInput, setCallsignInput] = useState('');
  const [myStatus, setMyStatus]           = useState<UnitStatus>('AVAILABLE');
  const [proxLocation, setProxLocation]  = useState<Location>(LOCATIONS[0]);
  const [onDuty, setOnDuty]              = useState(false);

  // Pobierz dane CAD usera
  useEffect(() => {
    fetch('/api/cad/me').then(r => r.json()).then((data: CadUser) => {
      setCadUser(data);
      if (data.unit) { setCallsign(data.unit.callsign); setMyStatus(data.unit.status as UnitStatus); setOnDuty(true); }
      setLoadingUser(false);
    }).catch(() => setLoadingUser(false));
  }, [authStatus]);

  const cadRole: CadRole = cadUser?.cadRole ?? 'CYWIL';
  const modules = ROLE_MODULES[cadRole] ?? ['map'];
  const roleCfg = ROLE_LABEL[cadRole];

  // Ustaw pierwszą zakładkę po załadowaniu roli
  useEffect(() => { if (modules.length > 0 && !activeTab) setActiveTab(modules[0]); }, [modules, activeTab]);

  // Heartbeat — co 30s aktualizuj lastSeen w DB gdy na służbie
  useEffect(() => {
    if (!onDuty || !callsign) return;
    const iv = setInterval(() => {
      fetch('/api/cad/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callsign, status: myStatus }) });
    }, 30_000);
    return () => clearInterval(iv);
  }, [onDuty, callsign, myStatus]);

  async function setCallsignAndGoOnDuty() {
    const cs = callsignInput.trim().toUpperCase();
    if (!cs) return;
    setCallsign(cs);
    setEditCallsign(false);
    setOnDuty(true);
    await fetch('/api/cad/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callsign: cs, status: myStatus }) });
  }

  async function changeStatus(s: UnitStatus) {
    setMyStatus(s);
    if (callsign) await fetch('/api/cad/units', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callsign, status: s }) });
  }

  async function goOffDuty() {
    await fetch('/api/cad/units', { method: 'DELETE' });
    setOnDuty(false);
    setCallsign('');
  }

  const canAddWarrants = ['OWNER','ADMIN','MOD','STAFF','POLICJA','SM','DYSPOZYTORNIA'].includes(cadRole);
  const statusOptions  = UNIT_STATUSES_FOR_ROLE[cadRole] ?? [];
  const hasCivView     = cadRole === 'CYWIL' || cadRole === 'PRACOWNIK' || cadRole === 'RATOWNIK';

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loadingUser) {
    return (
      <div style={{ height: '100vh', background: '#0c0c10', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#5865F2] rounded-full animate-spin" />
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, fontFamily: "'Inter', sans-serif" }}>Ładowanie CAD…</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', background: '#0c0c10', color: '#f4f4f8', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <header style={{ height: 46, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 14, flexShrink: 0, background: 'rgba(12,12,16,0.97)', backdropFilter: 'blur(12px)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 24, height: 24, background: '#5865F2', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 12 }}>G</div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#f4f4f8', textTransform: 'uppercase' }}>CAD</span>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontFamily: 'monospace' }}>AURORA GRP</span>
        </div>

        {/* Server priority selector (admin+) */}
        {(['OWNER','ADMIN','MOD'].includes(cadRole)) && (
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.keys(SERVER_PRIO) as ServerPriority[]).map(sp => (
              <button key={sp} onClick={() => setServerPrio(sp)}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, fontWeight: 700, cursor: 'pointer', transition: 'all .15s', border: serverPrio === sp ? `1px solid ${SERVER_PRIO[sp].color}40` : '1px solid rgba(255,255,255,0.07)', background: serverPrio === sp ? SERVER_PRIO[sp].color + '18' : 'transparent', color: serverPrio === sp ? SERVER_PRIO[sp].color : 'rgba(255,255,255,0.28)' }}>
                {SERVER_PRIO[sp].label}
              </button>
            ))}
          </div>
        )}

        {/* Current server priority badge (everyone else) */}
        {!(['OWNER','ADMIN','MOD'].includes(cadRole)) && (
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, fontWeight: 700, background: SERVER_PRIO[serverPrio].color + '18', color: SERVER_PRIO[serverPrio].color, border: `1px solid ${SERVER_PRIO[serverPrio].color}35` }}>
            {SERVER_PRIO[serverPrio].label} — {SERVER_PRIO[serverPrio].desc}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, background: 'rgba(88,101,242,0.12)', color: '#818cf8', border: '1px solid rgba(88,101,242,0.2)' }}>
            {roleCfg.label}
          </span>
          {cadUser?.robloxName && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{cadUser.robloxName}</span>}
          {!session && (
            <button onClick={() => signIn('discord')} style={{ fontSize: 12, background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.2)', color: '#818cf8', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}>
              Zaloguj Discord
            </button>
          )}
          <button
            title="Otwórz CAD w osobnym oknie"
            onClick={() => {
              const w = 1440, h = 900;
              const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
              const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
              window.open('/cad', 'GreenvilleCAD', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`);
            }}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.28)', background: 'transparent', cursor: 'pointer' }}
          >
            ⧉ Okno
          </button>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside style={{ width: 196, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: '#16161d', flexShrink: 0, overflowY: 'auto' }}>

          {/* Callsign / Status */}
          {statusOptions.length > 0 && session && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <SLabel>Callsign</SLabel>
              {callsign && !editCallsign ? (
                <div style={{ background: '#0c0c10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '7px 10px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: '#f4f4f8', letterSpacing: '0.05em' }}>{callsign}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditCallsign(true); setCallsignInput(callsign); }} style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', background: 'none', border: 'none', cursor: 'pointer' }}>✎</button>
                    <button onClick={goOffDuty} style={{ fontSize: 11, color: 'rgba(239,68,68,0.45)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>■</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                  <input value={callsignInput} onChange={e => setCallsignInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && setCallsignAndGoOnDuty()}
                    placeholder={`${roleCfg.short}-01`}
                    style={{ flex: 1, background: '#0c0c10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#f4f4f8', fontFamily: 'monospace', textTransform: 'uppercase', outline: 'none' }} />
                  <button onClick={setCallsignAndGoOnDuty} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.18)', color: '#22c55e', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                </div>
              )}

              {callsign && (
                <>
                  <SLabel>Status</SLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {statusOptions.map(s => {
                      const st = UNIT_STATUS[s];
                      const isActive = myStatus === s;
                      return (
                        <button key={s} onClick={() => changeStatus(s)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 6, padding: '5px 8px', fontSize: 11, border: isActive ? `1px solid ${st.color}28` : '1px solid transparent', background: isActive ? st.color + '12' : 'transparent', color: isActive ? st.color : 'rgba(255,255,255,0.28)', cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}>
                          <Dot color={isActive ? st.color : 'rgba(255,255,255,0.15)'} />
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Proximity location picker */}
          <div style={{ padding: '10px 12px', flex: 1 }}>
            <SLabel>Lokacja</SLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {LOCATIONS.map(loc => (
                <button key={loc.id} onClick={() => setProxLocation(loc)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, borderRadius: 6, padding: '5px 8px', fontSize: 11, border: proxLocation.id === loc.id ? '1px solid rgba(88,101,242,0.25)' : '1px solid transparent', background: proxLocation.id === loc.id ? 'rgba(88,101,242,0.1)' : 'transparent', color: proxLocation.id === loc.id ? '#818cf8' : 'rgba(255,255,255,0.28)', cursor: 'pointer', textAlign: 'left', transition: 'all .12s', overflow: 'hidden' }}>
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{loc.emoji}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#0c0c10' }}>

          {/* Module tabs */}
          {modules.length > 1 && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 2, padding: '0 12px', paddingTop: 6, flexShrink: 0, overflowX: 'auto' }}>
              {modules.map(mod => {
                const mc = MODULE_LABEL[mod] ?? { label: mod };
                const isActive = activeTab === mod;
                return (
                  <button key={mod} onClick={() => setActiveTab(mod)}
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: isActive ? 600 : 400, borderBottom: isActive ? '2px solid #5865F2' : '2px solid transparent', color: isActive ? '#f4f4f8' : 'rgba(255,255,255,0.3)', background: isActive ? 'rgba(88,101,242,0.08)' : 'transparent', border: 'none', borderBottom: isActive ? '2px solid #5865F2' : '2px solid transparent', borderRadius: '6px 6px 0 0', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                    {mc.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {(activeTab === 'calls' || activeTab === 'calls_view') &&
              <CallsPanel role={cadRole} callsign={callsign} readonly={activeTab === 'calls_view' || hasCivView} />}
            {activeTab === 'units'         && <UnitsPanel />}
            {activeTab === 'warrants'      && <WarrantsPanel canAdd={canAddWarrants} />}
            {activeTab === 'plates'        && <PlatesPanel />}
            {activeTab === 'map'           && <MapPanel locations={LOCATIONS} selectedLocation={proxLocation} onLocationSelect={(loc) => { setProxLocation(loc); setChatTab('proximity'); }} />}
            {activeTab === 'patrol_log'    && <PatrolLogPanel callsign={callsign} role={cadRole} />}
            {activeTab === 'incident'      && <PatrolLogPanel callsign={callsign} role={cadRole} />}
            {activeTab === 'rides'         && <RideLogPanel role={cadRole} />}
            {activeTab === 'emergency_call'&& <EmergencyCallPanel onSent={() => setActiveTab('calls_view')} />}
            {activeTab === 'staff'         && <StaffPanel accessLevel={session?.user?.accessLevel ?? 0} />}
            {activeTab === 'panel'         && <PlayerPanel hasSession={!!session} />}
            {activeTab === 'arrests'  && <ArrestsPanel  canAdd={['OWNER','ADMIN','MOD','POLICJA'].includes(cadRole)} callsign={callsign} />}
            {activeTab === 'medical'  && <MedicalPanel  cadRole={cadRole} callsign={callsign} />}
            {activeTab === 'fire'     && <FirePanel      callsign={callsign} />}
            {activeTab === 'road'     && <RoadPanel      callsign={callsign} />}
            {activeTab === 'dispatch' && <DispatchPanel  cadRole={cadRole} />}
          </div>
        </main>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
        <aside style={{ width: 264, borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: '#16161d', flexShrink: 0 }}>

          {/* Chat tabs */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexShrink: 0 }}>
            {([
              { id: 'radio' as ChatTabId, label: 'Radio', show: getRadioChannels(cadRole).length > 0 },
              { id: 'proximity' as ChatTabId, label: 'Proximity', show: true },
              { id: 'system' as ChatTabId, label: 'System', show: ['OWNER','ADMIN','MOD'].includes(cadRole) },
            ].filter(t => t.show)).map(t => (
              <button key={t.id} onClick={() => setChatTab(t.id)}
                style={{ flex: 1, padding: '9px 0', fontSize: 11, fontWeight: chatTab === t.id ? 600 : 400, color: chatTab === t.id ? '#f4f4f8' : 'rgba(255,255,255,0.28)', background: chatTab === t.id ? 'rgba(88,101,242,0.07)' : 'transparent', border: 'none', borderBottom: chatTab === t.id ? '2px solid #5865F2' : '2px solid transparent', cursor: 'pointer', transition: 'all .15s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Chat content */}
          <div className="flex-1 min-h-0">
            {chatTab === 'radio' && (
              session ? <RadioChat role={cadRole} callsign={callsign} /> :
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
                <div className="text-3xl">📡</div>
                <p className="text-white/25 text-xs">Zaloguj się, aby korzystać z radia</p>
                <button onClick={() => signIn('discord')} className="text-xs bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#818cf8] rounded-lg px-4 py-2 transition-colors">Zaloguj Discord</button>
              </div>
            )}
            {chatTab === 'proximity' && (
              session ? <ProximityChat location={proxLocation} username={cadUser?.robloxName ?? cadUser?.name ?? 'Gracz'} /> :
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
                <div className="text-3xl">💬</div>
                <p className="text-white/25 text-xs">Zaloguj się, aby korzystać z proximity chatu</p>
                <button onClick={() => signIn('discord')} className="text-xs bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#818cf8] rounded-lg px-4 py-2 transition-colors">Zaloguj Discord</button>
              </div>
            )}
            {chatTab === 'system' && (
              <div className="p-4 text-xs space-y-4 overflow-y-auto h-full">
                <div>
                  <SLabel>Informacje systemowe</SLabel>
                  <div className="space-y-2">
                    {[
                      ['Serwer', 'AURORA Greenville RP'],
                      ['Status', SERVER_PRIO[serverPrio].label],
                      ['Twoja rola', roleCfg.label],
                      ['Callsign', callsign || '—'],
                      ['Discord ID', cadUser?.discordId ?? '—'],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between items-center py-1 border-b border-white/[0.07]">
                        <span className="text-white/25">{l}</span>
                        <span className="text-white font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <SLabel>Szybkie akcje</SLabel>
                  <div className="space-y-1">
                    <button onClick={() => window.location.reload()} className="w-full text-left text-white/25 hover:text-white/40 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors text-xs">↻ Odśwież CAD</button>
                    <button onClick={() => window.open('/cad','GreenvilleCAD','width=1440,height=900,resizable=yes')} className="w-full text-left text-white/25 hover:text-white/40 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors text-xs">⧉ Otwórz w oknie</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
