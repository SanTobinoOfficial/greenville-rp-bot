'use client';
// Dashboard — /podania-pracy — Podania o pracę (JOB_PUBLIC + JOB_PRIVATE)
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
  Building2,
  Lock,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Application {
  id: string;
  position: string;
  type: 'JOB_PUBLIC' | 'JOB_PRIVATE';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';
  createdAt: string;
  answers: Record<string, string>;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  user: {
    discordUsername: string;
    robloxUsername: string | null;
    image: string | null;
  };
}

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';
type TypeFilter = 'ALL' | 'JOB_PUBLIC' | 'JOB_PRIVATE';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Oczekuje',      color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',  icon: Clock        },
  ACCEPTED:   { label: 'Zaakceptowane', color: 'text-green-400 bg-green-400/10 border-green-400/30',     icon: CheckCircle2 },
  REJECTED:   { label: 'Odrzucone',     color: 'text-red-400 bg-red-400/10 border-red-400/30',           icon: XCircle      },
  INCOMPLETE: { label: 'Do uzupełnienia', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: AlertCircle  },
};

const TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  JOB_PUBLIC:  { label: 'Praca publiczna',  icon: Building2, color: 'text-blue-400 bg-blue-400/10'  },
  JOB_PRIVATE: { label: 'Praca prywatna',   icon: Lock,      color: 'text-purple-400 bg-purple-400/10' },
};

const FIELD_LABELS: Record<string, string> = {
  motivation:  'Motywacja',
  motywacja:   'Motywacja',
  experience:  'Doświadczenie',
  doswiadczenie: 'Doświadczenie',
  age:         'Wiek',
  wiek:        'Wiek',
  playtime:    'Czas gry (godz.)',
  why:         'Dlaczego chcę dołączyć?',
  dlaczego:    'Dlaczego chcę dołączyć?',
  scenario:    'Scenariusz',
  scenario1:   'Scenariusz 1',
  scenario2:   'Scenariusz 2',
  rules:       'Znajomość regulaminu',
  other:       'Dodatkowe informacje',
  inne:        'Dodatkowe informacje',
};

export default function PodaniaPracyPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
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
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      else params.set('type', 'JOB'); // tylko prace

      const res = await fetch(`/api/applications?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApplications(data);
    } catch {
      showToast('Błąd pobierania podań.', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleAction = async (
    id: string,
    action: 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE'
  ) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/review-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, action, note: noteMap[id] ?? '' }),
      });
      if (!res.ok) throw new Error();
      showToast(
        action === 'ACCEPTED' ? '✅ Podanie zaakceptowane!'
        : action === 'REJECTED' ? '❌ Podanie odrzucone.'
        : '⚠️ Wysłano prośbę o uzupełnienie.',
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

  const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'ALL',        label: 'Wszystkie'     },
    { value: 'PENDING',    label: 'Oczekujące'    },
    { value: 'ACCEPTED',   label: 'Przyjęte'      },
    { value: 'REJECTED',   label: 'Odrzucone'     },
    { value: 'INCOMPLETE', label: 'Do uzupełnienia' },
  ];

  const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
    { value: 'ALL',         label: 'Wszystkie typy'   },
    { value: 'JOB_PUBLIC',  label: 'Praca publiczna'  },
    { value: 'JOB_PRIVATE', label: 'Praca prywatna'   },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Podania o pracę</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Aplikacje na stanowiska publiczne i prywatne
          </p>
        </div>
        <button
          onClick={fetchApplications}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Odśwież
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-xs text-muted-foreground font-medium">Typ:</span>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Counter */}
      {!loading && (
        <p className="text-xs text-muted-foreground mb-3">
          Znaleziono <span className="font-semibold text-foreground">{applications.length}</span> podań
        </p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
          Brak podań spełniających kryteria.
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const statusMeta = STATUS_LABELS[app.status];
            const StatusIcon = statusMeta.icon;
            const typeMeta   = TYPE_LABELS[app.type];
            const TypeIcon   = typeMeta.icon;
            const isExpanded = expandedId === app.id;
            const isProcessing = processing === app.id;
            const answers    = app.answers as Record<string, string>;

            return (
              <div
                key={app.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors text-left"
                >
                  {/* Avatar */}
                  {app.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={app.user.image}
                      alt=""
                      className="w-9 h-9 rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold shrink-0">
                      {app.user.discordUsername[0]?.toUpperCase()}
                    </div>
                  )}

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{app.user.discordUsername}</p>
                    {app.user.robloxUsername && (
                      <p className="text-xs text-muted-foreground">{app.user.robloxUsername}</p>
                    )}
                  </div>

                  {/* Position */}
                  <div className="hidden sm:block flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{app.position}</p>
                  </div>

                  {/* Type badge */}
                  <span className={`hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${typeMeta.color} border-current/20`}>
                    <TypeIcon className="w-3 h-3" />
                    {typeMeta.label}
                  </span>

                  {/* Date */}
                  <span className="hidden lg:block text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true, locale: pl })}
                  </span>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${statusMeta.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusMeta.label}
                  </span>

                  {/* Expand icon */}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-5 space-y-5">
                    {/* Meta info */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-secondary/40 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground mb-0.5">Stanowisko</p>
                        <p className="font-semibold text-foreground">{app.position}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground mb-0.5">Typ</p>
                        <p className="font-semibold text-foreground">{typeMeta.label}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground mb-0.5">Data zgłoszenia</p>
                        <p className="font-semibold text-foreground">
                          {format(new Date(app.createdAt), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </p>
                      </div>
                    </div>

                    {/* Answers */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Odpowiedzi</h3>
                      <div className="space-y-3">
                        {Object.entries(answers).map(([key, value]) => (
                          <div key={key} className="bg-secondary/30 rounded-lg px-4 py-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              {FIELD_LABELS[key] ?? key}
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {value || <span className="italic text-muted-foreground">Brak odpowiedzi</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Review note (if already reviewed) */}
                    {app.reviewNote && (
                      <div className="bg-secondary/30 rounded-lg px-4 py-3 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Notatka rekrutera</p>
                        <p className="text-sm text-foreground">{app.reviewNote}</p>
                      </div>
                    )}

                    {/* Actions (only for PENDING) */}
                    {app.status === 'PENDING' && (
                      <div className="border-t border-border pt-4 space-y-3">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1.5">
                            Notatka rekrutera (opcjonalnie — trafi do DM kandydata)
                          </label>
                          <textarea
                            rows={2}
                            value={noteMap[app.id] ?? ''}
                            onChange={(e) =>
                              setNoteMap((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                            placeholder="Np. powód odrzucenia lub oczekiwania na uzupełnienie…"
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAction(app.id, 'ACCEPTED')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-semibold transition-colors disabled:opacity-40"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Akceptuj
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAction(app.id, 'INCOMPLETE')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-semibold transition-colors disabled:opacity-40"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            Uzupełnij
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAction(app.id, 'REJECTED')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-semibold transition-colors disabled:opacity-40"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Odrzuć
                          </button>
                          {isProcessing && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                              <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                              Zapisywanie…
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {app.status !== 'PENDING' && (
                      <div className="border-t border-border pt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <StatusIcon className="w-3.5 h-3.5" />
                        Rozpatrzone
                        {app.reviewedAt && (
                          <span>
                            · {format(new Date(app.reviewedAt), 'dd.MM.yyyy HH:mm', { locale: pl })}
                          </span>
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
