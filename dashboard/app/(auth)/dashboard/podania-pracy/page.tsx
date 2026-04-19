'use client';
// /dashboard/podania-pracy — Podania o pracę (JobApplication model) — nowy system v4.0
// Dostęp: Helper+

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Shield,
  Search,
  X,
  MessageSquare,
  Calendar,
  Bot,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface JobApplication {
  id: string;
  jobName: string;
  jobCategory: string;
  jobType: 'SERVICE' | 'PUBLIC' | 'CRIMINAL';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';
  answers: Record<string, string>;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  appliedAt: string;
  cooldownEnd: string | null;
  user: {
    id: string;
    discordId: string;
    discordUsername: string | null;
    robloxUsername: string | null;
    currentJob: string | null;
  };
}

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';
type TypeFilter = 'ALL' | 'SERVICE' | 'PUBLIC' | 'CRIMINAL';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Oczekuje',       color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',  icon: Clock        },
  ACCEPTED:   { label: 'Zaakceptowane', color: 'text-green-400 bg-green-400/10 border-green-400/30',     icon: CheckCircle2 },
  REJECTED:   { label: 'Odrzucone',     color: 'text-red-400 bg-red-400/10 border-red-400/30',           icon: XCircle      },
  INCOMPLETE: { label: 'Uzupełnienie',  color: 'text-orange-400 bg-orange-400/10 border-orange-400/30',  icon: AlertCircle  },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  SERVICE:  { label: 'Służbowa',   color: 'text-blue-400 bg-blue-400/10'   },
  PUBLIC:   { label: 'Cywilna',    color: 'text-green-400 bg-green-400/10' },
  CRIMINAL: { label: 'Kryminalna', color: 'text-red-400 bg-red-400/10'     },
};

