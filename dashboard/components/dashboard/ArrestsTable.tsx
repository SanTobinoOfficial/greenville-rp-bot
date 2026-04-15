'use client';

import { useState } from 'react';

type Arrest = {
  id: string;
  reason: string;
  active: boolean;
  releasedAt: string | Date | null;
  releasedBy: string | null;
  createdAt: string | Date;
  target:  { discordId: string; discordUsername: string; robloxUsername: string | null };
  officer: { discordId: string; discordUsername: string };
};

interface Props {
  arrests: Arrest[];
  canRelease: boolean;
  page: number;
  totalPages: number;
  q: string;
  active: string;
}

export default function ArrestsTable({ arrests: initial, canRelease, page, totalPages, q, active }: Props) {
  const [arrests, setArrests] = useState<Arrest[]>(initial);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleRelease(id: string) {
    setReleasing(id);
    try {
      const res = await fetch(`/api/arrests/${id}`, { method: 'PUT' });
      if (res.ok) {
        const updated: Arrest = await res.json();
        setArrests(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      }
    } finally {
      setReleasing(null);
      setConfirmId(null);
    }
  }

  function fmt(d: string | Date | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <>
      {confirmId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmId(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-2">✅ Zwolnić zatrzymanego?</h2>
            <p className="text-sm text-muted-foreground mb-4">Zatrzymanie zostanie oznaczone jako zakończone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRelease(confirmId)}
                disabled={!!releasing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {releasing ? 'Zwalnianie...' : 'Zwolnij'}
              </button>
              <button onClick={() => setConfirmId(null)}
                className="flex-1 bg-secondary border border-border px-4 py-2 rounded-md text-sm">
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zatrzymany</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Funkcjonariusz</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Powód</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Czas zatrzymania</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zwolniony</th>
                {canRelease && <th className="text-left px-4 py-3 font-medium text-muted-foreground">Akcja</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {arrests.length === 0 ? (
                <tr>
                  <td colSpan={canRelease ? 7 : 6} className="text-center py-12 text-muted-foreground">
                    Brak wyników
                  </td>
                </tr>
              ) : arrests.map(a => (
                <tr key={a.id} className={`hover:bg-secondary/30 transition-colors ${a.active ? '' : 'opacity-60'}`}>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      a.active
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : 'bg-green-500/20 text-green-300 border-green-500/30'
                    }`}>
                      {a.active ? '🔴 Aktywne' : '✅ Zakończone'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {a.target.discordUsername}
                    {a.target.robloxUsername && (
                      <span className="text-xs text-muted-foreground ml-1">@{a.target.robloxUsername}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.officer.discordUsername}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={a.reason}>{a.reason}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(a.createdAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {a.releasedAt ? `${fmt(a.releasedAt)} (${a.releasedBy ?? '?'})` : '—'}
                  </td>
                  {canRelease && (
                    <td className="px-4 py-3">
                      {a.active && (
                        <button
                          onClick={() => setConfirmId(a.id)}
                          disabled={!!releasing}
                          className="text-xs bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/30 px-3 py-1 rounded-md font-medium disabled:opacity-50"
                        >
                          Zwolnij
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`/dashboard/zatrzymani?q=${q}&active=${active}&page=${p}`}
              className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'}`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </>
  );
}
