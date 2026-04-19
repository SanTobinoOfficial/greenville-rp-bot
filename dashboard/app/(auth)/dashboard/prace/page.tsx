'use client';
// /dashboard/prace — Przeglądarka wszystkich 76 prac z server-config.json
// Dostęp: Helper+

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Users,
  Clock,
  Star,
  Shield,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';

interface Job {
  id: string;
  name: string;
  emoji: string;
  kategoria: string;
  opis: string;
  wymagania: string[];
  wynagrodzenie_min: number;
  wynagrodzenie_max: number;
  rola_discord: string | null;
  typ: 'SERVICE' | 'PUBLIC' | 'CRIMINAL';
  formularz: { id: string; pytanie: string; min: number }[];
  mini_regulamin: string;
}

const TYP_CONFIGS = {
  SERVICE:  { label: 'Służbowa',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',   icon: Shield },
  PUBLIC:   { label: 'Cywilna',    color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: CheckCircle },
  CRIMINAL: { label: 'Kryminalna', color: 'text-red-400 bg-red-400/10 border-red-400/30',       icon: AlertTriangle },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Policja':         'border-blue-500/40 bg-blue-500/5',
  'EMS':             'border-pink-500/40 bg-pink-500/5',
  'Straż':           'border-orange-500/40 bg-orange-500/5',
  'DOT':             'border-amber-500/40 bg-amber-500/5',
  'Dyspozytornia':   'border-indigo-500/40 bg-indigo-500/5',
  'Policja ✦':       'border-blue-500/40 bg-blue-500/5',
};

export default function PracePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedKategoria, setSelectedKategoria] = useState<string>('');
  const [selectedTyp, setSelectedTyp] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'wynagrodzenie' | 'kategoria'>('kategoria');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/list');
      if (!res.ok) throw new Error();
      const data: Job[] = await res.json();
      setJobs(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const kategorie = Array.from(new Set(jobs.map(j => j.kategoria))).sort();

  const filtered = jobs
    .filter(j => {
      if (search) {
        const q = search.toLowerCase();
        if (!j.name.toLowerCase().includes(q) && !j.kategoria.toLowerCase().includes(q) && !j.opis.toLowerCase().includes(q)) return false;
      }
      if (selectedKategoria && j.kategoria !== selectedKategoria) return false;
      if (selectedTyp && j.typ !== selectedTyp) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'wynagrodzenie') return b.wynagrodzenie_max - a.wynagrodzenie_max;
      return a.kategoria.localeCompare(b.kategoria) || a.name.localeCompare(b.name);
    });

  const stats = {
    total: jobs.length,
    service: jobs.filter(j => j.typ === 'SERVICE').length,
    public: jobs.filter(j => j.typ === 'PUBLIC').length,
    criminal: jobs.filter(j => j.typ === 'CRIMINAL').length,
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-blue-400" />
            Prace RP
          </h1>
          <p className="text-white/50 text-sm mt-1">Baza wszystkich {stats.total} prac dostępnych w Greenville RP</p>
        </div>
        {/* Statystyki */}
        <div className="flex gap-3">
          {[
            { label: 'Wszystkich', value: stats.total, color: 'text-white' },
            { label: 'Służbowych', value: stats.service, color: 'text-blue-400' },
            { label: 'Cywilnych', value: stats.public, color: 'text-green-400' },
            { label: 'Kryminalnych', value: stats.criminal, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-white/40 text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filtry */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-wrap gap-3">
        {/* Szukaj */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj pracy..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Kategoria */}
        <select
          value={selectedKategoria}
          onChange={e => setSelectedKategoria(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="">Wszystkie kategorie</option>
          {kategorie.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        {/* Typ */}
        <select
          value={selectedTyp}
          onChange={e => setSelectedTyp(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="">Wszystkie typy</option>
          <option value="SERVICE">🏛️ Służbowe</option>
          <option value="PUBLIC">✅ Cywilne</option>
          <option value="CRIMINAL">💀 Kryminalne</option>
        </select>

        {/* Sortowanie */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="kategoria">Sortuj: Kategoria</option>
          <option value="name">Sortuj: Nazwa</option>
          <option value="wynagrodzenie">Sortuj: Wynagrodzenie</option>
        </select>

        {(search || selectedKategoria || selectedTyp) && (
          <button
            onClick={() => { setSearch(''); setSelectedKategoria(''); setSelectedTyp(''); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            Wyczyść filtry
          </button>
        )}

        <div className="ml-auto text-white/40 text-sm flex items-center">
          {filtered.length} / {jobs.length} prac
        </div>
      </div>

      {/* Lista prac */}
      {loading ? (
        <div className="text-center text-white/40 py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          Ładowanie prac...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-white/40 py-16">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Brak prac pasujących do filtrów</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(job => {
            const typCfg = TYP_CONFIGS[job.typ] ?? TYP_CONFIGS.PUBLIC;
            const TypIcon = typCfg.icon;
            const isExpanded = expandedId === job.id;
            const catColor = CATEGORY_COLORS[job.kategoria] ?? 'border-white/10 bg-white/[0.02]';

            return (
              <div
                key={job.id}
                className={`border rounded-xl overflow-hidden transition-all ${catColor}`}
              >
                {/* Nagłówek */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  className="w-full p-4 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-2xl shrink-0">{job.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm leading-tight">{job.name}</div>
                        <div className="text-white/40 text-xs mt-0.5">{job.kategoria}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${typCfg.color}`}>
                        <TypIcon className="w-2.5 h-2.5" />
                        {typCfg.label}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </div>
                  </div>

                  {/* Wynagrodzenie */}
                  <div className="flex items-center gap-1 mt-2 text-xs text-white/50">
                    <DollarSign className="w-3.5 h-3.5" />
                    {job.wynagrodzenie_max === 0
                      ? 'Brak wynagrodzenia'
                      : `${job.wynagrodzenie_min}–${job.wynagrodzenie_max}$/h`}
                    {job.rola_discord && (
                      <>
                        <span className="mx-1 text-white/20">•</span>
                        <Users className="w-3.5 h-3.5" />
                        <span>Rola: {job.rola_discord}</span>
                      </>
                    )}
                  </div>
                </button>

                {/* Rozwinięte szczegóły */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
                    {/* Opis */}
                    <p className="text-white/60 text-xs leading-relaxed">{job.opis}</p>

                    {/* Wymagania */}
                    {job.wymagania?.length > 0 && (
                      <div>
                        <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Wymagania</div>
                        <ul className="space-y-0.5">
                          {job.wymagania.map((w, i) => (
                            <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                              <CheckCircle className="w-3 h-3 text-green-400/50 shrink-0 mt-0.5" />
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Mini regulamin */}
                    {job.mini_regulamin && (
                      <div>
                        <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Mini-regulamin</div>
                        <div className="bg-black/20 rounded-lg p-2 text-xs text-white/40 leading-relaxed whitespace-pre-line max-h-24 overflow-y-auto">
                          {job.mini_regulamin}
                        </div>
                      </div>
                    )}

                    {/* Formularz */}
                    {job.formularz?.length > 0 && (
                      <div>
                        <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
                          Formularz ({job.formularz.length} pytań)
                        </div>
                        <div className="space-y-1">
                          {job.formularz.map((f, i) => (
                            <div key={f.id} className="flex items-start gap-1.5 text-xs text-white/40">
                              <Clock className="w-3 h-3 shrink-0 mt-0.5 text-blue-400/50" />
                              <span>{i + 1}. {f.pytanie} <span className="text-white/20">(min. {f.min} znaków)</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Badge ID */}
                    <div className="flex items-center gap-2 pt-1">
                      <code className="text-[10px] text-white/20 bg-black/20 rounded px-2 py-0.5">{job.id}</code>
                      {job.typ === 'SERVICE' && (
                        <span className="text-[10px] text-blue-400/60 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Wymaga podania do Staffu
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
