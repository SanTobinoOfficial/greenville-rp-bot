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
  OWNER:        ['calls','units','warrants','plates','map','arrests','medical','fire','road','dispatch'],
  ADMIN:        ['calls','units','warrants','plates','map','arrests','dispatch'],
  MOD:          ['calls','units','warrants','plates','map'],
  STAFF:        ['calls','units','map'],
  POLICJA:      ['calls','units','warrants','plates','map','arrests'],
  EMS:          ['calls','units','map','medical'],
  STRAZ:        ['calls','units','map','fire'],
  DOT:          ['calls','units','map','road'],
  SM:           ['calls','units','warrants','map','patrol_log'],
  DYSPOZYTORNIA:['calls','units','warrants','plates','map','dispatch'],
  OCHRONA:      ['calls','map','patrol_log','incident'],
  TAKSOWKARZ:   ['map','rides'],
  KIEROWCA_BUS: ['map','rides'],
  RATOWNIK:     ['calls','map','medical'],
  PRACOWNIK:    ['map'],
  CYWIL:        ['emergency_call','calls_view','map'],
};

const MODULE_LABEL: Record<string, { label: string; icon: string }> = {
  calls:         { label: 'Zgłoszenia',   icon: '📞' },
  calls_view:    { label: 'Zdarzenia',    icon: '📋' },
  units:         { label: 'Jednostki',    icon: '🚓' },
  warrants:      { label: 'Nakazy',       icon: '📜' },
  plates:        { label: 'Tablice',      icon: '🔎' },
  map:           { label: 'Mapa',         icon: '🗺️' },
  arrests:       { label: 'Areszty',      icon: '⛓️' },
  medical:       { label: 'Medyczny',     icon: '🏥' },
  fire:          { label: 'Pożarniczy',   icon: '🔥' },
  road:          { label: 'Drogowy',      icon: '🚧' },
  dispatch:      { label: 'Dyspozytura',  icon: '📡' },
  patrol_log:    { label: 'Patrol',       icon: '📋' },
  incident:      { label: 'Incydenty',    icon: '⚠️' },
  rides:         { label: 'Kursy',        icon: '🚗' },
  emergency_call:{ label: 'Zgłoś 112',   icon: '🆘' },
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
  return <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: color }} />;
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-[#475569] uppercase tracking-widest font-semibold mb-2">{children}</div>;
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-md font-bold uppercase"
      style={{ background: color + '28', color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  );
}

function PrioBar({ priority }: { priority: CallPriority }) {
  const cfg = PRIO_CFG[priority];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase ${cfg.dot.includes('animate') ? 'animate-pulse' : ''}`}
      style={{ background: cfg.color + '28', color: cfg.color, border: `1px solid ${cfg.color}44` }}>
      {cfg.label}
    </span>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border border-[#5865F2]/30 border-t-[#5865F2] rounded-full animate-spin" />;
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1e2332] flex-shrink-0 bg-[#0a0c12]">
        <span className="text-sm">{location.emoji}</span>
        <span className="text-xs font-semibold text-white truncate">{location.name}</span>
        {unread > 0 && <span className="ml-auto text-xs bg-[#5865F2] text-white px-2 py-0.5 rounded-full font-bold">{unread}</span>}
      </div>
      <div onScroll={onScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {msgs.length === 0 && <div className="text-center text-[#475569] text-xs pt-8">Brak wiadomości w tej lokacji</div>}
        {msgs.map(m => (
          <div key={m.id} className="flex gap-2 hover:bg-white/[0.03] rounded px-1 py-0.5">
            <span className="text-[#475569] flex-shrink-0 font-mono text-xs pt-0.5">{fmtTime(m.timestamp)}</span>
            <span className="font-semibold text-[#818cf8] flex-shrink-0 text-xs">{m.username}:</span>
            <span className="text-[#94a3b8] break-words text-xs">{m.content}</span>
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
      <div className="px-3 pb-3 pt-2 border-t border-[#1e2332] flex gap-2 flex-shrink-0">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Jako ${username}…`}
          className="flex-1 bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
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
    return <div className="flex-1 flex items-center justify-center text-xs text-[#475569] px-4 text-center">Twoja rola nie ma dostępu do radia.</div>;
  }

  const chColor = CH_CFG[ch]?.color ?? '#818cf8';

  return (
    <div className="flex flex-col h-full">
      {/* Channel selector */}
      <div className="px-2 py-2 border-b border-[#1e2332] flex flex-wrap gap-1 flex-shrink-0 bg-[#0a0c12]">
        {channels.map(c => (
          <button key={c} onClick={() => setCh(c)}
            className={`text-xs px-2 py-1 rounded-md font-bold transition-all ${c === ch ? 'text-white' : 'text-[#475569] hover:text-[#94a3b8]'}`}
            style={c === ch ? { background: CH_CFG[c].color + '33', border: `1px solid ${CH_CFG[c].color}66` } : { border: '1px solid transparent' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-0">
        {msgs.length === 0 && <div className="text-center text-[#475569] text-xs pt-8">Brak transmisji na {ch}</div>}
        {msgs.map(m => (
          <div key={m.id} className="flex gap-2 hover:bg-white/[0.03] rounded px-1 py-0.5">
            <span className="text-[#475569] font-mono text-xs flex-shrink-0 pt-0.5">{fmtTime(m.timestamp)}</span>
            <span className="font-bold text-xs flex-shrink-0" style={{ color: CH_CFG[m.channel]?.color ?? chColor }}>[{m.channel}]</span>
            <span className="text-[#94a3b8] text-xs flex-shrink-0">{m.callsign}:</span>
            <span className="text-white/80 text-xs break-words">{m.content}</span>
          </div>
        ))}
        {unread > 0 && !atBottom.current && (
          <div className="text-center text-xs text-[#475569]">↓ {unread} nowych</div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-[#1e2332] flex-shrink-0">
        {!callsign ? (
          <p className="text-xs text-[#475569] text-center py-1">Ustaw callsign aby nadawać</p>
        ) : (
          <div className="flex gap-2">
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-xs font-mono font-bold" style={{ color: chColor }}>{callsign}</span>
              <span className="text-[#475569] text-xs">→</span>
            </div>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
              placeholder={`Nadaj na ${ch}…`}
              className="flex-1 bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
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
        <div className="bg-[#0d0f17] rounded-xl p-4 border border-[#1e2332] flex-shrink-0">
          <SLabel>Nowe zgłoszenie</SLabel>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select value={form.nature} onChange={e => setForm(p => ({ ...p, nature: e.target.value }))}
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2] transition-colors">
              <option value="">Rodzaj zdarzenia…</option>
              {natures.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2] transition-colors">
              {(['LOW','MEDIUM','HIGH','CRITICAL'] as CallPriority[]).map(p => <option key={p} value={p}>{PRIO_CFG[p].label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Lokacja / adres…"
              className="flex-1 bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
            <button onClick={createCall} disabled={creating || !form.nature || !form.location}
              className="bg-[#5865F2] hover:bg-[#4752c4] disabled:opacity-40 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-colors flex items-center gap-1">
              {creating ? <Spinner /> : '+ Utwórz'}
            </button>
          </div>
          {form.nature && (
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Opis (opcjonalnie)…"
              className="mt-2 w-full bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
          )}
        </div>
      )}

      {/* Lista zgłoszeń */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && <div className="flex justify-center pt-8"><Spinner /></div>}
        {!loading && calls.length === 0 && <div className="text-center text-[#475569] text-sm pt-8">Brak aktywnych zgłoszeń</div>}
        {calls.map(c => {
          const prio = PRIO_CFG[c.priority];
          const isDispatched = callsign && c.dispatchedTo.includes(callsign);
          return (
            <div key={c.id} className={`bg-[#0d0f17] rounded-xl border-l-4 border border-[#1e2332] p-4 transition-all ${prio.border} ${isDispatched ? 'ring-1 ring-[#5865F2]/40' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-[#475569]">#{c.number}</span>
                  <PrioBar priority={c.priority} />
                  <span className="text-sm font-semibold text-white">{c.nature}</span>
                </div>
                <span className="text-xs text-[#475569] flex-shrink-0 font-mono">{fmtAgo(c.createdAt)}</span>
              </div>
              <div className="text-xs text-[#94a3b8] mb-1.5 flex items-center gap-1">
                <span className="text-[#475569]">📍</span> {c.location}
              </div>
              {c.description && <div className="text-xs text-[#475569] mb-2">{c.description}</div>}
              {c.dispatchedTo.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {c.dispatchedTo.map(cs => <Pill key={cs} color="#5865F2">{cs}</Pill>)}
                </div>
              )}
              {!readonly && (
                <div className="flex gap-2 mt-3 pt-2 border-t border-[#1e2332]">
                  {callsign && (
                    <button onClick={() => dispatch(c.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isDispatched ? 'bg-[#5865F2]/20 text-[#818cf8] hover:bg-[#5865F2]/30 border border-[#5865F2]/40' : 'bg-white/5 text-[#94a3b8] hover:bg-white/10 border border-[#1e2332]'}`}>
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
      {!loading && units.length === 0 && <div className="text-center text-[#475569] text-sm pt-8">Brak aktywnych jednostek</div>}
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
                  <span className="text-[#94a3b8] truncate flex-1 text-xs">{u.name}</span>
                  <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
                  <span className="text-xs text-[#475569] font-mono">{fmtAgo(u.onDutySince)}</span>
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
        className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors flex-shrink-0" />

      {canAdd && (
        <div className="bg-[#0d0f17] border border-[#1e2332] rounded-xl p-4 flex-shrink-0">
          <SLabel>Nowy nakaz</SLabel>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={form.targetName} onChange={e => setForm(p => ({ ...p, targetName: e.target.value }))} placeholder="Imię i nazwisko RP…"
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.robloxName} onChange={e => setForm(p => ({ ...p, robloxName: e.target.value }))} placeholder="Nick Roblox (opcja)…"
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
          </div>
          <div className="flex gap-2">
            <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Powód…"
              className="flex-1 bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
            <button onClick={addWarrant} disabled={adding || !form.targetName || !form.reason}
              className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-40 text-red-400 rounded-lg px-4 py-2 text-xs font-semibold transition-colors">
              {adding ? <Spinner /> : '+ Nakaz'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {loading && <div className="flex justify-center pt-4"><Spinner /></div>}
        {!loading && results.length === 0 && <div className="text-center text-[#475569] text-sm pt-8">Brak aktywnych nakazów</div>}
        {results.map(w => (
          <div key={w.id} className="bg-[#0d0f17] border border-red-500/30 border-l-4 border-l-red-500 rounded-xl p-4">
            <div className="flex justify-between items-start mb-1.5">
              <span className="font-semibold text-sm text-red-400">{w.targetName}</span>
              {canAdd && <button onClick={() => removeWarrant(w.id)} className="text-xs text-[#475569] hover:text-red-400 transition-colors">Unieważnij</button>}
            </div>
            {w.robloxName && <div className="text-xs text-[#475569] mb-1">Roblox: {w.robloxName}</div>}
            <div className="text-xs text-[#94a3b8]">{w.reason}</div>
            <div className="text-xs text-[#475569] mt-2 font-mono">wystawił: {w.issuedByName} · {fmtDate(w.createdAt)}</div>
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
        className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-sm text-white font-mono uppercase placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
      {loading && <div className="flex justify-center"><Spinner /></div>}
      {notFound && <div className="text-center text-[#475569] text-sm">Nie znaleziono pojazdu</div>}
      {result && (
        <div className="bg-[#0d0f17] border border-[#1e2332] rounded-xl p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-mono font-black text-xl text-white tracking-widest">{result.tablica}</span>
            <div className="flex gap-2">
              {result.owner.isArrested && <Pill color="#ef4444">ZATRZYMANY</Pill>}
              {result.owner.activeWarns > 0 && <Pill color="#f97316">WARNY: {result.owner.activeWarns}</Pill>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[['Marka', result.marka],['Model', result.model],['Rok', result.rok],['Kolor', result.kolor]].map(([l,v]) => (
              <div key={l as string} className="bg-[#0a0c12] rounded-lg px-3 py-2 border border-[#1e2332]">
                <div className="text-[#475569] mb-0.5">{l}</div>
                <div className="text-white font-medium">{v}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-[#1e2332] pt-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#475569]">Właściciel</span>
              <span className="text-white font-medium">{result.owner.robloxName}</span>
            </div>
            {result.owner.phone && (
              <div className="flex justify-between">
                <span className="text-[#475569]">Telefon</span>
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
            className="flex-1 bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
          <button onClick={addNote} disabled={!note.trim()} className="bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-[#1e2332] text-[#94a3b8] rounded-lg px-3 text-xs transition-colors">Dodaj</button>
          <button onClick={() => add('INCIDENT', `Incydent ${new Date().toLocaleTimeString('pl-PL')}`)}
            className="bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg px-3 text-xs transition-colors">⚠️</button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {log.length === 0 && <div className="text-center text-[#475569] text-sm pt-8">Dziennik patrolu pusty</div>}
        {[...log].reverse().map(e => (
          <div key={e.id} className="flex gap-2 text-xs bg-[#0d0f17] border border-[#1e2332] rounded-xl px-3 py-2.5">
            <span className="text-[#475569] font-mono text-xs flex-shrink-0">{fmtTime(e.time)}</span>
            <span className="flex-shrink-0 font-medium text-xs" style={{ color: typeColor[e.type] }}>{typeLabel[e.type]}</span>
            <span className="text-[#94a3b8] text-xs">{e.content}</span>
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
            <div className="bg-[#0a0c12] rounded-lg px-3 py-2 border border-[#1e2332]">
              <div className="text-[#475569] mb-0.5">Z</div>
              <div className="text-white">{active.from}</div>
            </div>
            <div className="bg-[#0a0c12] rounded-lg px-3 py-2 border border-[#1e2332]">
              <div className="text-[#475569] mb-0.5">Do</div>
              <div className="text-white">{active.to}</div>
            </div>
            <div className="bg-[#0a0c12] rounded-lg px-3 py-2 border border-[#1e2332]">
              <div className="text-[#475569] mb-0.5">Pasażer</div>
              <div className="text-white">{active.passenger}</div>
            </div>
            {active.fare && (
              <div className="bg-[#0a0c12] rounded-lg px-3 py-2 border border-[#1e2332]">
                <div className="text-[#475569] mb-0.5">Opłata</div>
                <div className="text-white">{active.fare} $</div>
              </div>
            )}
          </div>
          <button onClick={endRide} className="w-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-[#22c55e] rounded-lg py-2 text-xs font-semibold transition-colors">✓ Zakończ kurs</button>
        </div>
      ) : (
        <div className="bg-[#0d0f17] border border-[#1e2332] rounded-xl p-4 flex-shrink-0">
          <SLabel>Nowy kurs</SLabel>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value }))} placeholder="Odbiór…"
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} placeholder="Cel…"
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.passenger} onChange={e => setForm(p => ({ ...p, passenger: e.target.value }))} placeholder="Pasażer (opcja)…"
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
            <input value={form.fare} onChange={e => setForm(p => ({ ...p, fare: e.target.value }))} placeholder="Opłata $" type="number"
              className="bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
          </div>
          <button onClick={startRide} disabled={!form.from || !form.to}
            className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 disabled:opacity-40 border border-yellow-500/30 text-yellow-400 rounded-lg py-2 text-xs font-semibold transition-colors">
            🚗 Rozpocznij kurs
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        <SLabel>Historia kursów ({rides.length})</SLabel>
        {rides.length === 0 && <div className="text-center text-[#475569] text-sm pt-4">Brak zakończonych kursów</div>}
        {rides.map(r => (
          <div key={r.id} className="bg-[#0d0f17] border border-[#1e2332] rounded-xl px-3 py-2.5 text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-[#94a3b8]">{r.from} → {r.to}</span>
              {r.fare && <span className="text-yellow-400 font-mono font-semibold">{r.fare}$</span>}
            </div>
            <div className="text-xs text-[#475569] font-mono">{r.passenger} · {fmtDate(r.startTime)}</div>
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
        <div className="text-[#94a3b8] text-sm">Służby zostały powiadomione. Pozostań na miejscu i czekaj na pomoc.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto w-full">
      <div className="text-center py-2">
        <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🆘</div>
        <h2 className="text-lg font-bold text-white">Zgłoszenie awaryjne 112</h2>
        <p className="text-[#475569] text-xs mt-1">Zgłoś zdarzenie służbom ratunkowym</p>
      </div>
      <div>
        <SLabel>Rodzaj zdarzenia *</SLabel>
        <div className="grid grid-cols-2 gap-2">
          {natures.map(n => (
            <button key={n} onClick={() => setForm(p => ({ ...p, nature: n }))}
              className={`text-xs px-3 py-2.5 rounded-xl border transition-all text-left ${form.nature === n ? 'border-red-500/60 bg-red-500/20 text-red-300' : 'border-[#1e2332] bg-[#0d0f17] text-[#94a3b8] hover:border-red-500/30 hover:text-white'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <SLabel>Dokładna lokalizacja *</SLabel>
        <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Ulica, skrzyżowanie, budynek…"
          className="w-full bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-red-500/50 transition-colors" />
      </div>
      <div>
        <SLabel>Opis sytuacji</SLabel>
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Opisz co się stało…"
          className="w-full bg-[#0a0c12] border border-[#1e2332] rounded-lg px-3 py-2 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-red-500/50 resize-none transition-colors" />
      </div>
      <button onClick={submit} disabled={sending || !form.nature || !form.location}
        className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl py-3 font-bold text-sm transition-colors">
        {sending ? '📡 Wysyłanie…' : '🆘 Wyślij zgłoszenie do służb'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAP PANEL
// ─────────────────────────────────────────────────────────────────────────────

function MapPanel() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#080a0f] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #5865F2 0%, transparent 60%)', backgroundSize: '100% 100%' }} />
      <div className="relative text-center z-10">
        <div className="w-24 h-24 bg-[#0d0f17] border border-[#1e2332] rounded-full flex items-center justify-center text-5xl mx-auto mb-4">🗺️</div>
        <p className="text-[#94a3b8] text-sm font-medium">Mapa Greenville RP</p>
        <p className="text-[#475569] text-xs mt-1">Wgraj mapę w Ustawieniach → CAD → URL mapy</p>
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
      <div className="h-screen bg-[#080a0f] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-[#5865F2]/30 border-t-[#5865F2] rounded-full animate-spin" />
        <p className="text-[#475569] text-sm">Ładowanie CAD…</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#080a0f] text-white flex flex-col overflow-hidden font-sans">

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <header className="h-11 border-b border-[#1e2332] flex items-center px-4 gap-4 flex-shrink-0 bg-[#0a0c12]">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 bg-[#5865F2] rounded-md flex items-center justify-center text-white font-black text-xs">G</div>
          <span className="text-xs font-bold tracking-widest text-white uppercase">CAD</span>
          <span className="text-[#1e2332] text-xs">|</span>
          <span className="text-xs text-[#475569] font-mono">AURORA GRP</span>
        </div>

        {/* Server priority selector (admin+) */}
        {(['OWNER','ADMIN','MOD'].includes(cadRole)) && (
          <div className="flex gap-1 ml-2">
            {(Object.keys(SERVER_PRIO) as ServerPriority[]).map(sp => (
              <button key={sp} onClick={() => setServerPrio(sp)}
                className={`text-xs px-2.5 py-1 rounded-md border font-bold transition-all ${serverPrio === sp ? SERVER_PRIO[sp].bg : 'border-[#1e2332] text-[#475569] hover:text-[#94a3b8] hover:border-[#2a3040]'}`}
                style={serverPrio === sp ? { color: SERVER_PRIO[sp].color } : {}}>
                {SERVER_PRIO[sp].label}
              </button>
            ))}
          </div>
        )}

        {/* Current server priority badge (everyone else) */}
        {!(['OWNER','ADMIN','MOD'].includes(cadRole)) && (
          <span className={`text-xs px-3 py-1 rounded-md border font-bold ${SERVER_PRIO[serverPrio].bg}`} style={{ color: SERVER_PRIO[serverPrio].color }}>
            ⚡ {SERVER_PRIO[serverPrio].label} — {SERVER_PRIO[serverPrio].desc}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Role badge */}
          <span className="text-xs font-bold px-2.5 py-1 rounded-md" style={{ background: roleCfg.color + '20', color: roleCfg.color, border: `1px solid ${roleCfg.color}35` }}>
            {roleCfg.icon} {roleCfg.label}
          </span>
          {/* User name */}
          {cadUser?.robloxName && <span className="text-xs text-[#94a3b8] font-mono">{cadUser.robloxName}</span>}
          {/* Login prompt */}
          {!session && (
            <button onClick={() => signIn('discord')} className="text-xs bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#818cf8] rounded-md px-3 py-1 transition-colors font-medium">
              Zaloguj przez Discord
            </button>
          )}
          {/* Pop-out button — opens CAD in a separate window */}
          <button
            title="Otwórz CAD w osobnym oknie"
            onClick={() => {
              const w = 1440, h = 900;
              const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
              const top  = Math.round(window.screenY + (window.outerHeight - h) / 2);
              window.open('/cad', 'GreenvilleCAD', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`);
            }}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-[#1e2332] text-[#475569] hover:text-[#00c8ff] hover:border-[#00c8ff]/40 hover:bg-[#00c8ff]/5 transition-all"
          >
            ⧉ Okno
          </button>
        </div>
      </header>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="w-52 border-r border-[#1e2332] flex flex-col bg-[#0d0f17] flex-shrink-0 overflow-y-auto">

          {/* Callsign / Status — dla ról ze statusem */}
          {statusOptions.length > 0 && session && (
            <div className="p-3 border-b border-[#1e2332]">
              <SLabel>Callsign</SLabel>
              {callsign && !editCallsign ? (
                <div className="bg-[#0a0c12] border border-[#1e2332] rounded-xl px-3 py-2.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-white tracking-wider">{callsign}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditCallsign(true); setCallsignInput(callsign); }} className="text-xs text-[#475569] hover:text-[#94a3b8] transition-colors">✎</button>
                      <button onClick={goOffDuty} className="text-xs text-red-500/60 hover:text-red-400 transition-colors font-bold">■</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1 mb-2">
                  <input value={callsignInput} onChange={e => setCallsignInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && setCallsignAndGoOnDuty()}
                    placeholder={`np. ${roleCfg.short}-01`}
                    className="flex-1 bg-[#0a0c12] border border-[#1e2332] rounded-lg px-2 py-1.5 text-xs text-white font-mono uppercase placeholder-[#475569] focus:outline-none focus:border-[#5865F2] transition-colors" />
                  <button onClick={setCallsignAndGoOnDuty} className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-[#22c55e] rounded-lg px-2 text-xs font-bold transition-colors">✓</button>
                </div>
              )}

              {callsign && (
                <>
                  <SLabel>Status</SLabel>
                  <div className="space-y-1">
                    {statusOptions.map(s => {
                      const st = UNIT_STATUS[s];
                      const isActive = myStatus === s;
                      return (
                        <button key={s} onClick={() => changeStatus(s)}
                          className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs border transition-all ${isActive ? `${st.bg} border-l-2` : 'border-transparent text-[#475569] hover:text-[#94a3b8] hover:bg-white/[0.03]'}`}
                          style={isActive ? { borderLeftColor: st.color } : {}}>
                          <Dot color={isActive ? st.color : '#475569'} />
                          <span style={isActive ? { color: st.color } : {}}>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Proximity location picker — everyone */}
          <div className="p-3 flex-1">
            <SLabel>Twoja lokacja</SLabel>
            <div className="space-y-0.5">
              {LOCATIONS.map(loc => (
                <button key={loc.id} onClick={() => setProxLocation(loc)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all text-left ${proxLocation.id === loc.id ? 'bg-[#5865F2]/15 border border-[#5865F2]/40 text-white border-l-2 border-l-[#5865F2]' : 'text-[#475569] hover:text-[#94a3b8] hover:bg-white/[0.03] border border-transparent'}`}>
                  <span className="text-sm">{loc.emoji}</span>
                  <span className="truncate">{loc.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#080a0f]">

          {/* Module tabs */}
          {modules.length > 1 && (
            <div className="border-b border-[#1e2332] flex gap-1 px-3 pt-2 flex-shrink-0 bg-[#0a0c12] overflow-x-auto">
              {modules.map(mod => {
                const mc = MODULE_LABEL[mod] ?? { label: mod, icon: '◆' };
                const isActive = activeTab === mod;
                return (
                  <button key={mod} onClick={() => setActiveTab(mod)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${isActive ? 'text-white border-b-[#5865F2] bg-[#5865F2]/10' : 'text-[#475569] border-b-transparent hover:text-[#94a3b8] hover:bg-white/[0.03]'}`}>
                    <span>{mc.icon}</span>{mc.label}
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
            {activeTab === 'map'           && <MapPanel />}
            {activeTab === 'patrol_log'    && <PatrolLogPanel callsign={callsign} role={cadRole} />}
            {activeTab === 'incident'      && <PatrolLogPanel callsign={callsign} role={cadRole} />}
            {activeTab === 'rides'         && <RideLogPanel role={cadRole} />}
            {activeTab === 'emergency_call'&& <EmergencyCallPanel onSent={() => setActiveTab('calls_view')} />}
            {(activeTab === 'medical' || activeTab === 'fire' || activeTab === 'road' || activeTab === 'arrests' || activeTab === 'dispatch') && (
              <div className="h-full flex flex-col">
                <CallsPanel role={cadRole} callsign={callsign} />
              </div>
            )}
          </div>
        </main>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────────────── */}
        <aside className="w-72 border-l border-[#1e2332] flex flex-col bg-[#0d0f17] flex-shrink-0">

          {/* Chat tabs */}
          <div className="border-b border-[#1e2332] flex flex-shrink-0 bg-[#0a0c12]">
            {([
              { id: 'radio' as ChatTabId, label: '📡 Radio', show: getRadioChannels(cadRole).length > 0 },
              { id: 'proximity' as ChatTabId, label: '💬 Prox', show: true },
              { id: 'system' as ChatTabId, label: '⚙️ System', show: ['OWNER','ADMIN','MOD'].includes(cadRole) },
            ].filter(t => t.show)).map(t => (
              <button key={t.id} onClick={() => setChatTab(t.id)}
                className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-all ${chatTab === t.id ? 'text-white border-b-[#5865F2] bg-[#5865F2]/10' : 'text-[#475569] border-b-transparent hover:text-[#94a3b8]'}`}>
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
                <p className="text-[#475569] text-xs">Zaloguj się, aby korzystać z radia</p>
                <button onClick={() => signIn('discord')} className="text-xs bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/40 text-[#818cf8] rounded-lg px-4 py-2 transition-colors">Zaloguj Discord</button>
              </div>
            )}
            {chatTab === 'proximity' && (
              session ? <ProximityChat location={proxLocation} username={cadUser?.robloxName ?? cadUser?.name ?? 'Gracz'} /> :
              <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
                <div className="text-3xl">💬</div>
                <p className="text-[#475569] text-xs">Zaloguj się, aby korzystać z proximity chatu</p>
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
                      <div key={l} className="flex justify-between items-center py-1 border-b border-[#1e2332]">
                        <span className="text-[#475569]">{l}</span>
                        <span className="text-white font-mono">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <SLabel>Szybkie akcje</SLabel>
                  <div className="space-y-1">
                    <button onClick={() => window.location.reload()} className="w-full text-left text-[#475569] hover:text-[#94a3b8] py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors text-xs">↻ Odśwież CAD</button>
                    <button onClick={() => window.open('/cad','GreenvilleCAD','width=1440,height=900,resizable=yes')} className="w-full text-left text-[#475569] hover:text-[#94a3b8] py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors text-xs">⧉ Otwórz w oknie</button>
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
