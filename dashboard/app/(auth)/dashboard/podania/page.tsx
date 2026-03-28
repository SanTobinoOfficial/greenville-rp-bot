'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Filter,
} from 'lucide-react';

interface Application {
  id: string;
  position: string;
  type: 'SERVICE' | 'JOB_PUBLIC' | 'JOB_PRIVATE';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';
  createdAt: string;
  user: {
    discordUsername: string;
    robloxUsername: string | null;
    image: string | null;
  };
}

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE';

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Oczekuje',    color: 'text-yellow-400 bg-yellow-400/10',  icon: Clock        },
  ACCEPTED:   { label: 'Zaakceptowane', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  REJECTED:   { label: 'Odrzucone',   color: 'text-red-400 bg-red-400/10',       icon: XCircle      },
  INCOMPLETE: { label: 'Uzupełnij',   color: 'text-orange-400 bg-orange-400/10', icon: AlertCircle  },
};

const TYPE_LABELS: Record<string, string> = {
  SERVICE:     'Służba',
  JOB_PUBLIC:  'Praca publiczna',
  JOB_PRIVATE: 'Praca prywatna',
};

export default function PodaniaPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('PENDING');
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await fetch(`/api/applications${q}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApplications(data);
    } catch {
      showToast('Błąd pobierania podań.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (
    id: string,
    action: 'ACCEPTED' | 'REJECTED' | 'INCOMPLETE'
  ) => {
    setProcessing(id);
    try {
      const res = await fetch('/api/review-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: id, status: action }),
      });
      if (!res.ok) throw new Error();
      showToast('Status zaktualizowany.', 'success');
      fetchApplications();
    } catch {
      showToast('Błąd aktualizacji statusu.', 'error');
    } finally {
      setProcessing(null);
    }
  };

  const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'ALL',        label: 'Wszystkie' },
    { value: 'PENDING',    label: 'Oczekujące' },
    { value: 'ACCEPTED',   label: 'Zaakceptowane' },
    { value: 'REJECTED',   label: 'Odrzucone' },
    { value: 'INCOMPLETE', label: 'Do uzupełnienia' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Podania</h1>
          <p className="text-muted-foreground text-sm">
            Zarządzaj aplikacjami na serwer
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
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-sm">
            Brak podań w tej kategorii.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Użytkownik
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Pozycja
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Typ
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applications.map((app) => {
                  const statusMeta = STATUS_LABELS[app.status];
                  const StatusIcon = statusMeta.icon;
                  const isProcessing = processing === app.id;

                  return (
                    <tr
                      key={app.id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {app.user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={app.user.image}
                              alt=""
                              className="w-7 h-7 rounded-full"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                              {app.user.discordUsername[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{app.user.discordUsername}</p>
                            {app.user.robloxUsername && (
                              <p className="text-xs text-muted-foreground">
                                {app.user.robloxUsername}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{app.position}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {TYPE_LABELS[app.type] ?? app.type}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(app.createdAt), {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${statusMeta.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {app.status === 'PENDING' && (
                            <>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleAction(app.id, 'ACCEPTED')}
                                className="px-2.5 py-1.5 rounded-md bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                Akceptuj
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleAction(app.id, 'INCOMPLETE')}
                                className="px-2.5 py-1.5 rounded-md bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                Uzupełnij
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleAction(app.id, 'REJECTED')}
                                className="px-2.5 py-1.5 rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                Odrzuć
                              </button>
                            </>
                          )}
                          {app.status !== 'PENDING' && (
                            <span className="text-xs text-muted-foreground italic">
                              Rozpatrzone
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