export default function PodaniaPracyPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('SERVICE');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (typeFilter !== 'ALL') params.set('jobType', typeFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/job-applications?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApplications(data.applications ?? []);
      setTotal(data.total ?? 0);
    } catch {
      showToast('Błąd pobierania podań.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleAction = async (
    id: string,
    action: 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE'
  ) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, action, note: noteMap[id] ?? '' }),
      });
      if (!res.ok) throw new Error();
      showToast(
        action === 'ACCEPTED' ? '✅ Podanie zaakceptowane! Praca przypisana do gracza.'
        : action === 'REJECTED' ? '❌ Podanie odrzucone. Gracz otrzymał DM.'
        : '📝 Wysłano prośbę o uzupełnienie.',
        action === 'ACCEPTED' ? 'success' : 'error'
      );
      await fetchApplications();
      setExpandedId(null);
    } catch {
      showToast('Błąd aktualizacji statusu.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = applications.filter(a => a.status === 'PENDING').length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border transition-all ${
          toast.type === 'success'
            ? 'bg-green-900/80 border-green-500/40 text-green-200'
            : 'bg-red-900/80 border-red-500/40 text-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Briefcase className="w-7 h-7 text-blue-400" />
            Podania o Pracę
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Rozpatruj podania graczy o pracę służbową
            {pendingCount > 0 && (
              <span className="ml-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs px-2 py-0.5 rounded-full">
                {pendingCount} oczekujących
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchApplications}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white/70 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {/* Filtry */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        {/* Szukaj */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj po gracz / praca..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status */}
        <div className="flex gap-1">
          {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED', 'INCOMPLETE'] as StatusFilter[]).map(s => {
            const cfg = s === 'ALL' ? null : STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  statusFilter === s
                    ? (cfg ? cfg.color : 'bg-white/20 border-white/30 text-white')
                    : 'bg-transparent border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {s === 'ALL' ? 'Wszystkie' : cfg?.label}
              </button>
            );
          })}
        </div>

        {/* Typ */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as TypeFilter)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        >
          <option value="ALL">Wszystkie typy</option>
          <option value="SERVICE">🏛️ Służbowe</option>
          <option value="PUBLIC">✅ Cywilne</option>
          <option value="CRIMINAL">💀 Kryminalne</option>
        </select>

        <span className="text-white/30 text-sm">{total} wyników</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center text-white/40 py-16">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          Ładowanie podań...
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center text-white/30 py-16">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Brak podań pasujących do filtrów</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => {
            const statusCfg = STATUS_CONFIG[app.status];
            const StatusIcon = statusCfg?.icon ?? Clock;
            const typeCfg = TYPE_CONFIG[app.jobType] ?? TYPE_CONFIG.PUBLIC;
            const isExpanded = expandedId === app.id;
            const isProcessing = processing === app.id;
            const answersEntries = Object.entries(app.answers ?? {}).filter(([, v]) => v);

            return (
              <div
                key={app.id}
                className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden"
              >
                {/* Nagłówek */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  className="w-full p-4 text-left hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Avatar — Discord CDN */}
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-white/50">
                        {(app.user.discordUsername ?? '?')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white text-sm">
                          {app.user.discordUsername ?? app.user.discordId}
                          {app.user.robloxUsername && (
                            <span className="text-white/40 font-normal text-xs ml-2">@{app.user.robloxUsername}</span>
                          )}
                        </div>
                        <div className="text-white/50 text-xs">
                          💼 <strong>{app.jobName}</strong> · {app.jobCategory}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg?.color ?? ''}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {statusCfg?.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                          {answersEntries.length > 0 && (
                            <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5" />
                              {answersEntries.length} odpowiedzi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true, locale: pl })}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                    </div>
                  </div>
                </button>

                {/* Rozwinięte */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-4 space-y-4">
                    {/* Odpowiedzi */}
                    {answersEntries.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          Odpowiedzi z formularza ({answersEntries.length})
                        </h4>
                        {answersEntries.map(([key, val]) => (
                          <div key={key} className="bg-black/20 rounded-lg p-3">
                            <div className="text-[10px] text-white/30 uppercase tracking-wide mb-1">{key}</div>
                            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{val}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Info o graczu */}
                    <div className="bg-white/[0.02] rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-white/30">Discord: </span>
                        <span className="text-white/70">{app.user.discordUsername ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-white/30">Roblox: </span>
                        <span className="text-white/70">{app.user.robloxUsername ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-white/30">Aktualna praca: </span>
                        <span className="text-white/70">{app.user.currentJob ?? 'Brak'}</span>
                      </div>
                      <div>
                        <span className="text-white/30">ID podania: </span>
                        <code className="text-white/40 text-[10px]">{app.id.slice(0, 12)}...</code>
                      </div>
                    </div>

                    {/* Notatka Staff */}
                    {app.reviewNote && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="text-[10px] text-blue-400/60 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Notatka Staff ({app.reviewedBy})
                        </div>
                        <p className="text-sm text-blue-300/70">{app.reviewNote}</p>
                      </div>
                    )}

                    {/* Akcje */}
                    {app.status === 'PENDING' && (
                      <div className="space-y-3">
                        <textarea
                          value={noteMap[app.id] ?? ''}
                          onChange={e => setNoteMap(prev => ({ ...prev, [app.id]: e.target.value }))}
                          placeholder="Notatka do gracza (opcjonalna — zostanie wysłana do gracza przez dashboard)"
                          rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(app.id, 'ACCEPTED')}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {isProcessing ? 'Przetwarzam...' : 'Zatwierdź'}
                          </button>
                          <button
                            onClick={() => handleAction(app.id, 'INCOMPLETE')}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <AlertCircle className="w-4 h-4" />
                            Uzupełnienie
                          </button>
                          <button
                            onClick={() => handleAction(app.id, 'REJECTED')}
                            disabled={isProcessing}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Odrzuć
                          </button>
                        </div>
                        <p className="text-[10px] text-white/20 text-center flex items-center justify-center gap-1">
                          <Bot className="w-3 h-3" />
                          Po zatwierdzeniu praca zostanie automatycznie przypisana do gracza w bazie
                        </p>
                      </div>
                    )}

                    {app.status !== 'PENDING' && (
                      <div className="text-xs text-white/30 flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" />
                        Rozpatrzył: <strong>{app.reviewedBy ?? '—'}</strong>
                        {app.reviewedAt && (
                          <span>· {format(new Date(app.reviewedAt), 'dd.MM.yyyy HH:mm')}</span>
                        )}
                      </div>
                    )}
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
